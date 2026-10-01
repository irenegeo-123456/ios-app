import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { Icon } from '../../../icons/Icon'
import { parseEmojiName } from '../../../emoji/Emoji'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKEmoji } from '../../../slackkit/SKEmoji'
import { SKButton } from '../../../slackkit/SKButton'
import { findMessage, useDismissIfMissing } from '../shared'
import './reactors.css'

// Who reacted (spec sheets-menus.md §2.8; RX/ = Modules/Integration/Reactors/Implementation/). One tab per reaction
// (emoji + count, the selected one in highlight1.content with a 3 pt underline), swiping between pages; each page is an
// M header ":name:" (with "React with :name:" when you haven't reacted) and 56 pt member rows (your own with "Remove").
// The "Add a reaction" bar is pinned to the bottom. Tapping a person dismisses the sheet and opens their profile; removing
// the last reaction dismisses it (RX/ReactorsViewController.swift:196-210, September 2026).
// Reference: Modules/Integration/Reactors/Snapshots/iOS_26/…/testViewInEditMode@3x.png (testReactWithEmojiButtonInEditMode
// is a disabled test now and keeps June's colors).

interface Props {
  sheetKey: string
  conversationId: string
  ts: string
  threadTs?: string
  /** the reaction that was long-pressed: its page opens first */
  name?: string
  /** ReactorsViewMode.viewOnly (Activity and saved items open it so, ActivityFeature.swift:413-415): no "React with",
   *  no Remove and no "Add a reaction" bar (RX/Presentables/ReactorsPageListModel.swift:66-74,91-98;
   *  RX/ReactorsViewController.swift:104,152). The default is .edit, as a reaction pill in a conversation opens it. */
  viewOnly?: boolean
}

