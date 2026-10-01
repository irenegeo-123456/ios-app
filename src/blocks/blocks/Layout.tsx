import { useState } from 'react'
import { Icon } from '../../icons/Icon'
import { SKBanner, SKSpinner } from '../../slackkit'
import { registerBlock } from '../surface'
import { BKText, BKInline } from '../text'
import { textOf } from '../format'
import { BKButton, BKChoices, BKImageElement, BKOverflow, BKSelectButton } from '../elements/Elements'
import type { PickableElement } from '../elements/open'
import type { ActionsBlock, AlertBlock, BlockElement, ContextBlock, DividerBlock, FileBlock, HeaderBlock, ImageBlock, ImageElement, KitBlock, SectionBlock, TextObject, VideoBlock } from '../types'

// section, header, divider, context, image, actions, video, file, alert, the unknown-block banner and the internal
// loading block (spec blockkit.md §3.1–3.7, 3.10, 3.11, 3.16, 3.20). Sizes are in the CSS (blocks.css), with sources.

type Props<B extends KitBlock> = { block: B; blockId: string }

// ------------------------------------------------------------------------------------------------ section (§3.1)

/** Accessories drawn right of the text: image (68 × 68), overflow ("More"), datepicker (BKSectionBlockView.swift:305-351). */
const INLINE_ACCESSORIES = new Set(['image', 'overflow', 'datepicker'])

function SectionView({ block, blockId }: Props<SectionBlock>) {
  const acc = block.accessory as BlockElement | undefined
  const inline = acc && INLINE_ACCESSORIES.has(acc.type)
  const fields = block.fields ?? []
  return (
    <div className="bk-section">
      <div className="bk-section__row">
        <div className="bk-section__text">
          {block.text && textOf(block.text) !== '' && <BKText text={block.text} className="bk-section__label" />}
          {fields.length > 0 && (
            // One column: each field a full-width label, 8 pt apart (BKFields.swift:18-20,42-48,81-103)
            <div className="bk-fields">
              {fields.map((f, i) => (
                <BKText key={i} text={f} className="bk-field" />
              ))}
            </div>
          )}
        </div>
        {inline && <Accessory el={acc} blockId={blockId} inline />}
      </div>
      {acc && !inline && (
        <div className="bk-section__accessory">
          <Accessory el={acc} blockId={blockId} />
        </div>
      )}
    </div>
  )
}

/** A section accessory or actions element (§3.1 table, §3.6). */
function Accessory({ el, blockId, inline }: { el: BlockElement; blockId: string; inline?: boolean }) {
  switch (el.type) {
    case 'image':
      return <BKImageElement el={el} className="bk-thumbnail" />
    case 'button':
    case 'workflow_button':
      return <BKButton el={el} blockId={blockId} fill={!inline} />
    case 'overflow':
      return <BKOverflow el={el} blockId={blockId} inline={inline} />
    case 'checkboxes':
    case 'radio_buttons':
      return <BKChoices el={el} placement={{ blockId }} />
    case 'static_select':
    case 'external_select':
    case 'multi_static_select':
    case 'multi_external_select':
    case 'users_select':
    case 'multi_users_select':
    case 'channels_select':
    case 'conversations_select':
    case 'multi_channels_select':
    case 'multi_conversations_select':
    case 'datepicker':
    case 'timepicker':
    case 'datetimepicker':
      return <BKSelectButton el={el as PickableElement} blockId={blockId} inline={inline} />
    default:
      return null
  }
}

// ------------------------------------------------------------------------------------------------ header (§3.2)

/**
 * The header is one header-level text block, level 2 when it has none (BKHeaderBlockView.swift:79-91): ≤ 1 headline
 * (Black 28), 2 title (Black 22), 3 and up subtitleBold (Bold 20) (Text+Display.swift:49-61; June: none subtitle,
 * 3 subtitle, 4 bodyBold). Behind `ios_flat_message_heading_scale` (default off) the scale is flatter: subtitle,
 * bodyBlack, bodyBold.
 */
