import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { nowTs, useApp, type Route } from '../../store'
import { useDevice } from '../../../sim/store'
import { BackChevron, GlassButton, GlassGroup, GlassGroupItem } from '../../nav/NavBar'
import { Icon } from '../../../icons/Icon'
import { SKBanner } from '../../../slackkit/SKBanner'
import { SKCheckbox } from '../../../slackkit/SKCheckbox'
import { useKeyboard } from '../../keyboard/Keyboard'
import { confirm, openMenu } from '../../sheets'
import { copyText } from '../../sheets/shared'
import { AutocompleteCard, rowHeight } from '../../composer/Autocomplete'
import { search, type AcRow } from '../../composer/suggestions'
import '../../composer/LinkAlert'
import type { CanvasDoc } from '../../../data/types'
import { plainText, type InlineCtx } from '../../../data/canvas/model'
import { CanvasEditor, NO_FORMATS, type AcTrigger, type EditorHost } from './editor'
import { CanvasToolbar, type ToolbarAction } from './CanvasToolbar'
import { FileEmbed, MessageEmbed } from './embeds'
import { bodyPlaceholder, sheetKeyOf, TITLE_PLACEHOLDER, useCanvasEditing, whenSheetCloses } from './state'
import './canvas.css'

// A canvas (CanvasRoute; spec canvas-lists-creation.md §1, search-slackbot-huddles.md §4.4). Slack draws the document
// with the Quip SDK's docViewController, which isn't in the iOS repo; here it's the Quip markup the web kit uses
// (src/data/canvas/model.ts) in a contenteditable article, edited by the web kit's editor ported to the iOS toolbar
// (./editor.ts). Tapping the text starts editing where you tapped and raises the keyboard with the editing toolbar on
// it (CanvasToolbarView.swift); the nav bar then shows Undo · Redo and Done (CanvasPresenter.swift:690-738;
// CanvasHeaderComponent.swift:71-98 at 14b3cbaf). Edits save into the store as you type (updateCanvas), so reopening the
// canvas shows them. Canvases you can't edit
// (`access: 'view' | 'comment'`) read only, with the View only / Comment only banner (CanvasPresenter.swift:523-543).
//
//   push({ screen: 'canvas', canvasId })    or { fileId } / { id }; `edit: true` opens it with the keyboard up,
//                                            `isNew: true` as a just-created canvas (its skeleton, the caret in the title)

/** How long the loading skeleton shows before the document (the SDK's load, simulated) */
const LOAD_MS = 450

