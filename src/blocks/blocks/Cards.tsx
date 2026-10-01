import { Icon } from '../../icons/Icon'
import { NestedBlocks, registerBlock, useSurface } from '../surface'
import { setExpanded, useBlockState } from '../state'
import { BKText, BKInline } from '../text'
import { textOf } from '../format'
import { BKButton } from '../elements/Elements'
import { BKImageElement } from '../elements/Elements'
import { RichTextBlockView } from './RichText'
import type { CardBlock, CarouselBlock, ContainerBlock } from '../types'

// card, carousel and container (spec blockkit.md §3.13–3.15; Blocks/Card/BKCardBlockView.swift,
// Blocks/Carousel/BKCarouselBlockView.swift, Blocks/Container/BKContainerBlockView.swift).

/** A Slack icon composition object's SVG (the icon atom names are the Icons.xcassets names, `name.replace('-', '_')`). */
const slackIcon = (name: string) => name.replace(/-/g, '_')

/**
 * A card: radius 12, a 2-device-pixel outline_tertiary border, base_primary, clipped. The hero image (4:3, radius 8)
 * inset 12; the header (36 pt icon, 12 pt, title Lato Black 17 content_primary over the subtitle, Lato 17
 * content_tertiary, 2 lines: Sept, June Lato 13 content_secondary) is an SKGenericEntity with 10 pt vertical padding;
 * body Lato 17, subtext Lato 13; 12 pt padding and 12 pt between parts; the actions full width, 8 apart, 12 below the
 * content and 12 from the bottom (BKCardBlockView.swift:33-42,95-239,399-450; CardBlock+BKBlockConvertible.swift:40-66;
 * measured test_fullCard_withoutHeroImage@3x.png).
 */
export function CardView({ block, blockId, width }: { block: CardBlock; blockId: string; width?: number }) {
  const s = useSurface()
  const icon = block.icon
  const header = block.title || block.subtitle || icon || block.slack_icon
  return (
    <div className={`bk-card${s.interactive ? '' : ' is-disabled'}`} style={width ? { width } : undefined}>
      {block.hero_image && (
        <div className="bk-card__hero">
          <BKImageElement el={block.hero_image} />
        </div>
      )}
      {(header || block.body || block.subtext) && (
        <div className="bk-card__content">
          {header && (
            <div className="bk-card__header">
              {icon ? (
                <BKImageElement el={icon} className="bk-card__icon" />
              ) : block.slack_icon ? (
                <span className="bk-card__icon is-slack-icon">
                  <Icon name={slackIcon(block.slack_icon.name)} size={20} />
                </span>
              ) : null}
              <div className="bk-card__titles">
                {block.title && (
                  <div className="bk-card__title">
                    <BKInline text={block.title} />
                  </div>
                )}
                {block.subtitle && (
                  <div className="bk-card__subtitle">
                    <BKInline text={block.subtitle} />
                  </div>
                )}
              </div>
            </div>
          )}
          {block.body && textOf(block.body) && <BKText text={block.body} className="bk-card__body" />}
          {block.subtext && textOf(block.subtext) && <BKText text={block.subtext} className="bk-card__subtext" />}
        </div>
      )}
      {!!block.actions?.length && (
        <div className="bk-card__actions">
          {block.actions.map((a, i) => (
            <BKButton key={a.action_id + i} el={a} blockId={blockId} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * A carousel: a horizontal pager of cards, each min(container − 16 − 40 − 12, 320) wide and as tall as the tallest,
 * 16 pt from the leading edge, 12 pt apart, snapping a card at a time, no scroll indicator (BKCarouselBlockView.swift:15-25,81-146,179-190).
 */
function CarouselView({ block, blockId }: { block: CarouselBlock; blockId: string }) {
  return (
    <div className="bk-carousel" data-scroll-x role="list" aria-label={block.label}>
      {(block.elements ?? []).map((card, i) => (
        <div key={i} className="bk-carousel__item" role="listitem">
          <CardView block={card} blockId={card.block_id ?? `${blockId}-${i}`} />
        </div>
      ))}
    </div>
  )
}

/**
 * A container: radius 12, 1 pt outline_tertiary border, base_primary, 12 pt padding, children 8 pt apart; the header
 * (36 pt icon, 12 pt, title Lato Bold 17 content_primary over subtitle Lato 13, one line each; `rich_text_title`
 * takes the title's place with those as fallback attributes) 8 pt above the body; with `has_header_divider` a 1 pt
 * outline_tertiary line across the whole box 8 below the header and 8 above the body (Sept); collapsible ones toggle
 * on a header tap with a 20 pt caret (caret_down_full collapsed, caret_up_full expanded), `default_collapsed` sets the
 * start and later taps are remembered (BKContainerBlockView.swift:42-51,84-145,207-216,417-439;
 * BKBlockPresentationService.swift:541-567).
 */
function ContainerView({ block, blockId }: { block: ContainerBlock; blockId: string }) {
  const s = useSurface()
  const key = `${s.key}|${blockId}`
  const remembered = useBlockState((st) => st.expanded[key])
  const collapsible = !!block.is_collapsible
  const expanded = !collapsible || (remembered ?? !block.default_collapsed)
  const hasHeader = block.title || block.rich_text_title || block.subtitle || block.icon
  return (
    <div className="bk-container">
      {hasHeader && (
        <div className={`bk-container__header${collapsible ? ' is-collapsible' : ''}`} role={collapsible ? 'button' : undefined} aria-expanded={collapsible ? expanded : undefined} onClick={collapsible ? () => setExpanded(key, !expanded) : undefined}>
          {block.icon && <BKImageElement el={block.icon} className="bk-container__icon" />}
          <div className="bk-container__titles">
            {block.rich_text_title ? (
              <div className="bk-container__title">
                <RichTextBlockView block={block.rich_text_title} />
              </div>
            ) : (
              block.title && (
                <div className="bk-container__title">
                  <BKInline text={block.title} />
                </div>
              )
            )}
            {block.subtitle && (
              <div className="bk-container__subtitle">
                <BKInline text={block.subtitle} />
              </div>
            )}
          </div>
          {collapsible && <Icon name={expanded ? 'caret_up_full' : 'caret_down_full'} size={20} className="bk-container__caret" />}
        </div>
      )}
      {expanded && hasHeader && block.has_header_divider && <div className="bk-container__divider" role="separator" />}
      {expanded && (
        <div className={`bk-container__body${hasHeader ? ' has-header' : ''}`}>
          <NestedBlocks blocks={block.child_blocks ?? []} />
        </div>
      )}
    </div>
  )
}

registerBlock('card', CardView as never)
registerBlock('carousel', CarouselView as never)
registerBlock('container', ContainerView as never)
