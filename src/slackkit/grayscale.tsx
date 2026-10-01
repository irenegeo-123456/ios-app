import { useId } from 'react'

/**
 * ImageTransformation.grayscale: Core Image's CIColorControls with saturation 0 (ImageProcessing/Implementation/
 * GrayscaleImageProcessor.swift:20-35), used for deactivated members' avatars and grayscale emoji. Core Image works in
 * linear light, so its grays are Rec. 709 luminance in linear sRGB: lighter than CSS `grayscale(1)`, which mixes the
 * gamma-encoded values (#BB1A20 → #5F5F5F, as measured in SNAP/SKMemberAvatarSnapshotTests/
 * testDeactivatedMemberAvatarConfiguration; CSS gives #3D3D3D). An SVG filter in linearRGB does the same math.
 *
 *   const gray = useLinearGrayscale()
 *   <img style={{ filter: gray.filter }} />{gray.def}
 */
export function useLinearGrayscale() {
  const id = `sk-gray-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return {
    filter: `url(#${id})`,
    def: (
      <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden focusable="false">
        <filter id={id} colorInterpolationFilters="linearRGB">
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
    ),
  }
}
