import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { SKFileType } from './fileTypes'
import { SKButton } from './SKButton'
import { SKCompactAttachment, SKCompactOverflow, type SKAttachmentIcon, type SKCompactAttachmentState } from './SKCompactAttachment'
import { SKExpandedAttachment, expandedAttachmentSize } from './SKExpandedAttachment'
import { SKThumbnailAttachment, type SKThumbnailAttachmentState } from './SKThumbnailAttachment'
import { cx } from './util'
import './attachments.css'

// SKAttachmentBar (DesignerComponents/AttachmentBar/SKAttachmentBar.swift): a message's or draft's attachments, laid
// out as full-width compact cards and expanded previews (stacked, 8 pt apart), or as rows of 64 pt thumbnails (8 pt
// apart), depending on the preferences and what each attachment can render as (positionedContent :249-539). What
// doesn't fit becomes a "+N" thumbnail (removing tiles until it fits), a compact card with a "+N" tile, or a
// "See N More" button. Files and titled errors render compact; images and videos expanded (:862-972). Since
// September 2026 only the expanded previews carry ALT badges ("+ALT" with allowAltTextReminder); thumbnails hide them.
// Spec: slackkit-components.md › SKAttachmentBar.
//
//   <SKAttachmentBar attachments={[{ id: 'a', state: { file: { type: 'pdf', title: 'plan.pdf', subtitle: '2 MB PDF' } } }]} />
//   <SKAttachmentBar attachments={photos} attachmentPreferences={{ thumbnail: { maximumRowCount: 1 } }} />

export type SKAttachmentBarState =
  | { image: { src: string; altText?: string; knownImageSize?: { width: number; height: number } } }
  | { video: { src: string; durationInSeconds?: number } }
  | {
      file: {
        type: SKFileType
        title: ReactNode
        subtitle?: string
        previewImage?: { src: string; width: number; height: number }
        accessoryIcon?: string | SKAttachmentIcon
        progress?: number
      }
    }
  | { error: { icon?: SKAttachmentIcon; title?: string; subtitle?: string } }
  | { overflow: number }
  | { placeholder: { icon: string; color?: string } }

export interface SKAttachmentBarItem {
  id: string
  state: SKAttachmentBarState
  isInteractionEnabled?: boolean
  allowAltTextReminder?: boolean
  accessibilityLabel?: string
}

/** AttachmentPreferences (:717-727) */
export type SKAttachmentPreferences =
  | { thumbnail: { maximumRowCount?: number } }
  | { expanded: { maximumCount: number; shouldOverflowVertically?: boolean } }
  | { mixed: { maximumExpandedCount?: number; maximumThumbnailRowCount?: number; maximumCompactCount?: number | null } }

interface Props {
  attachments: SKAttachmentBarItem[]
  attachmentPreferences?: SKAttachmentPreferences
  /** false: thumbnails share the width (never below 64) */
  useStaticallySizedThumbnails?: boolean
  onSelectedAttachment?: (id: string) => void
  onSelectedShowMore?: () => void
  onSelectedAltBadge?: (id: string) => void
  className?: string
  style?: CSSProperties
}

const GAP = 8 // horizontalItemSpacing, rowSpacing

type Kind = 'compact' | 'expanded' | 'thumbnail' | 'showMore' | 'compactOverflow' | 'verticalOverflow'
interface Placed {
  kind: Kind
  item: SKAttachmentBarItem
  x: number
  y: number
  w: number
  h: number
  count?: number
}

const compactState = (s: SKAttachmentBarState): SKCompactAttachmentState | null => {
  if ('file' in s) return { file: { ...s.file, subtitle: s.file.subtitle } }
  if ('error' in s && s.error.title) return { error: { title: s.error.title, subtitle: s.error.subtitle, icon: s.error.icon } }
  return null
}
const canExpand = (s: SKAttachmentBarState) => 'image' in s || 'video' in s
const thumbnailState = (s: SKAttachmentBarState): SKThumbnailAttachmentState => {
  if ('image' in s) return { image: { src: s.image.src, altText: s.image.altText } }
  if ('video' in s) return { video: s.video }
  if ('file' in s) return { file: s.file.type }
  if ('error' in s) return s.error.icon ? { error: s.error.icon } : 'error'
  if ('overflow' in s) return { overflow: s.overflow }
  return { placeholder: s.placeholder }
}

