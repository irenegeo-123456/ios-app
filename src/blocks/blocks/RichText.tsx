import { createContext, useContext, type ReactNode } from 'react'
import { RichText, renderInlines } from '../../app/text/RichText'
import { registerBlock } from '../surface'
import { toInlines, type RtElement, type RtInline, type RtList } from '../rich-text'
import type { RichTextBlockKit } from '../types'

// The rich_text block (spec blockkit.md §3.8; Blocks/RichText/BKRichTextBlockView.swift:76-125): one label in Lato 17
// content_primary (Sept; June sk_primary_foreground: BlockKitPresentationServiceInterface.swift:108-112), styled like message text (Text+Display.swift, the classes in src/app/text/text.css).
// Sections are paragraphs a line break apart; lists put bullets •, ◦, ▪ (numbers 1. a. i.) at indent × 29 with the
// text 28 further (RichTextTheming.swift:71-80); quotes indent 15 behind a 4 pt bar; code blocks are the full-width box.

/** "  (edited)" goes after the last rich_text block of a message whose blocks are all rich_text (TextMapper.swift:36-62). */
export const EditedContext = createContext<string | null>(null)

const BULLETS = ['bullet', 'ring', 'square'] as const
const alpha = (n: number) => {
  let s = ''
  for (let k = n; k > 0; k = Math.floor((k - 1) / 26)) s = String.fromCharCode(97 + ((k - 1) % 26)) + s
  return s
}
const ROMAN: [number, string][] = [
  [1000, 'm'],
  [900, 'cm'],
  [500, 'd'],
  [400, 'cd'],
  [100, 'c'],
  [90, 'xc'],
  [50, 'l'],
  [40, 'xl'],
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
]
const roman = (n: number) => ROMAN.reduce((acc, [v, r]) => {
  while (n >= v) {
    acc += r
    n -= v
  }
  return acc
}, '')

/** OrderedListPrefixGenerator.swift:12-25: "1." / "a." / "i." by indent, cycling. */
function orderedMarker(n: number, indent: number) {
  const k = indent % 3
  return `${k === 0 ? n : k === 1 ? alpha(n) : roman(n)}.`
}

function Inlines({ els, raw }: { els: RtInline[]; raw?: boolean }) {
  return <>{renderInlines(toInlines(els, raw))}</>
}

function ListView({ el }: { el: RtList }) {
  const indent = el.indent ?? 0
  const start = el.offset ?? 0
  const bullet = el.style !== 'ordered'
  return (
    <div className={`rt-list rt-list--${bullet ? 'bullet' : 'ordered'} bk-rt-list bk-rt-list--${bullet ? BULLETS[indent % 3] : 'ordered'}`} style={{ ['--bk-indent' as string]: `${indent * 29}px` }}>
      {el.elements.map((item, i) => (
        <div key={i} className="rt-li bk-rt-li">
          <span className="rt-li__marker bk-rt-li__marker" aria-hidden>
            {bullet ? '' : orderedMarker(start + i + 1, indent)}
          </span>
          <Inlines els={item.elements} />
        </div>
      ))}
    </div>
  )
}

function ElementView({ el, edited }: { el: RtElement; edited?: ReactNode }) {
  switch (el.type) {
    case 'rich_text_section':
      return (
        <div className="rt-p">
          <Inlines els={el.elements ?? []} />
          {edited}
        </div>
      )
    case 'rich_text_list':
      return <ListView el={el} />
    case 'rich_text_quote':
      return (
        <div className={`rt-quote${el.border ? ' bk-rt-quote--double' : ''}`}>
          <Inlines els={el.elements ?? []} />
        </div>
      )
    case 'rich_text_preformatted': {
      const text = (el.elements ?? []).map((x) => (x.type === 'text' ? x.text : x.type === 'link' ? (x.text ?? x.url) : '')).join('')
      return (
        <div className="rt-pre">
          {text.split('\n').map((line, i) => (
            <div key={i} className="rt-pre__line">
              {line || '​'}
            </div>
          ))}
        </div>
      )
    }
    case 'rich_text_header':
      // level 1 when unset (RichTextHeader.swift:21,34); ≤ 1 headline, 2 title, ≥ 3 subtitleBold (Text+Display.swift:49-61)
      return (
        <div className={`bk-rt-header bk-header--${Math.max(1, Math.min(el.level ?? 1, 3))}`}>
          <Inlines els={el.elements ?? []} />
        </div>
      )
    case 'rich_text_divider':
      return <div className="bk-divider bk-rt-divider" role="separator" />
    default:
      return null
  }
}

export function RichTextBlockView({ block, blockId }: { block: RichTextBlockKit; blockId?: string }) {
  const editedFor = useContext(EditedContext)
  const edited = editedFor !== null && editedFor === blockId ? <span className="rt-edited">{'  (edited)'}</span> : undefined
  if (!block.elements && typeof block.text === 'string') return <RichText text={block.text} jumbomoji={false} edited={!!edited} className="bk-rich-text" />
  const els = block.elements ?? []
  const last = els.length - 1
  return (
    <div className="rt bk-rich-text">
      {els.map((el, i) => (
        <ElementView key={i} el={el} edited={i === last && el.type === 'rich_text_section' ? edited : undefined} />
      ))}
      {edited && els[last]?.type !== 'rich_text_section' && <div className="rt-p">{edited}</div>}
    </div>
  )
}

registerBlock('rich_text', RichTextBlockView as never)
