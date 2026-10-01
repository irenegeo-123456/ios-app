import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { RichText, InlineText } from '../app/text/RichText'
import { asset } from '../lib/asset'
import type { MessageAttachment } from '../data/types'
import { expandedImageSize } from './MKFiles'
import { shortOrdinal } from './format'

// Link unfurls and classic app attachments (spec messages.md §5.1): an optional pretext, then a 4 pt color bar ("pipe")
// beside header, title, text, fields, image and footer, 4 pt apart. The new link cards (§5.2) are behind the
// `newLinkUnfurlPreviews` flag (default off, ios_new_link_unfurl_previews.json:6), so every attachment draws this way.
// Tap anywhere not handled by a child → open the link (MKUnfurlView.swift:65-80).

/** Classic attachments fold their text at 14 lines with "Show more" / "Show less" (UnfurlMapper.swift:29, 886-893). */
const FOLD_LINES = 14

interface Props {
  attachment: MessageAttachment & { pretext?: string; authorSubname?: string }
  /** the text column's width, for the image (the pipe's 12 pt inset is taken off) */
  columnWidth: number
}

export function MKAttachment({ attachment: a, columnWidth }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    // "Show more" only when the text really runs past 14 lines
    const el = textRef.current?.firstElementChild as HTMLElement | null
    if (el && !expanded) setOverflows(el.scrollHeight > el.clientHeight + 1)
  }, [a.text, columnWidth, expanded])
  const link = a.titleLink ?? a.fromUrl
  const header = headerOf(a)
  const footerTime = a.ts ? shortOrdinal(a.ts) : undefined
  const footer = [a.footer, footerTime].filter(Boolean).join(' | ') // " | " between footer and time (UnfurlFooterMapper.swift:147-160)
  const long = overflows || expanded
  const fields = a.fields ?? []
  // thumb_url is only used for videos; image_url is an expanded image (UnfurlImageMapper.swift:14-48)
  const image = a.imageUrl ? expandedImageSize(a.imageWidth, a.imageHeight, columnWidth - 12) : null
  return (
    <div
      className="mk-attachment"
      onClick={(e) => {
        if (!link) return
        e.stopPropagation()
        window.open(link, '_blank', 'noopener')
      }}
    >
      {a.pretext && (
        <div className="mk-attachment__pretext">
          <InlineText text={a.pretext} />
        </div>
      )}
      <div className="mk-attachment__pipe" style={a.color ? ({ '--mk-pipe': a.color } as CSSProperties) : undefined}>
        <div className="mk-attachment__body">
          {header && (
            <div className={`mk-attachment__header${header.serviceAuthor ? ' is-service-author' : ''}`}>
              {header.icon && <img className="mk-attachment__icon" src={asset(header.icon)} alt="" draggable={false} />}
              <span className="mk-attachment__header-text">
                {header.text}
                {header.subname && <span className="mk-attachment__subname">{` ${header.subname}`}</span>}
              </span>
            </div>
          )}
          {a.title && <div className={`mk-attachment__title${a.titleLink ? ' is-link' : ''}`}>{a.title}</div>}
          {a.text && (
            <div ref={textRef} className={`mk-attachment__text${expanded ? '' : ' is-folded'}`} style={{ ['--mk-fold' as string]: FOLD_LINES }}>
              <RichText text={a.text} jumbomoji={false} />
            </div>
          )}
          {long && (
            <button
              type="button"
              className="mk-attachment__more"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded((x) => !x)
              }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
          {fields.length > 0 && <Fields fields={fields} />}
          {image && (
            <span className="mk-image" style={{ width: image.width, height: image.height }}>
              <img src={asset(a.imageUrl!)} alt="" draggable={false} />
            </span>
          )}
          {footer && (
            <div className="mk-attachment__footer">
              {a.footerIcon && <img className="mk-attachment__icon" src={asset(a.footerIcon)} alt="" draggable={false} />}
              <span>
                <InlineText text={footer} />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * The header is the service (name + icon) when there is one, else the author (UnfurlHeaderMapper.swift:66-196 [Sept]): the
 * service name in Lato Bold 17 content_primary, or "Service | Author" in content_tertiary when the author has no icon
 * (:176-186, :194-196); the author name bold content_primary with the subname in content_tertiary (:129-132). June used
 * sk_primary_foreground / sk_foreground_high_solid.
 */
function headerOf(a: Props['attachment']): { text: string; subname?: string; icon?: string; serviceAuthor?: boolean } | null {
  const hiddenServices = ['twitter', 'salesforce', 'slackhelp', 'bluesky']
  if (a.serviceName && !hiddenServices.includes(a.serviceName)) {
    if (!a.authorIcon && a.authorName) return { text: `${a.serviceName} | ${a.authorName}`, icon: a.serviceIcon, serviceAuthor: true } // `attachment_service_name` "%@ | %@", yaml:2287
    return { text: a.serviceName, icon: a.serviceIcon }
  }
  if (a.authorName) return { text: a.authorName, subname: a.authorSubname !== a.authorName ? a.authorSubname : undefined, icon: a.authorIcon }
  return null
}

/** Short fields pair up in two columns; a short field without a neighbour and long fields take the full width (MKFieldsView.swift:16-41). */
function Fields({ fields }: { fields: NonNullable<MessageAttachment['fields']> }) {
  const cells: { f: (typeof fields)[number]; long: boolean }[] = []
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i]
    if (f.short && fields[i + 1]?.short) {
      cells.push({ f, long: false }, { f: fields[i + 1], long: false })
      i++
    } else cells.push({ f, long: true })
  }
  return (
    <div className="mk-fields">
      {cells.map(({ f, long }, i) => (
        <div key={i} className={`mk-field${long ? ' is-long' : ''}`}>
          {f.title && <div className="mk-field__title">{f.title}</div>}
          {f.value && (
            <div className="mk-field__value">
              <RichText text={f.value} jumbomoji={false} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