/** SKCompactAttachment.height(for:): 12 + max(36, title 18 + 2 + subtitle 15.67) + 12, plus a preview (≤ 300) */
function compactHeight(s: SKCompactAttachmentState, width: number) {
  let h = 60
  if (typeof s === 'object' && 'file' in s && s.file.previewImage) h += Math.min(Math.round(width * (s.file.previewImage.height / s.file.previewImage.width) * 3) / 3, 300)
  return h
}

/** positionedContent(width:attachments:attachmentPreferences:useStaticallySizedThumbnails:) */
export function attachmentBarLayout(width: number, attachments: SKAttachmentBarItem[], prefs: SKAttachmentPreferences, useStatic: boolean, buttonHeight = 36) {
  if (!width || !attachments.length) return null
  let full: boolean
  let maxRows: number
  let vertical = false
  const n = attachments.length
  if ('thumbnail' in prefs) {
    full = false
    maxRows = prefs.thumbnail.maximumRowCount ?? 1
  } else if ('expanded' in prefs) {
    full = attachments.every((a) => compactState(a.state) || canExpand(a.state))
    maxRows = full ? prefs.expanded.maximumCount : 1
    vertical = !!prefs.expanded.shouldOverflowVertically
  } else {
    const maxExpanded = prefs.mixed.maximumExpandedCount ?? 1
    const maxThumbRows = prefs.mixed.maximumThumbnailRowCount ?? 1
    const maxCompactPref = prefs.mixed.maximumCompactCount === undefined ? 1 : prefs.mixed.maximumCompactCount
    const compacts = attachments.filter((a) => compactState(a.state)).length
    const expandeds = attachments.filter((a) => canExpand(a.state)).length
    if (compacts + expandeds < n) [full, maxRows] = [false, maxThumbRows]
    else if (maxCompactPref === null && compacts > 0) [full, maxRows] = [true, 0]
    else {
      const maxCompact = maxCompactPref ?? maxExpanded
      if (expandeds === n && expandeds <= maxExpanded) [full, maxRows] = [true, maxExpanded]
      else if (compacts === n) [full, maxRows] = [true, maxCompact]
      else if (n <= Math.min(maxExpanded, maxCompact)) [full, maxRows] = [true, Math.min(maxExpanded, maxCompact)]
      else [full, maxRows] = [false, maxThumbRows]
    }
  }

  let x = 0
  let y = 0
  let rowH = 0
  let row = 0
  const placed: Placed[] = []
  const thumbSide = useStatic ? 64 : Math.max((width - GAP * (n - 1)) / n, 64)
  const add = (kind: Kind, item: SKAttachmentBarItem, count?: number): boolean => {
    let w: number
    let h: number
    if (kind === 'compact') [w, h] = [width, compactHeight(compactState(item.state)!, width)]
    else if (kind === 'expanded') {
      const known = 'image' in item.state ? item.state.image.knownImageSize : undefined
      const s = expandedAttachmentSize(width, known)
      ;[w, h] = [s.width, s.height]
    } else if (kind === 'thumbnail' || kind === 'showMore') {
      const side = kind === 'showMore' ? 64 : thumbSide
      ;[w, h] = [Math.min(side, width), side]
    } else if (kind === 'compactOverflow') [w, h] = [width, 64]
    else [w, h] = [width, buttonHeight]
    rowH = Math.max(rowH, h)
    if (x + w > width) {
      if (maxRows !== 0 && row + 1 === maxRows && kind !== 'verticalOverflow') return false
      row += 1
      y += rowH + GAP
      x = 0
      rowH = 0 // (as iOS does: the item that wrapped counted toward the previous row's height)
    }
    placed.push({ kind, item, x, y, w, h, count })
    x = Math.min(x + w + GAP, width)
    return true
  }
  const removeLast = () => {
    const r = placed.pop()
    if (!r) return false
    x -= r.w + GAP
    if (Math.abs(x) < 1e-6) {
      row -= 1
      const last = placed[placed.length - 1]
      y = last?.y ?? 0
      x = last ? last.x + last.w : 0
      rowH = Math.max(0, ...placed.filter((p) => p.y === y).map((p) => p.h))
    }
    return true
  }

  let remaining = 0
  if (full) {
    const sorted = [...attachments].sort((a, b) => Number(!compactState(a.state)) - Number(!compactState(b.state)))
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i]!
      if (!add(compactState(a.state) ? 'compact' : 'expanded', a)) {
        remaining = sorted.length - i
        break
      }
    }
  } else {
    for (let i = 0; i < n; i++) {
      if (!add('thumbnail', attachments[i]!)) {
        remaining = n - i
        break
      }
    }
  }
  const more: SKAttachmentBarItem = { id: 'more', state: { overflow: remaining } }
  if (remaining > 0 && !full) {
    while (64 > width - x) {
      if (!removeLast()) break
      remaining += 1
    }
    add('showMore', { id: 'more', state: { overflow: remaining } }, remaining)
  } else if (remaining > 0 && full && placed.length) {
    const last = placed[placed.length - 1]!
    if (vertical) add('verticalOverflow', more, remaining)
    else if (last.kind === 'compact' && removeLast()) add('compactOverflow', last.item, remaining)
  }
  return { full, placed }
}

