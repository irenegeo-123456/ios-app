import type { CSSProperties } from 'react'
import { SKTextField, type SKTextFieldProps } from './SKTextField'
import { SKButton } from './SKButton'
import { SKIconButton } from './SKIconButton'
import type { SKOrnament, SKOrnamentBoxSize } from './SKOrnamentBox'
import { cx } from './util'

// SKSearchBar (DesignerComponents/SearchBar/SKSearchBar.swift): Slack's in-page search field, an SKTextField in
// search mode with a magnifier (search, in a verySmall 20 pt SKOrnamentBox since September 2026, SKSearchBar.swift:134;
// June's was .small, 24 pt; tinted like the placeholder) on a baseSecondary fill with an outlineTertiary border;
// placeholder and ghost text contentTertiary; "Search…" (search_with_ellipsis); return key Go, no autocapitalization or
// autocorrection. Text starts at x = 48 (16 + 20 + 12; SKTextField insets unchanged). A `suggestedResult` draws the rest
// of the suggestion after the typed prefix. Spec: slackkit-components.md › SKSearchBar. (SKSearchBarButton keeps .small.)
//
// September 2026 adds (:21-369): a `leadingOrnament` in place of the magnifier (:131-135), `returnKeyType`, a trailing
// cancel control 12 pt after the field that springs in and out (`shouldShowCancelButton`, :196-268): the "Cancel"
// SKButton (.default, .toastButton), or on the Liquid Glass path a 44 pt glass ✕ (SKIconButton .svgClose in
// contentSecondary, glassStyle .regular); and that Liquid Glass path itself (the sksearchbarLiquidGlass flag or the
// unified navigation, :34-39), where the field sits in a .regular glass capsule with its own fill and border cleared
// (:146-151, :174-189).
//
//   <SKSearchBar text={query} onTextChanged={setQuery} />
//   <SKSearchBar text="Ja" suggestedResult="Jason" />
//   <SKSearchBar shouldShowSearchOrnament={false} shouldShowLoadingIndicator />
//   <SKSearchBar useLiquidGlass shouldShowCancelButton onCancelTapped={close} />

type Inherited = Pick<
  SKTextFieldProps,
  | 'text'
  | 'placeholderText'
  | 'clearButtonNormalColor'
  | 'clearButtonHighlightColor'
  | 'textFieldStandardTextColor'
  | 'shouldShowLoadingIndicator'
  | 'shouldShowShadow'
  | 'autoFocus'
  | 'onTextChanged'
  | 'onBeganEditing'
  | 'onEndedEditing'
  | 'onClearButtonTapped'
  | 'accessibilityLabel'
  | 'className'
>

interface Props extends Inherited {
  shouldShowSearchOrnament?: boolean
  /** a custom leading ornament (a search entity's icon or avatar) instead of the magnifier (September 2026) */
  leadingOrnament?: { ornament: SKOrnament; size: SKOrnamentBoxSize }
  /** the suggestion whose remainder shows as ghost text */
  suggestedResult?: string
  /** default primary.outlineTertiary */
  borderColor?: string
  /** default primary.contentTertiary */
  textFieldPlaceholderTextColor?: string
  /** default primary.contentTertiary */
  ghostTextColor?: string
  /** default primary.baseSecondary */
  textFieldBackgroundColor?: string
  /** default Go (September 2026: configurable, e.g. Search) */
  returnKeyType?: SKTextFieldProps['returnKeyType']
  /** the trailing cancel control (September 2026) */
  shouldShowCancelButton?: boolean
  /** cancelTapped */
  onCancelTapped?: () => void
  /** SKSearchBar.useLiquidGlass: the glass capsule and the glass ✕ cancel button (iOS 26 with the flag or the unified
   *  navigation) */
  useLiquidGlass?: boolean
  style?: CSSProperties
}

export function SKSearchBar({
  shouldShowSearchOrnament = true,
  leadingOrnament,
  suggestedResult,
  borderColor = 'var(--dt_color_outline_tertiary)',
  textFieldPlaceholderTextColor = 'var(--dt_color_content_tertiary)',
  ghostTextColor = 'var(--dt_color_content_tertiary)',
  textFieldBackgroundColor = 'var(--dt_color_base_secondary)',
  returnKeyType = 'go',
  shouldShowCancelButton = false,
  onCancelTapped,
  useLiquidGlass = false,
  className,
  style,
  ...rest
}: Props) {
  const ornament = leadingOrnament ?? (shouldShowSearchOrnament ? { ornament: { icon: 'search', color: textFieldPlaceholderTextColor }, size: 'verySmall' as const } : undefined)
  // without the September extras the search bar is the field itself, as before
  const bare = !useLiquidGlass && !shouldShowCancelButton && !onCancelTapped
  const field = (
    <SKTextField
      {...rest}
      isSearchField
      ornament={ornament}
      ghostText={suggestedResult ? { suggestedResult, color: ghostTextColor } : undefined}
      // the glass capsule is the surface: the field's own fill and border are cleared (:146-151)
      borderColor={useLiquidGlass ? 'transparent' : borderColor}
      textFieldPlaceholderTextColor={textFieldPlaceholderTextColor}
      textFieldBackgroundColor={useLiquidGlass ? 'transparent' : textFieldBackgroundColor}
      returnKeyType={returnKeyType}
      autocapitalizationType="none"
      className={bare ? className : undefined}
      style={bare ? style : undefined}
    />
  )
  if (bare) return field
  return (
    <div className={cx('sk-search-bar', className)} style={style}>
      {useLiquidGlass ? <div className="sk-search-bar__glass">{field}</div> : field}
      <div className={cx('sk-search-bar__cancel', shouldShowCancelButton && 'is-shown')} aria-hidden={!shouldShowCancelButton}>
        {useLiquidGlass ? (
          <SKIconButton
            icon="close"
            iconColor="var(--dt_color_content_secondary)"
            selectedIconColor="var(--dt_color_content_secondary)"
            backdrop={{ unselected: 'transparent', selected: 'transparent' }}
            size="nativeMinimum"
            useGlassEffect
            accessibilityLabel="Cancel"
            onClick={onCancelTapped}
          />
        ) : (
          <SKButton title="Cancel" buttonStyle="default" size="toastButton" onClick={onCancelTapped} />
        )}
      </div>
    </div>
  )
}
