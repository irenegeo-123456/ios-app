import type { CSSProperties } from 'react'
import { SKTextField } from './SKTextField'

// SKSearchBarButton (DesignerComponents/SearchBarButton/SKSearchBarButton.swift:19-123): a search-field-looking button
// ("Search…", "Jump to…") that opens search: an SKTextField in button mode with the search ornament tinted like the
// placeholder, a basePrimary fill (baseTertiary while pressed) and an outlineTertiary border. VoiceOver "Jump to…"
// (quick_switcher_jump_to_title), searchField trait. Spec: slackkit-components.md › SKSearchBarButton.
//
//   <SKSearchBarButton onButtonTapped={openSearch} />
//   <SKSearchBarButton placeholderText="Jump to…" />

interface Props {
  placeholderText?: string
  /** shows text instead of the placeholder */
  text?: string
  shouldShowSearchOrnament?: boolean
  borderColor?: string
  textFieldPlaceholderTextColor?: string
  textFieldStandardTextColor?: string
  textFieldBackgroundColor?: string
  selectedBackgroundColor?: string
  shouldShowLoadingIndicator?: boolean
  shouldShowShadow?: boolean
  onButtonTapped?: () => void
  className?: string
  style?: CSSProperties
}

export function SKSearchBarButton({
  placeholderText = 'Search…',
  text,
  shouldShowSearchOrnament = true,
  borderColor = 'var(--dt_color_outline_tertiary)',
  textFieldPlaceholderTextColor = 'var(--dt_color_content_tertiary)',
  textFieldStandardTextColor = 'var(--dt_color_content_primary)',
  textFieldBackgroundColor = 'var(--dt_color_base_primary)',
  selectedBackgroundColor = 'var(--dt_color_base_tertiary)',
  ...rest
}: Props) {
  return (
    <SKTextField
      {...rest}
      mode="button"
      text={text}
      placeholderText={placeholderText}
      ornament={shouldShowSearchOrnament ? { ornament: { icon: 'search', color: textFieldPlaceholderTextColor }, size: 'small' } : undefined}
      borderColor={borderColor}
      textFieldPlaceholderTextColor={textFieldPlaceholderTextColor}
      textFieldStandardTextColor={textFieldStandardTextColor}
      textFieldBackgroundColor={textFieldBackgroundColor}
      selectedBackgroundColor={selectedBackgroundColor}
      accessibilityLabel="Jump to…"
    />
  )
}