export function SKAttachmentBar({
  attachments,
  attachmentPreferences = { mixed: {} },
  useStaticallySizedThumbnails = true,
  onSelectedAttachment,
  onSelectedShowMore,
  onSelectedAltBadge,
  className,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(([e]) => setWidth(e!.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const layout = attachmentBarLayout(width, attachments, attachmentPreferences, useStaticallySizedThumbnails)
  const select = (id: string) => (onSelectedAttachment ? () => onSelectedAttachment(id) : undefined)
  let content: ReactNode = null
  let height: number | undefined
  if (layout && !layout.full) {
    const maxX = Math.max(...layout.placed.map((p) => p.x + p.w))
    height = Math.max(...layout.placed.map((p) => p.y + p.h))
    content = (
      <div className="sk-attachment-bar__thumbnails" style={{ width: maxX, height }}>
        {layout.placed.map((p) => (
          <SKThumbnailAttachment
            key={p.kind === 'showMore' ? 'more' : p.item.id}
            state={p.kind === 'showMore' ? { overflow: p.count! } : thumbnailState(p.item.state)}
            size={p.w}
            isInteractionEnabled={p.kind === 'showMore' ? true : p.item.isInteractionEnabled ?? true}
            // the bar's thumbnails never show ALT badges (thumbnailPresentationObject, :864-872, September 2026)
            altTextBadgeVisibility="hidden"
            accessibilityLabel={p.item.accessibilityLabel ?? ('image' in p.item.state ? p.item.state.image.altText : undefined)}
            onSelected={p.kind === 'showMore' ? onSelectedShowMore : select(p.item.id)}
            onAltBadgeSelected={onSelectedAltBadge ? () => onSelectedAltBadge(p.item.id) : undefined}
            style={{ position: 'absolute', left: p.x, top: p.y }}
          />
        ))}
      </div>
    )
  } else if (layout) {
    content = (
      <div className="sk-attachment-bar__stack">
        {layout.placed.map((p) => {
          const interactive = p.item.isInteractionEnabled ?? true
          if (p.kind === 'compact')
            return <SKCompactAttachment key={p.item.id} state={compactState(p.item.state)!} isInteractionEnabled={interactive} onSelected={select(p.item.id)} className="sk-attachment-bar__full" />
          if (p.kind === 'compactOverflow')
            return <SKCompactOverflow key={p.item.id} state={compactState(p.item.state)!} count={p.count!} isInteractionEnabled={interactive} onSelected={select(p.item.id)} onShowMore={onSelectedShowMore} />
          if (p.kind === 'verticalOverflow')
            return (
              <SKButton
                key="more"
                title={`See ${p.count} More`}
                buttonStyle="custom"
                customColors={{ backgroundColor: 'var(--dt_color_base_primary)', titleColor: 'var(--dt_color_content_primary)', borderColor: 'var(--dt_color_outline_tertiary)' }}
                size="medium"
                onClick={onSelectedShowMore}
                style={{ width: '100%' }}
              />
            )
          const s = p.item.state
          return (
            <SKExpandedAttachment
              key={p.item.id}
              state={'image' in s ? { image: { src: s.image.src, altText: s.image.altText } } : { video: (s as { video: { src: string; durationInSeconds?: number } }).video }}
              knownImageSize={'image' in s ? s.image.knownImageSize : undefined}
              width={width}
              // "ALT" when present, plus the "+ALT" reminder when allowed (:874-879)
              altTextBadgeVisibility={p.item.allowAltTextReminder ? 'visibleAlways' : 'visibleIfPresent'}
              isInteractionEnabled={interactive}
              onSelected={select(p.item.id)}
              onAltBadgeSelected={onSelectedAltBadge ? () => onSelectedAltBadge(p.item.id) : undefined}
            />
          )
        })}
      </div>
    )
  }
  return (
    <div ref={ref} className={cx('sk-attachment-bar', className)} style={style} role="group" aria-label="File attachments">
      {content}
    </div>
  )
}