function HeaderView({ block }: Props<HeaderBlock>) {
  const level = block.level && block.level >= 1 ? Math.min(block.level, 3) : 2
  return (
    <div className={`bk-header bk-header--${level}`} role="heading" aria-level={block.level ?? 2}>
      <BKInline text={block.text} />
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ divider (§3.3)

const DividerView = (_: Props<DividerBlock>) => <div className="bk-divider" role="separator" />

// ------------------------------------------------------------------------------------------------ context (§3.4)

function ContextView({ block }: Props<ContextBlock>) {
  return (
    <div className="bk-context">
      {(block.elements ?? []).map((el, i) =>
        (el as ImageElement).type === 'image' ? (
          <BKImageElement key={i} el={el as ImageElement} className="bk-context__image" />
        ) : (
          <BKText key={i} text={el as TextObject} className="bk-context__text" />
        ),
      )}
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ image (§3.5)

/** SKExpandedAttachment (SKExpandedAttachment.swift:68-89,399-418,517-535): full width; height = displayed width × the
 * image's ratio (5 / 8 when unknown), between 30 and 400; aspect-fit when the size is known, aspect-fill otherwise. */
function ImageView({ block }: Props<ImageBlock>) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const known = block.image_width && block.image_height ? { w: block.image_width, h: block.image_height } : null
  const size = known ?? natural
  const src = block.image_url ?? block.slack_file?.url
  const title = block.title ? textOf(block.title) : ''
  return (
    <div className="bk-image">
      {title && (
        <div className="bk-image__title">
          <BKInline text={block.title} />
        </div>
      )}
      <ImageFrame src={src} alt={block.alt_text} size={size} known={!!known} failed={failed} onLoad={(w, h) => setNatural({ w, h })} onError={() => setFailed(true)} />
    </div>
  )
}

function ImageFrame({ src, alt, size, known, failed, onLoad, onError }: { src?: string; alt: string; size: { w: number; h: number } | null; known: boolean; failed: boolean; onLoad: (w: number, h: number) => void; onError: () => void }) {
  const ratio = size && size.w > 0 ? size.h / size.w : 5 / 8
  // displayWidth = min(image width, available); the frame itself is stretched by the block's stack.
  const maxW = size ? Math.min(size.w, 400) : 400
  const style = { ['--bk-img-ratio' as string]: ratio, ['--bk-img-w' as string]: `${maxW}px` }
  return (
    <div className={`bk-image__frame${known ? ' is-fit' : ' is-fill'}`} style={style} data-tap>
      {src && !failed ? <img src={src} alt={alt} draggable={false} onLoad={(e) => onLoad(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)} onError={onError} /> : <Icon name="warning_filled" size={30} className="bk-image__error" />}
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ actions (§3.6)

/** Every element full width, stacked 8 pt apart (BKActionsBlockView.swift:18-20,62-96). */
function ActionsView({ block, blockId }: Props<ActionsBlock>) {
  return (
    <div className="bk-actions">
      {(block.elements ?? []).map((el, i) => (
        <Accessory key={('action_id' in el ? el.action_id : '') + i} el={el as BlockElement} blockId={blockId} />
      ))}
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ video (§3.10)

function VideoView({ block }: Props<VideoBlock>) {
  const by = [block.provider_name, block.author_name].filter(Boolean).join(' | ')
  return (
    <div className="bk-video">
      {by && (
        <div className="bk-video__provider">
          {block.provider_icon_url && <img className="bk-video__provider-icon" src={block.provider_icon_url} alt="" />}
          <span>{by}</span>
        </div>
      )}
      <div className={`bk-video__title${block.title_url ? ' is-link' : ''}`} onClick={() => block.title_url && window.open(block.title_url, '_blank', 'noopener')}>
        <BKInline text={block.title} />
      </div>
      <div className="bk-video__thumb" data-tap onClick={() => window.open(block.video_url, '_blank', 'noopener')}>
        <img src={block.thumbnail_url} alt={block.alt_text} draggable={false} />
        {/* the badge: play_filled + "Video", Lato Bold 13 white on #1D1C1D @70 % (BKVideoBlockView.swift:22,116,126-158) */}
        <span className="bk-video__badge">
          <Icon name="play_filled" size={16} />
          Video
        </span>
      </div>
      {block.description && (
        <div className="bk-video__description">
          <BKInline text={block.description} />
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ file (§3.11)

const prettyBytes = (n?: number) => (!n ? '' : n >= 1_000_000 ? `${Math.max(1, Math.round(n / 1_000_000))}MB` : n >= 1000 ? `${Math.round(n / 1000)}KB` : `${n}B`)

function FileView({ block }: Props<FileBlock>) {
  const f = block.file
  if (!f)
    return (
      // No access: warning.svg, "This file isn’t visible to you" (FileBlock+BKBlockConvertible.swift:38-42)
      <div className="bk-file">
        <span className="bk-file__ornament is-warning">
          <Icon name="warning" size={20} />
        </span>
        <span className="bk-file__text">
          <span className="bk-file__title">This file isn’t visible to you</span>
          <span className="bk-file__subtitle">This file is only visible to members of the conversation where it was originally shared.</span>
        </span>
      </div>
    )
  const type = f.pretty_type ?? f.filetype?.toUpperCase() ?? ''
  const subtitle = [prettyBytes(f.size), type].filter(Boolean).join(' ')
  return (
    <div className="bk-file" data-tap onClick={() => f.url && window.open(f.url, '_blank', 'noopener')}>
      <span className="bk-file__ornament">{f.icon ? <img src={f.icon} alt="" /> : <Icon name="file" size={20} />}</span>
      <span className="bk-file__text">
        <span className="bk-file__title">{f.title}</span>
        {subtitle && <span className="bk-file__subtitle">{subtitle}</span>}
      </span>
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ alert (§3.16)

const ALERT_ICONS: Record<string, string> = { default: 'slack_logo', info: 'info', success: 'check_circle', warning: 'warning', error: 'warning' }

function AlertView({ block }: Props<AlertBlock>) {
  const level = block.level && ALERT_ICONS[block.level] ? block.level : 'default'
  return (
    <div className={`bk-alert bk-alert--${level}`} role="note">
      <Icon name={ALERT_ICONS[level]} size={20} className="bk-alert__icon" />
      <BKText text={block.text} className="bk-alert__text" />
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ unknown (§3.20)

/** BKFallbackBlockView: an SKBanner, generic light, transparent style, laptop icon, 8 pt above and below. */
export function FallbackView() {
  return (
    <div className="bk-fallback">
      <SKBanner type="regular" tone="genericLight" backgroundStyle="transparent" ornament={{ icon: 'laptop' }} heading="Not available on mobile yet" text="Open Slack desktop to view" />
    </div>
  )
}

/** The internal loading row (modals only): a 24 pt spinner (BKLoadingBlockView.swift:69-73). */
function LoadingView() {
  return (
    <div className="bk-loading">
      <SKSpinner size="large" />
    </div>
  )
}

registerBlock('section', SectionView as never)
registerBlock('header', HeaderView as never)
registerBlock('divider', DividerView as never)
registerBlock('context', ContextView as never)
registerBlock('image', ImageView as never)
registerBlock('actions', ActionsView as never)
registerBlock('video', VideoView as never)
registerBlock('file', FileView as never)
registerBlock('alert', AlertView as never)
registerBlock('loading', LoadingView as never)
registerBlock('__fallback', FallbackView as never)