export function ReactorsSheet({ conversationId, ts, threadTs, name, viewOnly = false }: Props) {
  const sheet = useSheet()
  const s = useApp()
  const msg = findMessage(s, conversationId, ts, threadTs)
  const reactions = msg?.reactions ?? []
  // Opens on the tapped reaction: the exact name, else the same emoji without its skin tone (RX/ReactorsViewController.swift:213-261).
  const initial = Math.max(
    0,
    reactions.findIndex((r) => r.name === name),
    name ? reactions.findIndex((r) => parseEmojiName(r.name).base === parseEmojiName(name).base) : -1,
  )
  const [page, setPage] = useState(initial)
  const [drag, setDrag] = useState(0)
  const pager = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; y: number; t: number; w: number; owned: boolean | null } | null>(null)

  useLayoutEffect(() => {
    if (page > reactions.length - 1) setPage(Math.max(0, reactions.length - 1))
  }, [reactions.length, page])

  useDismissIfMissing(!msg || reactions.length === 0)
  if (!msg || reactions.length === 0) {
    return <div className="rx" />
  }
  const me = s.fx.me
  const openProfile = (userId: string) =>
    sheet?.dismiss(() => {
      const st = useApp.getState()
      st.presentSheet('profile', { userId })
    })

  // Horizontal paging between reactions (Parchment's PagingViewController): a drag follows the finger; a release past
  // half a page, or a flick, moves to the next page.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), w: pager.current?.offsetWidth ?? 1, owned: null }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const st = start.current
    if (!st) return
    const scale = (pager.current?.getBoundingClientRect().width ?? st.w) / st.w || 1
    const dx = (e.clientX - st.x) / scale
    const dy = (e.clientY - st.y) / scale
    if (st.owned === null) {
      if (Math.hypot(dx, dy) < 8) return
      st.owned = Math.abs(dx) > Math.abs(dy) * 1.2
      if (!st.owned) return
      pager.current?.setPointerCapture?.(e.pointerId)
    }
    if (!st.owned) return
    e.stopPropagation()
    const edge = (page === 0 && dx > 0) || (page === reactions.length - 1 && dx < 0)
    setDrag(edge ? dx / 3 : dx)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const st = start.current
    start.current = null
    if (!st?.owned) return
    const scale = (pager.current?.getBoundingClientRect().width ?? st.w) / st.w || 1
    const dx = (e.clientX - st.x) / scale
    const v = dx / Math.max(1, performance.now() - st.t)
    let next = page
    if (dx < -st.w / 2 || v < -0.5) next = Math.min(reactions.length - 1, page + 1)
    else if (dx > st.w / 2 || v > 0.5) next = Math.max(0, page - 1)
    setDrag(0)
    setPage(next)
  }

  const width = pager.current?.offsetWidth ?? 0
  const progress = width ? -drag / width : 0
  return (
    <div className={`rx${viewOnly ? ' is-view-only' : ''}`} data-qa="reactors">
      <Tabs reactions={reactions} page={page} progress={progress} onSelect={setPage} />
      <div className="rx-pager" ref={pager} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} data-no-swipe>
        <div className="rx-pager__track" style={{ transform: `translateX(calc(${-page * 100}% + ${drag}px))`, transition: drag ? 'none' : undefined }}>
          {reactions.map((r) => {
            const reacted = r.users.includes(me)
            return (
              <div key={r.name} className="rx-page ios-scroll">
                {/* SKHeaderEntity .medium: ":name:" in smallBodyBold, "React with :name:" when you haven't reacted (RX/Presentables/ReactorsPageListModel.swift:63-81) */}
                <div className="rx-header">
                  <span className="rx-header__title">{`:${r.name}:`}</span>
                  {!reacted && !viewOnly && (
                    <button type="button" className="rx-header__button" onClick={() => s.toggleReaction(conversationId, ts, r.name)}>
                      {`React with :${r.name}:`}
                    </button>
                  )}
                </div>
                {r.users.map((u) => {
                  const user = s.fx.users[u]
                  return (
                    <div key={u} className="rx-row" role="button" onClick={() => openProfile(u)} data-tap>
                      <span className="rx-row__bg" />
                      <SKMemberAvatar src={user?.avatar} name={user?.realName ?? u} size="large" presence={user?.presence === 'away' ? 'away' : 'active'} />
                      <span className="rx-row__name">{user?.realName ?? u}</span>
                      {u === me && !viewOnly && (
                        // "Remove" (remove, yaml:16166), .systemDanger = important.content since September
                        // (RX/Presentables/ReactorsPageListModel.swift:92-98, SKButton+Types.swift:208-209)
                        <span className="rx-row__remove" onClick={(e) => e.stopPropagation()}>
                          {/* .systemDanger() is padded by default (SKButton+Types.swift:28; +PresentationObject.swift:234-235):
                              measured, the title ends 29.3 pt from the edge = 16 + 12 (testViewInEditMode@3x.png) */}
                          <SKButton title="Remove" buttonStyle="systemDanger" size="medium" onClick={() => s.toggleReaction(conversationId, ts, r.name)} />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      {/* "Add a reaction" (add_a_reaction, yaml:674): 60 pt, pinned to the bottom safe area (RX/Views/AddReactionControl.swift) */}
      {!viewOnly && (
        <button type="button" className="rx-add" onClick={() => sheet?.dismiss(() => useApp.getState().presentSheet('emoji-picker', { conversationId, ts, threadTs }))}>
          <span className="rx-add__icon">
            <Icon name="add_reaction" size={20} />
          </span>
          <span className="rx-add__text">Add a reaction</span>
        </button>
      )}
    </div>
  )
}

/** Parchment tabs: 60 tall, 10 pt menu insets, tabs sized to fit (at least 60) and stretched when they fit the width;
 *  unselected content at 0.8 scale; the selected count in highlight1.content with a 3 pt indicator inset 10
 *  (RX/ReactorsViewController.swift:30-41,213-276). */
function Tabs({ reactions, page, progress, onSelect }: { reactions: { name: string; users: string[] }[]; page: number; progress: number; onSelect: (i: number) => void }) {
  const bar = useRef<HTMLDivElement>(null)
  const [boxes, setBoxes] = useState<{ left: number; width: number }[]>([])
  useLayoutEffect(() => {
    const el = bar.current
    if (!el) return
    const measure = () => setBoxes([...el.querySelectorAll<HTMLElement>('.rx-tab')].map((t) => ({ left: t.offsetLeft, width: t.offsetWidth })))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [reactions.length])
  // Keep the selected tab in view when the tabs scroll.
  useLayoutEffect(() => {
    const el = bar.current
    const b = boxes[page]
    if (el && b && (b.left < el.scrollLeft || b.left + b.width > el.scrollLeft + el.clientWidth)) el.scrollLeft = b.left - 10
  }, [page, boxes])
  const from = boxes[page]
  const to = boxes[Math.max(0, Math.min(boxes.length - 1, page + Math.sign(progress)))]
  const p = Math.min(1, Math.abs(progress))
  const ind: CSSProperties | undefined = from && to ? { left: from.left + 10 + (to.left - from.left) * p, width: from.width - 20 + (to.width - from.width) * p } : undefined
  return (
    <div className="rx-tabs" ref={bar} data-scroll-x role="tablist">
      <div className="rx-tabs__row">
        {reactions.map((r, i) => (
          <button key={r.name} type="button" role="tab" aria-selected={i === page} className={`rx-tab${i === page ? ' is-selected' : ''}`} onClick={() => onSelect(i)}>
            <span className="rx-tab__content">
              {/* an SKEmoji made with a 24 × 24 frame, but the stack view lays it out at its intrinsic 20 × 20
                  (RX/Views/ReactorsPagingCell.swift:35,41-44,53-60; SKEmoji.swift:22,75-77); measured: the custom
                  emoji's placeholder 16 × 16 at the unselected 0.8 scale in testViewInViewOnlyMode@3x.png */}
              <SKEmoji name={r.name} />
              <span className="rx-tab__count">{r.users.length}</span>
            </span>
          </button>
        ))}
        {ind && <span className="rx-tabs__indicator" style={ind} />}
      </div>
    </div>
  )
}
