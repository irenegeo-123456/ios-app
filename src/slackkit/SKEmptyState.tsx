import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { SKEmoji } from './SKEmoji'
import { asset } from '../lib/asset'
import { SKButton, type SKButtonState, type SKButtonStyle } from './SKButton'
import { cx } from './util'
import { useKeyboard } from '../app/keyboard/Keyboard'
import { EMPTY_STATE_ILLUSTRATIONS, type SKEmptyStateIllustration } from './illustrations'
import './empty-state.css'

// SKEmptyState (DesignerComponents/EmptyState/SKEmptyState.swift): a centered empty or error screen. A vertical
// stack, centered, inside 16 / 32 pt margins: an image (120 pt), emoji or icon (48 pt), the title (Lato Black 22,
// contentPrimary), an adjacent tag (Lato Bold 12, insets 2/4, radius 4), the body (Lato 17, contentSecondary) and a
// row of medium SKButtons 8 pt apart. 8 pt between items; 16 after an emoji or icon and after the body (the image gets
// the stack's default 8: no custom spacing after it, :118-160; measured 8 in testEmptyStateFull@3x.png). The
// decoration hides when the view is too short (:414-456). With the keyboard up (September 2026, :329-393) the stack
// moves up by half of the height the keyboard actually covers (none when the view sits above it), and if the content
// then doesn't fit only the decoration shrinks, to half its size at most; text and buttons keep their size (June moved
// it up by half the keyboard and scaled the whole stack to 0.75). Spec: slackkit-components.md › SKEmptyState.
//
//   <SKEmptyState content={{ illustration: 'activity' }} title="Nothing yet" body="…" buttons={[{ title: 'Browse' }]} />
//   <SKEmptyState content={{ icon: 'schedule_send' }} title="Great title" body="…" />
//   <SKGenericErrorEmptyState onRetry={…} />

export type SKEmptyStateContent =
  /** one of SlackKit.xcassets' illustrations (light and dark), 120 pt */
  | { illustration: SKEmptyStateIllustration }
  /** any image URL, 120 pt */
  | { image: string }
  | { emoji: string }
  /** an Icons.xcassets name, 48 pt, contentPrimary unless colored */
  | { icon: string; color?: string }

export interface SKEmptyStateButton {
  title: string
  buttonStyle?: SKButtonStyle
  state?: SKButtonState
  icon?: string
  onClick?: () => void
}

interface Props {
  content?: SKEmptyStateContent
  title?: ReactNode
  /** SKGenericEntity.AdjacentText: "APP", "TEMPLATE"… with its colors */
  adjacentText?: { text: string; textColor: string; backgroundColor: string }
  body?: ReactNode
  buttons?: SKEmptyStateButton[]
  /** default primary.basePrimary */
  backgroundColor?: string
  /** buttonTapped(index) */
  onButtonTapped?: (index: number) => void
  className?: string
  style?: CSSProperties
}