export function CanvasScreen({ route }: { route: Route }) {
  const id = String(route.canvasId ?? route.fileId ?? route.id ?? '')
  const isNew = !!route.isNew
  const doc = useApp((s) => s.fx.canvases?.[id])
  const me = useApp((s) => s.fx.me)
  const pop = useApp((s) => s.pop)
  const showToast = useApp((s) => s.showToast)
  const kbVisible = useKeyboard((s) => s.visible)
  const formats = useCanvasEditing((s) => s.formats)
  const savedForLater = useCanvasEditing((s) => !!s.saved[id])
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [bannerHidden, setBannerHidden] = useState(false)
  const [editing, setEditing] = useState(false)
  const [picker, setPicker] = useState(false)
  const editorRef = useRef<CanvasEditor | null>(null)
  /** a sheet the toolbar opened has the focus: editing goes on (CanvasHeaderComponent.persistEditMode) */
  const persist = useRef(false)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), LOAD_MS)
    return () => clearTimeout(t)
  }, [])
  // leaving the screen ends editing and closes the format picker
  useEffect(
    () => () => {
      const key = sheetKeyOf('canvas-format')
      if (key) useApp.getState().dismissSheet(key)
      if (useCanvasEditing.getState().editor === editorRef.current) useCanvasEditing.setState({ editor: null, formats: NO_FORMATS })
    },
    [],
  )

  const access = doc?.access ?? 'edit'
  const canEdit = !!doc && access === 'edit'

  const stopEditing = useCallback(() => {
    persist.current = false
    const key = sheetKeyOf('canvas-format')
    if (key) useApp.getState().dismissSheet(key)
    setPicker(false)
    editorRef.current?.flush()
    const el = document.activeElement as HTMLElement | null
    if (el?.closest('.cv-article')) el.blur()
    setEditing(false)
  }, [])

  // ---- what the toolbar opens --------------------------------------------------------------------------

  /** a sheet takes the keyboard; the caret comes back where it was when it closes */
  const withSheet = (type: string, props: Record<string, unknown>, after?: (caret: ReturnType<CanvasEditor['caret']>) => void) => {
    const ed = editorRef.current
    if (!ed) return
    const caret = ed.caret()
    persist.current = true
    ;(document.activeElement as HTMLElement | null)?.blur()
    useApp.getState().presentSheet(type, props)
    whenSheetCloses(sheetKeyOf(type), () => {
      persist.current = false
      setTimeout(() => (after ? after(caret) : caret && ed.place(caret)), 0)
    })
  }

  const openLink = () => {
    const ed = editorRef.current
    const target = ed?.linkTarget()
    if (!ed || !target) return
    persist.current = true
    // the composer's link editor (WysiwygLinkEditing): Add Link / Edit Link (src/app/composer/LinkAlert.tsx)
    useApp.getState().presentSheet('composer-link', {
      label: target.label,
      url: target.url,
      isEdit: target.isEdit,
      onDone: (r: { label: string; url: string } | 'remove' | null) => {
        persist.current = false
        if (r === 'remove') ed.setLink(target.range, '', null)
        else if (r) ed.setLink(target.range, r.label, r.url)
        else {
          const range = target.range.cloneRange()
          range.collapse(false)
          ed.place(ed.caret() ?? { id: ed.titleId, offset: 0 })
          const sel = window.getSelection()
          sel?.removeAllRanges()
          sel?.addRange(range)
        }
      },
    })
  }

  const openFormat = () => {
    // On iPhone, Aa hides the keyboard and its toolbar and presents the format picker (CanvasInteractor.swift:309-316)
    persist.current = true
    setPicker(true)
    useKeyboard.getState().setVisible(false)
    useApp.getState().presentSheet('canvas-format', { onLink: openLink })
    whenSheetCloses(sheetKeyOf('canvas-format'), () => {
      setPicker(false)
      persist.current = false
      if (editorRef.current?.focused()) useKeyboard.getState().setVisible(true)
    })
  }

  const onToolbar = (a: ToolbarAction) => {
    const ed = editorRef.current
    if (!ed) return
    switch (a) {
      case 'plusMenu':
        return withSheet('canvas-plus', {
          onDivider: () => {
            const caret = ed.caret()
            if (caret) ed.place(caret)
            ed.insertDivider()
          },
        })
      case 'formatting':
        return openFormat()
      case 'checklist':
        return ed.applySection('checklist')
      case 'emoji': {
        let picked: string | null = null
        return withSheet('emoji-picker', { onPick: (name: string) => (picked = name) }, (caret) => {
          if (picked) ed.insertEmoji(picked, caret)
          else if (caret) ed.place(caret)
        })
      }
      case 'back':
        return ed.collapseSelection()
      default:
        // comments and reactions on canvas sections aren't in the prototype
        return showToast('Not in the prototype')
    }
  }

  // ---- the header's menu ------------------------------------------------------------------------------

  const overflow = () => {
    if (!doc) return
    const fx = useApp.getState().fx
    const title = doc.title || 'Untitled'
    // SingleFileMenuService.actionMenuPresentationObject (SingleFileMenuService.swift:124-183 at 14b3cbaf), the canvas
    // header's menu (CanvasFeature.swift:291-318): no title for a canvas (its name could hold custom emoji, :185-192);
    // Save for Later / Remove from Later, Share in Slack, Copy Link, Delete. ["Show outline", to-dos, Manage Access are
    // behind flags that are off.]
    openMenu({
      anchor: document.querySelector('.ios-screen .canvas__navbar [aria-label="Show more options"]'),
      sections: [
        {
          items: [
            savedForLater
              ? {
                  title: 'Remove from Later', // remove_from_later (yaml:16219), svgBookmarkFilled (:300-305)
                  icon: 'bookmark_filled',
                  onSelect: () => {
                    useCanvasEditing.setState((s) => ({ saved: { ...s.saved, [id]: false } }))
                    showToast('File removed from Later', 'check_filled') // file_removed_from_later (yaml:7011; FileActionHandler.swift:109, 347-358)
                  },
                }
              : {
                  title: 'Save for Later', // save_for_later_menu (yaml:16886), the icon font's .bookmark (:306-311)
                  icon: 'bookmark',
                  onSelect: () => {
                    useCanvasEditing.setState((s) => ({ saved: { ...s.saved, [id]: true } }))
                    showToast('File saved for Later', 'check_filled') // file_saved_for_later (yaml:7017; FileActionHandler.swift:334-345)
                  },
                },
            // shareInSlack (yaml:18511), the icon font's .forward → svgShareMessage (SKIconManifest+SVGMapping.swift:100) (:147-153)
            { title: 'Share in Slack', icon: 'share_message', onSelect: () => showToast('Not in the prototype') },
            {
              title: 'Copy Link', // copy_link (yaml:4753) (:155-157)
              icon: 'link',
              onSelect: () => {
                copyText(`https://${fx.workspace.domain}.slack.com/docs/${fx.workspace.id}/${id}`)
                showToast('Link copied', 'toast_checkmark') // copied_link (yaml:4677; CopyPasteHandler.swift:255-262, 403-408)
              },
            },
            // a workspace owner or admin, the canvas's owner, or whoever created it (SingleFileMenuService.swift:168-180, 194-211)
            ...(doc.creatorId === me || !!fx.users[me]?.role
              ? [
                  {
                    title: 'Delete', // delete (yaml:5283)
                    icon: 'trash',
                    destructive: true,
                    onSelect: async () => {
                      // file_deletion_prompt (yaml:6960), yes_delete_file (yaml:24174) (FileActionHandler.swift:264-282); the canvas
                      // pops (CanvasFeature.swift:669-681)
                      const ok = await confirm({ message: `Are you sure you want to delete '${title}'?`, confirm: 'Yes, Delete File', destructive: true })
                      if (!ok) return
                      stopEditing()
                      pop()
                      useApp.getState().deleteCanvas(id)
                    },
                  },
                ]
              : []),
          ],
        },
      ],
    })
  }

  // ---- banner ----------------------------------------------------------------------------------------

  // floatingBannerCopy (CanvasPresenter.swift:523-543)
  const bannerText = !doc ? null : doc.isTemplate ? (canEdit ? "You're editing a template." : "You're viewing a template.") : access === 'view' ? 'View only' : access === 'comment' ? 'Comment only' : null
  const template = !!doc?.isTemplate
  const showToolbar = editing && canEdit && kbVisible && !picker && !loading
  const title = doc?.title || 'Untitled'
  // the bar's Undo / Redo (read on each render: every edit and caret move updates `formats`)
  const canUndo = editing && !!editorRef.current?.canUndo()
  const canRedo = editing && !!editorRef.current?.canRedo()

  return (
    <div className={['ios-pushed-screen', 'canvas', editing && 'is-editing'].filter(Boolean).join(' ')} data-screen="canvas">
      {!doc && isNew && loading ? (
        // a canvas being created: its skeleton until it exists
        <LoadingSkeleton isNew />
      ) : !doc ? (
        <NoAccess />
      ) : loading ? (
        <LoadingSkeleton isNew={isNew} />
      ) : (
        <CanvasBody
          doc={doc}
          canEdit={canEdit}
          editing={editing}
          autoEdit={!!(route.edit || isNew)}
          persist={persist}
          onEditor={(ed) => (editorRef.current = ed)}
          onEditing={setEditing}
          onScrolled={setScrolled}
          toolbarUp={showToolbar}
        />
      )}
      {doc && bannerText && !bannerHidden && !loading && (
        <div className="canvas__banner">
          {/* SKBanner .regular, .smallBody, a ✕, no ornament; templates indigo._50 with contentInversePrimary text,
              otherwise .genericLight (CanvasPresenter.swift:285-327) */}
          <SKBanner
            type="regular"
            tone={template ? 'custom' : 'genericLight'}
            customTone={template ? { backgroundColor: 'var(--dt_color_palettes_indigo_50)', textColor: 'var(--dt_color_content_inverse_primary)', ornamentColor: 'transparent' } : undefined}
            ornament="hidden"
            text={<span className="canvas__banner-text">{bannerText}</span>}
            accessories={[{ delete: { color: template ? 'var(--dt_color_content_inverse_primary)' : 'var(--dt_color_content_primary)', onClick: () => setBannerHidden(true) } }]}
          />
        </div>
      )}
      {showToolbar && <CanvasToolbar formats={formats} onAction={onToolbar} />}
      <div className={['ios-navbar', 'canvas__navbar', scrolled && 'is-scrolled'].filter(Boolean).join(' ')}>
        <div className="ios-navbar__edge" />
        <div className="ios-navbar__bar">
          <div className="ios-navbar__leading">
            <GlassButton
              label="Back"
              onClick={() => {
                stopEditing()
                pop()
              }}
              className="glass-button--back"
            >
              <BackChevron />
            </GlassButton>
            {editing && canEdit && (
              // editing: a fixed space, then Undo · Redo (svgUndo / svgRedo, undo yaml:22519, redo yaml:15987) sharing a
              // capsule apart from the back button's, each enabled when there's something to undo / redo
              // (CanvasPresenter.swift:202-215, 690-738; HeaderHelperService.swift:405-406)
              <span className="canvas__history-wrap" onPointerDown={keepFocus} onMouseDown={keepFocus}>
                <GlassGroup className="canvas__history">
                  <GlassGroupItem label="Undo" onClick={canUndo ? () => editorRef.current?.undo() : undefined} className={canUndo ? undefined : 'is-disabled'}>
                    <Icon name="undo" size={20} />
                  </GlassGroupItem>
                  <GlassGroupItem label="Redo" onClick={canRedo ? () => editorRef.current?.redo() : undefined} className={canRedo ? undefined : 'is-disabled'}>
                    <Icon name="redo" size={20} />
                  </GlassGroupItem>
                </GlassGroup>
              </span>
            )}
          </div>
          {/* HeaderTitleView as the nav item's title view on iOS 26: leading, nudged 6 pt off the back button by the view
              itself (HeaderHelperService.swift:261-266; HeaderTitleView.swift:405-409); a new canvas reads "Untitled"
              (untitled, yaml:22693), centered, until it loads (CanvasPresenter.swift:80-88) */}
          <div className={`canvas__title${isNew && loading ? ' is-centered' : ''}`} role="heading" aria-level={1}>
            {doc ? title : ''}
          </div>
          {doc && (
            <div className="ios-navbar__trailing">
              {editing && canEdit ? (
                <>
                  {/* rightButtons […, Done], leading to trailing: Done is outermost (CanvasPresenter.swift:720-737;
                      HeaderBarButtonPresentable.swift:196-197) */}
                  <GlassButton label="Show more options" onClick={overflow} className="canvas__more">
                    <Icon name="ellipsis_horizontal_filled" size={20} />
                  </GlassButton>
                  {/* .done with glass styling on iOS 26: the SF Symbol "checkmark", style .prominent — the circle filled
                      with the bar's tint, highlight1.content (SKBarButtonItem.swift:375-394, 420-422; SLAppearance.swift:37);
                      a11y "Done" (done, yaml:5777) */}
                  <button type="button" className="glass-button glass canvas__done" aria-label="Done" onClick={stopEditing} data-qa="canvas_done" data-tap>
                    <CheckmarkGlyph />
                  </button>
                </>
              ) : (
                // the overflow alone: no share button, the trailing state is hidden unless the canvas is a skill
                // (CanvasHeaderComponent.swift:52-69; CanvasInteractorInputPublishersFactory.swift:117-128); the Slackbot
                // button is behind slackbotInCanvas (off, :177-199)
                <GlassButton label="Show more options" onClick={overflow}>
                  <Icon name="ellipsis_horizontal_filled" size={20} />
                </GlassButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Bar taps while editing keep the caret (the keyboard stays up). */
const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

/** SF Symbols "checkmark", as UIKit draws the prominent Done item's symbol (white on the tint). */
const CheckmarkGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <path d="M3.4 9.6 7.2 13.4 14.6 4.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// ------------------------------------------------------------------------------------------------ the document

interface Portal {
  key: string
  el: HTMLElement
  kind: 'message' | 'file' | 'checkbox'
  conversationId?: string
  ts?: string
  fileId?: string
  itemId?: string
  checked?: boolean
}

interface Ac {
  t: AcTrigger
  rows: AcRow[]
  hi: number
}

let renderSeq = 0

const inlineCtx = (): InlineCtx => {
  const s = useApp.getState()
  return { users: s.fx.users, conversations: s.fx.conversations, me: s.fx.me, domain: s.fx.workspace.domain }
}

const isEmptyContent = (c: Element) => !plainText(c).trim() && !c.querySelector('control, img')

const alpha = (n: number): string => (n <= 0 ? '' : alpha(Math.floor((n - 1) / 26)) + String.fromCharCode(97 + ((n - 1) % 26)))
const roman = (n: number): string => {
  const R: [number, string][] = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]
  let out = ''
  for (const [v, sym] of R)
    while (n >= v) {
      out += sym
      n -= v
    }
  return out
}

/**
 * List markers by level: "•" "◦" "▪" (BulletedListPrefixGenerator.swift:11-25) and "1." "a." "i." counted per level,
 * restarting under a shallower item (OrderedListPrefixGenerator.swift:11-25), as data-marker on each item's marker.
 */
function numberMarkers(article: HTMLElement) {
  article.querySelectorAll<HTMLElement>(':scope > .section[data-section-type="1"]').forEach((sec) => {
    const style = sec.dataset.sectionStyle
    if (style === '7') return
    const counters: number[] = []
    sec.querySelectorAll<HTMLElement>(':scope > .content > .list-section-container > ul > li').forEach((li) => {
      const level = Number(li.dataset.indent ?? 0)
      counters.length = level + 1
      const n = (counters[level] = (counters[level] ?? 0) + 1)
      const marker = li.querySelector<HTMLElement>(':scope > editor-ui.list-item-marker-container')
      if (!marker) return
      const label = style === '5' ? ['•', '◦', '▪'][level % 3] : `${level % 3 === 0 ? n : level % 3 === 1 ? alpha(n) : roman(n)}.`
      if (marker.dataset.marker !== label) marker.dataset.marker = label
    })
  })
}

interface BodyProps {
  doc: CanvasDoc
  canEdit: boolean
  editing: boolean
  /** start editing as soon as it's shown (new canvases, `edit: true`) */
  autoEdit: boolean
  persist: React.MutableRefObject<boolean>
  onEditor: (ed: CanvasEditor | null) => void
  onEditing: (on: boolean) => void
  onScrolled: (on: boolean) => void
  /** the toolbar is over the keyboard (the caret must stay above both) */
  toolbarUp: boolean
}

function CanvasBody({ doc, canEdit, editing, autoEdit, persist, onEditor, onEditing, onScrolled, toolbarUp }: BodyProps) {
  const docId = doc.id
  const scrollRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  const editorRef = useRef<CanvasEditor | null>(null)
  const [portals, setPortals] = useState<Portal[]>([])
  const [ac, setAc] = useState<Ac | null>(null)
  const acRef = useRef(ac)
  acRef.current = ac
  const editingRef = useRef(editing)
  editingRef.current = editing
  const canEditRef = useRef(canEdit)
  canEditRef.current = canEdit
  const toolbarRef = useRef(toolbarUp)
  toolbarRef.current = toolbarUp
  const pickRef = useRef<(row: AcRow | undefined) => void>(() => {})

  /** the caret stays between the nav bar and the toolbar on the keyboard (UITextView scrolls to it) */
  const keepCaretVisible = useCallback(() => {
    const ed = editorRef.current
    const scroller = scrollRef.current
    const r = ed?.range()
    if (!ed || !scroller || !r || !ed.focused()) return
    const rects = r.getClientRects()
    const rect = rects.length ? rects[rects.length - 1] : (r.startContainer instanceof Element ? r.startContainer : r.startContainer.parentElement)?.getBoundingClientRect()
    if (!rect) return
    const screen = scroller.closest('.ios-screen') as HTMLElement | null
    const box = scroller.getBoundingClientRect()
    const k = screen ? screen.getBoundingClientRect().width / screen.offsetWidth || 1 : 1
    const top = (rect.top - box.top) / k
    const bottom = (rect.bottom - box.top) / k
    const style = getComputedStyle(scroller)
    const kb = parseFloat(getComputedStyle(scroller.closest('.ios-app') ?? scroller).getPropertyValue('--kb-height')) || 0
    const safeTop = parseFloat(style.getPropertyValue('--safe-top')) || 0
    const visibleTop = safeTop + 44 + 8
    const visibleBottom = scroller.clientHeight - kb - (toolbarRef.current ? 60 : 0) - 12
    if (bottom > visibleBottom) scroller.scrollTop += bottom - visibleBottom
    else if (top < visibleTop) scroller.scrollTop -= visibleTop - top
  }, [])

  /** the title and body placeholders (canvas_placeholder_title; the per-canvas body line, CanvasSessionLoader.swift:224-243) */
  const placeholders = useCallback(() => {
    const article = articleRef.current
    if (!article) return
    const title = article.querySelector<HTMLElement>('.section[data-section-style="48"] > .content')
    if (title) {
      if (isEmptyContent(title)) title.dataset.placeholder = TITLE_PLACEHOLDER
      else delete title.dataset.placeholder
    }
    const sections = article.querySelectorAll<HTMLElement>(':scope > .section:not([data-section-style="48"])')
    article.querySelectorAll<HTMLElement>(':scope > .section:not([data-section-style="48"]) > .content[data-placeholder]').forEach((c) => delete c.dataset.placeholder)
    const first = sections[0]
    const content = first?.querySelector<HTMLElement>(':scope > .content')
    if (sections.length === 1 && first.dataset.sectionStyle === '0' && content && isEmptyContent(content)) content.dataset.placeholder = bodyPlaceholder(docId)
  }, [docId])

  // ---- the editor --------------------------------------------------------------------------------------

  useLayoutEffect(() => {
    const article = articleRef.current
    if (!article) return
    const host: EditorHost = {
      doc: () => useApp.getState().fx.canvases?.[docId],
      ctx: inlineCtx,
      save: (patch) => useApp.getState().updateCanvas(docId, { ...patch, updated: nowTs(), lastEditorId: useApp.getState().fx.me }),
      rendered: () => {
        const seq = ++renderSeq
        const found: Portal[] = []
        article.querySelectorAll<HTMLElement>('.section[data-embed]').forEach((sec) => {
          const el = sec.querySelector<HTMLElement>('.embeddedUiCardContainer__KANvY > div')
          if (!el) return
          found.push({ key: `${sec.dataset.id}-${seq}`, el, kind: sec.dataset.embed === 'message' ? 'message' : 'file', conversationId: sec.dataset.embedConversation, ts: sec.dataset.embedTs, fileId: sec.dataset.embedFile })
        })
        article.querySelectorAll<HTMLElement>('li.slackified-checkbox').forEach((li) => {
          const box = li.querySelector<HTMLElement>(':scope > editor-ui.checkbox-container')
          const itemId = li.querySelector<HTMLElement>(':scope > .section')?.dataset.id
          if (!box || !itemId) return
          found.push({ key: `cb-${itemId}-${seq}`, el: box, kind: 'checkbox', itemId, checked: li.classList.contains('checked') })
        })
        setPortals(found)
        numberMarkers(article)
      },
      changed: () =>
        requestAnimationFrame(() => {
          placeholders()
          numberMarkers(article)
          const ed = editorRef.current
          if (ed && ed.focused()) {
            useCanvasEditing.setState({ editor: ed, formats: ed.formats() })
            keepCaretVisible()
          }
        }),
      autocomplete: (t) => {
        if (!t) return setAc(null)
        const type = t.kind === 'member' ? '@' : t.kind === 'channel' ? '#' : ':'
        // the composer's autocomplete, with broadcasts off (CanvasFeatureAutocomplete.swift:34-48): people, channels, emoji
        const rows = search(type, t.query, { fx: useApp.getState().fx, conversationId: '' }).filter((r) => r.kind === 'user' || r.kind === 'channel' || r.kind === 'emoji')
        setAc(rows.length ? { t, rows, hi: -1 } : null)
      },
      openMention: (kind, mid) => {
        const s = useApp.getState()
        if (kind === 'user') s.openProfile(mid)
        else if (s.fx.conversations[mid]) s.openConversation(mid)
      },
      // the cards open themselves (their own taps)
      openEmbed: () => {},
      openLink: (href) => window.open(href, '_blank', 'noopener'),
    }
    const editor = new CanvasEditor(article, docId, host)
    editorRef.current = editor
    onEditor(editor)
    editor.mount()

    const choose = (row: AcRow | undefined) => {
      if (!row) return
      if (row.kind === 'user') editor.choose({ kind: 'member', id: row.user.id })
      else if (row.kind === 'channel') editor.choose({ kind: 'channel', id: row.conv.id })
      else if (row.kind === 'emoji') editor.choose({ kind: 'emoji', name: row.name })
    }
    pickRef.current = choose

    const onKeyDown = (e: KeyboardEvent) => {
      const a = acRef.current
      if (a) {
        // a hardware keyboard moves the highlight and picks (SKList.swift:2576-2604)
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          const n = a.rows.length
          const cur = a.hi < 0 ? (e.key === 'ArrowDown' ? -1 : 0) : a.hi
          setAc({ ...a, hi: (cur + (e.key === 'ArrowDown' ? 1 : -1) + n) % n })
          return
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          choose(a.rows[Math.max(0, a.hi)])
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          editor.close()
          return
        }
      }
      if (editor.keydown(e)) e.preventDefault()
    }
    const onBeforeInput = (e: Event) => {
      if (editor.beforeInput(e as InputEvent)) e.preventDefault()
    }
    const onInput = (e: Event) => editor.input(e as InputEvent)
    const onPaste = (e: ClipboardEvent) => editor.paste(e)
    const onCut = (e: ClipboardEvent) => editor.cut(e)
    const onClick = (e: MouseEvent) => {
      if (editor.click(e)) return
      // a tap in the text starts editing there (the SDK takes the keyboard)
      if (!canEditRef.current || editingRef.current || editor.focused()) return
      article.contentEditable = 'true'
      editor.focusAt(e.clientX, e.clientY)
    }
    const onFocusIn = () => {
      onEditing(true)
      useCanvasEditing.setState({ editor, formats: editor.formats() })
    }
    const onFocusOut = () => {
      editor.flush()
      window.setTimeout(() => {
        if (editor.focused()) return
        editor.close()
        // the keyboard went down: editing ends, unless a sheet the toolbar opened has the focus
        if (!persist.current) onEditing(false)
      }, 0)
    }
    const onSelection = () => {
      if (!editor.focused()) return
      editor.updateAutocomplete()
      host.changed()
    }
    article.addEventListener('keydown', onKeyDown)
    article.addEventListener('beforeinput', onBeforeInput)
    article.addEventListener('input', onInput)
    article.addEventListener('paste', onPaste)
    article.addEventListener('cut', onCut)
    article.addEventListener('click', onClick)
    article.addEventListener('focusin', onFocusIn)
    article.addEventListener('focusout', onFocusOut)
    document.addEventListener('selectionchange', onSelection)
    const unsub = useApp.subscribe((s, prev) => {
      if (s.fx.canvases?.[docId] !== prev.fx.canvases?.[docId]) editor.external(s.fx.canvases?.[docId])
    })
    return () => {
      unsub()
      article.removeEventListener('keydown', onKeyDown)
      article.removeEventListener('beforeinput', onBeforeInput)
      article.removeEventListener('input', onInput)
      article.removeEventListener('paste', onPaste)
      article.removeEventListener('cut', onCut)
      article.removeEventListener('click', onClick)
      article.removeEventListener('focusin', onFocusIn)
      article.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('selectionchange', onSelection)
      editor.destroy()
      editorRef.current = null
      onEditor(null)
    }
  }, [docId]) // eslint-disable-line react-hooks/exhaustive-deps

  // The article is editable while you edit (a tap starts it); otherwise drags scroll and taps open links and mentions.
  useEffect(() => {
    const article = articleRef.current
    if (!article) return
    article.contentEditable = editing && canEdit ? 'true' : 'false'
  }, [editing, canEdit])

  // New canvases (and `edit: true`) open editing: the caret in an empty title, else at the end.
  useEffect(() => {
    const ed = editorRef.current
    const article = articleRef.current
    if (!autoEdit || !canEdit || !ed || !article) return
    const t = window.setTimeout(() => {
      article.contentEditable = 'true'
      if (!doc.title.trim()) ed.focusTitle()
      else ed.focusEnd()
    }, 60)
    return () => window.clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // keep the caret above the toolbar as the keyboard comes up
  useEffect(() => {
    if (toolbarUp) requestAnimationFrame(keepCaretVisible)
  }, [toolbarUp, keepCaretVisible])

  /** taps below the text: the caret goes to the end (the web kit's clickBelow) */
  const onPageClick = (e: React.MouseEvent) => {
    const ed = editorRef.current
    const article = articleRef.current
    if (!ed || !article || !canEdit || article.contains(e.target as Node)) return
    article.contentEditable = 'true'
    ed.focusEnd()
  }

  return (
    <>
      <div className="ios-scroll canvas__scroll" ref={scrollRef} onScroll={(e) => onScrolled((e.target as HTMLElement).scrollTop > 0)} data-qa="canvas_doc">
        <div className="cv-page" onClick={onPageClick}>
          <article
            ref={articleRef}
            className={['cv-article', canEdit ? 'is-editable' : 'is-read-only'].join(' ')}
            aria-label={doc.title || 'Untitled'}
            role="textbox"
            aria-multiline
            spellCheck
            data-canvas-id={docId}
            suppressContentEditableWarning
          />
        </div>
      </div>
      {ac && <CanvasAutocomplete ac={ac} scroller={scrollRef.current} toolbarUp={toolbarUp} onPick={(r) => pickRef.current(r)} />}
      {portals.map((p) =>
        createPortal(
          p.kind === 'message' ? (
            <MessageEmbed conversationId={p.conversationId ?? ''} ts={p.ts ?? ''} />
          ) : p.kind === 'file' ? (
            <FileEmbed fileId={p.fileId ?? ''} />
          ) : (
            // the checklist item's checkbox: SKCheckbox (the Slackified checkbox; the SDK's own is off by default,
            // ios_canvas_slackified_checkboxes.json); taps toggle it whether or not you're editing, if you can edit
            <span className={`cv-check${canEdit ? '' : ' is-read-only'}`} onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()} data-no-drag>
              <SKCheckbox isOn={!!p.checked} onToggled={(on) => editorRef.current?.setChecked(p.itemId!, on)} accessibilityLabel="Checklist item" />
            </span>
          ),
          p.el,
          p.key,
        ),
      )}
    </>
  )
}

/**
 * The autocomplete card (composer.md §18.2): glass, 16 pt above the caret's line when there's more room above, else
 * 16 pt below it; at most min(240, available − 8) tall; between the layout margins.
 */
function CanvasAutocomplete({ ac, scroller, toolbarUp, onPick }: { ac: Ac; scroller: HTMLElement | null; toolbarUp: boolean; onPick: (r: AcRow) => void }) {
  const device = useDevice()
  if (!scroller) return null
  const screen = scroller.closest('.ios-screen') as HTMLElement | null
  const sr = (screen ?? scroller).getBoundingClientRect()
  const k = screen ? sr.width / screen.offsetWidth || 1 : 1
  const caretTop = (ac.t.rect.top - sr.top) / k
  const caretBottom = (ac.t.rect.bottom - sr.top) / k
  const kb = parseFloat(getComputedStyle(scroller.closest('.ios-app') ?? scroller).getPropertyValue('--kb-height')) || 0
  const areaTop = device.safeTop + 3 // ACF:239-255
  const areaBottom = device.height - kb - (toolbarUp ? 60 : 0)
  const above = caretTop - areaTop > areaBottom - caretBottom
  const available = above ? caretTop - 16 - areaTop : areaBottom - caretBottom - 16
  const maxHeight = Math.max(44, Math.min(240, available - 8))
  const height = Math.min(maxHeight, ac.rows.reduce((h, r) => h + rowHeight(r), 0))
  const style: CSSProperties = above ? { top: caretTop - 16 - height } : { top: caretBottom + 16 }
  return (
    <div className="cv-ac">
      <AutocompleteCard rows={ac.rows} highlighted={ac.hi} onPick={onPick} style={style} maxHeight={maxHeight} query={`${ac.t.kind}${ac.t.query}`} />
    </div>
  )
}

/**
 * CanvasLoadingStateView: basePrimary with cut-outs over a shimmer (surfacePrimary ↔ surfaceSecondary, 1.8 s). Opening a
 * canvas: the pattern measured in CanvasLoadingStateViewTests/testView@3x.png (393 pt wide, below the bar), x from 36 to
 * width − 36: a 36 pt emoji block at y 28 with a title bar from x 88; full-width bars at y 100, 124, 148, 172; a
 * half-width bar at 196; ¾ width at 248; bars at 292, 316, 340; a 164 pt card at 380, a 54 pt one at 564; ¾ at 646; bars
 * at 682, 706, 730; the next emoji row at 782 (a 754 pt period). Creating one: newCanvasLoadingLayout — 28 pt, a ¾ line,
 * 28 pt, a full line, a ½ line, 16 pt lines 8 pt apart, no repeat (CanvasLoadingStateView.swift:153-160).
 */
function LoadingSkeleton({ isNew }: { isNew?: boolean }) {
  const device = useDevice()
  const w = device.width
  const h = device.height - device.safeTop - 44
  const rr = (x: number, y: number, rw: number, rh: number, r = 4) =>
    `M${x + r} ${y}H${x + rw - r}A${r} ${r} 0 0 1 ${x + rw} ${y + r}V${y + rh - r}A${r} ${r} 0 0 1 ${x + rw - r} ${y + rh}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + rh - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  const full = w - 72
  const shapes: string[] = []
  if (isNew) {
    // sectionSpace 28 · ¾ line (16 + 8) · sectionSpace 28 · full line (16 + 8) · ½ line (CanvasLoadingItem.swift:10-17)
    shapes.push(rr(36, 28, full * 0.75, 16), rr(36, 80, full, 16), rr(36, 104, full * 0.5, 16))
  } else {
    // One period of the pattern (754 pt), repeated to fill the screen: [y, width fraction, height]; 0 = the emoji row
    const period: [number, number, number][] = [[28, 0, 36], [100, 1, 16], [124, 1, 16], [148, 1, 16], [172, 1, 16], [196, 0.5, 16], [248, 0.75, 16], [292, 1, 16], [316, 1, 16], [340, 1, 16], [380, 1, 164], [564, 1, 54], [646, 0.75, 16], [682, 1, 16], [706, 1, 16], [730, 1, 16]]
    for (let base = 0; base < h; base += 754)
      for (const [y, f, bh] of period) {
        if (base + y > h) break
        // the emoji row: a 36 pt block, then a 16 pt title bar from x 88 centered on it
        if (f === 0) shapes.push(rr(36, base + y, 36, 36), rr(88, base + y + 10, w - 124, 16))
        else shapes.push(rr(36, base + y, full * f, bh))
      }
  }
  // basePrimary with the shapes cut out (fill-rule evenodd), over the shimmer
  const cover = [`M0 0H${w}V${h}H0Z`, ...shapes].join('')
  return (
    <div className="cv-loading" aria-label="Loading" role="progressbar">
      <div className="cv-loading__shimmer" />
      <svg className="cv-loading__cover" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <path d={cover} fillRule="evenodd" />
      </svg>
    </div>
  )
}

/** FileNoAccessOverlayView with its default copy (file_access_denied_title / _message, yaml:6498 / 6494). */
function NoAccess() {
  return (
    <div className="cv-no-access">
      <div className="cv-no-access__stack">
        <Icon name="lock_filled" size={20} color="var(--dt_color_content_primary)" />
        <div className="cv-no-access__title">This file isn’t visible to you</div>
        <div className="cv-no-access__body">This file is only visible to members of the conversation where it was originally shared.</div>
      </div>
    </div>
  )
}
