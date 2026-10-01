import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import type { SheetProps } from '../../nav/registry'
import { Icon } from '../../../icons/Icon'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKEntityRow } from '../../../slackkit/SKEntity'
import { SKBadge } from '../../../slackkit/SKBadge'
import { RichText } from '../../text/RichText'
import { displayName, isAppUser, threadReplyTime, timeOnly } from '../../../messagekit/format'
import { copyText, findMessage, plainText, useDismissIfMissing } from '../shared'
import { SheetBar } from '../ui/SheetBar'
import '../ui/ios.css'
import './select-text.css'

// Select Text (TextCopyingFeature; spec canvas-lists-creation.md §5), from message actions › "Select Text": a native
// sheet at a 500 pt detent and the large one, with the grabber, in a navigation controller titled "Select Text"
// (select_text, yaml:16429) and no close button (TextCopyingFeature.swift:24-50; TextCopyingViewController.swift:15-20).
// The message as MessageKit draws it — the author header without status emoji, no reactions, files, unfurls or
// "(edited)" — its text selectable and, for a one-block message, all selected; then "Copy all text" (copy_all_text,
// yaml:4334, svgText) (TextCopyingPresenter.swift:126-230). A selection offers Copy and Share (SKLabel.swift:1079-1087);
// Copy copies it and closes the sheet, as "Copy all text" does with the whole message (TextCopyingFeature.swift:112-124).
//
//   presentSheet('select-text', { conversationId, ts, threadTs? })

/** the custom detent (TextCopyingFeature.swift:25) */
const DETENT = 500

export function SelectTextSheet({ sheetKey, conversationId, ts, threadTs }: SheetProps & { conversationId?: string; ts?: string; threadTs?: string }) {
  const sheet = useSheet()
  const fx = useApp((s) => s.fx)
  const msg = useApp((s) => (conversationId && ts ? findMessage(s, conversationId, ts, threadTs) : undefined))
  const textRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState<{ x: number; top: number; bottom: number; above: boolean } | null>(null)
  useDismissIfMissing(!msg)

  const close = useCallback((then?: () => void) => (sheet ? sheet.dismiss(then) : (useApp.getState().dismissSheet(sheetKey), then?.())), [sheet, sheetKey])
  // "Copied" with toast_checkmark (copied, yaml:4319; CopyPasteHandler.swift:257-260, 414)
  const copy = (text: string) => {
    copyText(text)
    close(() => useApp.getState().showToast('Copied', 'toast_checkmark'))
  }

  // One rich-text block: the whole text starts selected (isTextPreselected = blocks.count == 1, TextCopyingPresenter.swift:136-137)
  const single = !msg?.blocks || msg.blocks.length <= 1
  useLayoutEffect(() => {
    const el = textRef.current
    if (!el || !single) return
    const t = setTimeout(() => {
      const r = document.createRange()
      r.selectNodeContents(el)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(r)
    }, 450)
    return () => clearTimeout(t)
  }, [single])

  // Taller than the custom detent: the large one (heightChanged, TextCopyingFeature.swift:124-141)
  useLayoutEffect(() => {
    const el = listRef.current?.firstElementChild as HTMLElement | null
    if (el && el.offsetHeight + 60 > DETENT) sheet?.setDetent('large')
  }, [sheet])

  // The edit menu follows the selection inside the text (UIKit's, over the selected text)
  useEffect(() => {
    const onSel = () => {
      const el = textRef.current
      const sel = window.getSelection()
      const r = sel?.rangeCount ? sel.getRangeAt(0) : null
      if (!el || !r || r.collapsed || !el.contains(r.commonAncestorContainer)) return setMenu(null)
      // in the sheet's own coordinates (the menu is drawn in it, and moves with it), unscaled by the phone's zoom
      const root = rootRef.current ?? el
      const sr = root.getBoundingClientRect()
      const k = sr.width / root.offsetWidth || 1
      const rects = Array.from(r.getClientRects())
      const box = rects.length ? rects : [r.getBoundingClientRect()]
      const top = Math.min(...box.map((b) => b.top))
      const bottom = Math.max(...box.map((b) => b.bottom))
      const left = Math.min(...box.map((b) => b.left))
      const right = Math.max(...box.map((b) => b.right))
      // above the selection when the screen has room for it there (UIEditMenuInteraction prefers above), else below
      const screenTop = (el.closest('.ios-screen') ?? root).getBoundingClientRect().top
      setMenu({ x: ((left + right) / 2 - sr.left) / k, top: (top - sr.top) / k, bottom: (bottom - sr.top) / k, above: (top - screenTop) / k > 120 })
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [])

  if (!msg || !conversationId) return null
  const author = fx.users[msg.userId]
  const inThread = !!threadTs && threadTs !== msg.ts
  const selectedText = () => window.getSelection()?.toString() ?? ''

  return (
    <div className="st" ref={rootRef}>
      <SheetBar title="Select Text" />
      <div className={`st__list${sheet?.detent === 'large' ? ' ios-scroll' : ''}`} ref={listRef}>
        <div>
          {/* a blank divider header (8 pt), the message row, an 8 pt footer with a hairline (TextCopyingPresenter.swift:158-173) */}
          <div className="st__gap" />
          <div className="mk-message mk-message--none st__message" role="article">
            <div className="mk-message__main">
              <span className="mk-message__avatar" aria-hidden>
                <SKMemberAvatar src={author?.avatar} name={author?.realName ?? displayName(author)} size="large" />
              </span>
              <div className="mk-message__column">
                {/* headerStyling: the author, shouldShowStatusEmoji false */}
                <div className="mk-header">
                  <span className="mk-header__name">{displayName(author)}</span>
                  {isAppUser(author) && <SKBadge text="APP" className="mk-header__badge" />}
                  <span className="mk-header__time">{inThread ? threadReplyTime(msg.ts) : timeOnly(msg.ts)}</span>
                </div>
                <div className="mk-content">
                  {/* secondaryContentMode .textSelection: a selectable text view; shouldAllowEditedText false */}
                  <div className="mk-text st__text" ref={textRef}>
                    <RichText text={msg.text} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="st__footer" />
          <div className="st__gap" />
          {/* SKGenericEntity .small with the svgText icon (TextCopyingPresenter.swift:181-196) */}
          <SKEntityRow ornament={<Icon name="text" size={20} color="var(--dt_color_content_primary)" />} title="Copy all text" onClick={() => copy(plainText(fx, msg.text))} data-qa="copy_all_text" />
          <div className="st__gap" />
        </div>
      </div>
      {menu && (
        // the edit menu UIKit draws over a selection, with SKLabel's two actions: Copy and Share (SKLabel.swift:1079-1087)
        <div className="st-menu glass-platter" style={{ left: menu.x, top: menu.above ? menu.top - 10 : menu.bottom + 10, transform: menu.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)' }} onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()} role="menu">
          <button type="button" className="st-menu__item" role="menuitem" onClick={() => copy(selectedText())} data-tap>
            Copy
          </button>
          <span className="st-menu__divider" />
          <button type="button" className="st-menu__item" role="menuitem" onClick={() => close(() => useApp.getState().showToast('Not in the prototype'))} data-tap>
            Share…
          </button>
        </div>
      )}
    </div>
  )
}