export function SKEmptyState({ content, title, adjacentText, body, buttons, backgroundColor, onButtonTapped, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const [hideDecoration, setHideDecoration] = useState(false)
  const keyboardUp = useKeyboard((k) => k.visible)
  const [avoidance, setAvoidance] = useState({ offset: 0, scale: 1 })
  // keyboardAvoidance() (:346-375): offset = half the keyboard's overlap with the view; the decoration shrinks by the
  // overflow, floored at Constants.minimumDecorationScale 0.5 (:51)
  useLayoutEffect(() => {
    const el = ref.current
    const stack = stackRef.current
    if (!el || !stack) return
    let raf = 0
    const measure = () => {
      const app = el.closest<HTMLElement>('.ios-app')
      const screen = el.closest<HTMLElement>('.ios-screen')
      const kb = keyboardUp && app && screen ? parseFloat(getComputedStyle(app).getPropertyValue('--kb-height')) || 0 : 0
      if (keyboardUp && kb === 0) {
        raf = requestAnimationFrame(measure)
        return
      }
      const r = el.getBoundingClientRect()
      const screenBottom = screen ? screen.getBoundingClientRect().bottom : r.bottom
      const obscured = kb > 0 ? Math.max(0, Math.min(r.bottom, screenBottom) - Math.max(r.top, screenBottom - kb)) : 0
      if (!obscured) return setAvoidance({ offset: 0, scale: 1 })
      const deco = stack.querySelector<HTMLElement>('.sk-empty-state__decoration')
      const base = !deco || !content ? 0 : 'image' in content || 'illustration' in content ? 120 : 48
      const current = deco ? deco.getBoundingClientRect().height : 0
      const full = stack.offsetHeight + (base - current)
      const overflow = full + 16 + 16 - (el.clientHeight - obscured)
      setAvoidance({ offset: obscured / 2, scale: overflow > 0 && base > 0 ? Math.max(0.5, (base - overflow) / base) : 1 })
    }
    measure()
    return () => cancelAnimationFrame(raf)
  }, [keyboardUp, content])
  // Hide the decoration when everything doesn't fit (shouldHideDecorationSubview, :345-385).
  useLayoutEffect(() => {
    const el = ref.current
    const stack = stackRef.current
    if (!el || !stack || !content) return
    const check = () => {
      const deco = stack.querySelector<HTMLElement>('.sk-empty-state__decoration')
      const decoH = deco ? 0 : 'image' in content || 'illustration' in content ? 120 + 8 : 48 + 16
      const need = stack.scrollHeight + decoH + 32
      setHideDecoration(el.clientHeight > 0 && el.clientHeight < need)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [content])

  const items: { key: string; node: ReactNode; after: number }[] = []
  if (content && !hideDecoration) {
    let node: ReactNode
    let after = 16
    if ('illustration' in content) {
      const ill = EMPTY_STATE_ILLUSTRATIONS[content.illustration]
      node = (
        <span className="sk-empty-state__image">
          <img className={ill.dark ? 'is-light-only' : undefined} src={asset(ill.light)} alt="" draggable={false} />
          {ill.dark && <img className="is-dark-only" src={asset(ill.dark)} alt="" draggable={false} />}
        </span>
      )
      after = 8
    } else if ('image' in content) {
      node = (
        <span className="sk-empty-state__image">
          <img src={asset(content.image)} alt="" draggable={false} />
        </span>
      )
      after = 8
    } else if ('emoji' in content) {
      node = <SKEmoji name={content.emoji} size={48} className="sk-empty-state__emoji" />
    } else {
      node = <Icon name={content.icon} size={48} color={content.color ?? 'var(--dt_color_content_primary)'} />
    }
    items.push({ key: 'decoration', node: <span className="sk-empty-state__decoration">{node}</span>, after })
  }
  if (title !== undefined && title !== null && title !== '') items.push({ key: 'title', node: <div className="sk-empty-state__title">{title}</div>, after: 8 })
  if (adjacentText)
    items.push({
      key: 'adjacent',
      node: (
        <span className="sk-empty-state__adjacent" style={{ color: adjacentText.textColor, background: adjacentText.backgroundColor }}>
          {adjacentText.text}
        </span>
      ),
      after: 8,
    })
  if (body !== undefined && body !== null && body !== '') items.push({ key: 'body', node: <div className="sk-empty-state__body">{body}</div>, after: 16 })
  const shown = (buttons ?? []).filter((b) => b.title)
  if (shown.length)
    items.push({
      key: 'buttons',
      node: (
        <div className="sk-empty-state__buttons">
          {shown.map((b, i) => (
            <SKButton
              key={i}
              title={b.title}
              buttonStyle={b.buttonStyle ?? 'outlineDefault'}
              state={b.state}
              icon={b.icon}
              size="medium"
              onClick={() => {
                b.onClick?.()
                onButtonTapped?.(i)
              }}
            />
          ))}
        </div>
      ),
      after: 0,
    })

  return (
    <div ref={ref} className={cx('sk-empty-state', className)} style={{ background: backgroundColor, ...style }}>
      <div
        ref={stackRef}
        className="sk-empty-state__stack"
        style={{ '--es-offset': `${avoidance.offset}px`, '--es-deco-scale': avoidance.scale } as CSSProperties}
      >
        {items.map((it, i) => (
          <div key={it.key} className="sk-empty-state__item" style={{ marginTop: i === 0 ? 0 : items[i - 1].after }}>
            {it.node}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * The generic error preset (SKEmptyState+GenericErrorEmptyState.swift:13-20): generic_error_empty_state, "Something Went
 * Wrong" (something_went_wrong_title), "Try again in a few minutes." (generic_error_empty_state_body), "Retry" (retry).
 */
export function SKGenericErrorEmptyState({ onRetry, className, style }: { onRetry?: () => void; className?: string; style?: CSSProperties }) {
  return (
    <SKEmptyState
      content={{ illustration: 'generic_error' }}
      title="Something Went Wrong"
      body="Try again in a few minutes."
      buttons={[{ title: 'Retry', onClick: onRetry }]}
      className={className}
      style={style}
    />
  )
}
