// File types and their icons and colors, as SlackKit draws them on attachment tiles and rows:
// - fileTypeIcon: SKIconManifest.icon(for:style:) (Modules/Data/Icon/Implementation/SKIconManifest+FileType.swift:52-124)
// - fileTypePrimaryColor / fileTypeSecondaryColor: the palette tile and glyph colors
//   (SlackKit/Implementation/Extensions/UIColor+FileTypeExtensions.swift:15-127)
// - fileTypeLegacyColor: the older single-color mapping thumbnails still use, UIColor.color(for:)
//   (SlackKitFoundations/Implementation/Colors/UIColor+Extensions.swift:19-96)
// - fileTypeFor: a file name or MIME type to a FileType, for prototypes.
//
//   <Icon name={fileTypeIcon('pdf')} color={fileTypeSecondaryColor('pdf')} />   on fileTypePrimaryColor('pdf')

export type SKFileType =
  | 'jpg'
  | 'jpeg'
  | 'png'
  | 'gif'
  | 'tiff'
  | 'bmp'
  | 'ico'
  | 'cur'
  | 'xbm'
  | 'heic'
  | 'webp'
  | 'mp3'
  | 'wav'
  | 'ogg'
  | 'aac'
  | 'm4a'
  | 'm4r'
  | 'webm'
  | 'mov'
  | 'mp4'
  | 'mpv'
  | 'threeGP'
  | 'pdf'
  | 'email'
  | 'binary'
  | 'numbers'
  | 'canvas'
  | 'html'
  | 'key'
  | 'pages'
  | 'rtf'
  | 'gpres'
  | 'gsheet'
  | 'gdoc'
  | 'doc'
  | 'docx'
  | 'xls'
  | 'xlsx'
  | 'xlsm'
  | 'csv'
  | 'ppt'
  | 'pptx'
  | 'php'
  | 'css'
  | 'text'
  | 'psd'
  | 'gform'
  | 'paper'
  | 'papert'
  | 'ai'
  | 'inDesign'
  | 'flash'
  | 'swf'
  | 'list'
  | 'markdown'
  | 'ipa'
  | 'apk'
  | 'js'
  | 'sql'
  | 'surface'
  | 'undefined'
  | 'gdraw'
  | 'sketch'
  | 'huddle'
  | 'huddleTranscript'
  /** September 2026 (BaseModels FileType.swift:89-90) */
  | 'folder'
  | 'threadShare'
  | 'sfdcRecord'
  | 'opportunity'
  | 'bolt'

const IMAGES: SKFileType[] = ['jpg', 'jpeg', 'png', 'gif', 'tiff', 'bmp', 'cur', 'xbm', 'heic', 'webp']
const AUDIO: SKFileType[] = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'm4r', 'webm']
const VIDEO: SKFileType[] = ['mov', 'mp4', 'mpv', 'threeGP']

/** SKIconManifest.icon(for:style:): the filled icon by default, the outline one for style 'unfilled' */
export function fileTypeIcon(type: SKFileType, style: 'filled' | 'unfilled' = 'filled'): string {
  const f = style === 'filled'
  if (IMAGES.includes(type)) return f ? 'image_filled' : 'image'
  if (AUDIO.includes(type)) return f ? 'sound_filled' : 'sound'
  if (VIDEO.includes(type)) return f ? 'video_filled' : 'video'
  switch (type) {
    case 'pdf':
      return f ? 'pdf_file_filled' : 'pdf_file'
    case 'email':
      return f ? 'email_filled' : 'email'
    case 'binary':
    case 'numbers':
    case 'ico':
      return 'number'
    case 'canvas':
      return f ? 'canvas_content_filled' : 'canvas_content'
    case 'html':
    case 'js':
      return 'code'
    case 'key':
    case 'pages':
    case 'rtf':
      return f ? 'file_filled' : 'file'
    case 'gpres':
      return 'presentation'
    case 'gsheet':
      return 'spreadsheet'
    case 'gdoc':
      return 'document'
    case 'doc':
    case 'docx':
      return 'brand_microsoft_word_filled'
    case 'xls':
    case 'xlsx':
    case 'xlsm':
    case 'csv':
      return 'brand_microsoft_excel_filled'
    case 'ppt':
    case 'pptx':
      return 'brand_microsoft_ppt_filled'
    case 'php':
      return 'php'
    case 'css':
      return 'css'
    case 'text':
      return 'text'
    case 'psd':
      return 'brand_adobe_ps_filled'
    case 'gform':
      return 'bulleted_list'
    case 'paper':
    case 'papert':
      return 'brand_dropbox_paper_filled'
    case 'ai':
      return 'brand_adobe_ai_filled'
    case 'inDesign':
      return 'brand_adobe_id_filled'
    case 'flash':
      return 'brand_adobe_fl_filled'
    case 'swf':
      return 'brand_adobe_swf_filled'
    case 'list':
      return f ? 'lists_filled' : 'lists'
    case 'markdown':
      return 'brand_markdown_filled'
    case 'ipa':
      return 'brand_apple_filled'
    case 'apk':
      return 'brand_android_filled'
    case 'sql':
      return 'database'
    case 'surface':
      return f ? 'gauge_filled' : 'gauge'
    case 'sfdcRecord':
      return 'sf_record_filled'
    case 'opportunity':
      return 'sf_opportunity_filled'
    case 'bolt':
      return f ? 'bolt_filled' : 'bolt'
    // September 2026 (SKIconManifest+FileType.swift:122-125)
    case 'folder':
      return f ? 'folder_filled' : 'folder'
    case 'threadShare':
      return f ? 'threads_filled' : 'threads'
    default:
      return f ? 'file_filled' : 'file'
  }
}

/** paletteColor(for:) (:55-131); nil for undefined, gdraw, sketch, huddles and (September 2026) folders and thread shares (:122-123) */
function palette(type: SKFileType): string | null {
  if (IMAGES.includes(type) || AUDIO.includes(type)) return 'ocean'
  if (VIDEO.includes(type)) return 'mojito'
  switch (type) {
    case 'pdf':
    case 'css':
    case 'inDesign':
      return 'flamingo'
    case 'email':
    case 'gdoc':
    case 'key':
    case 'pages':
    case 'rtf':
    case 'doc':
    case 'docx':
    case 'php':
    case 'text':
    case 'psd':
    case 'paper':
    case 'papert':
    case 'surface':
    case 'ico':
      return 'ocean'
    case 'binary':
    case 'ipa':
    case 'numbers':
    case 'markdown':
      return 'gray'
    case 'canvas':
      return 'lagoon'
    case 'html':
    case 'ppt':
    case 'pptx':
    case 'flash':
    case 'swf':
    case 'js':
    case 'sql':
      return 'tomato'
    case 'apk':
    case 'gsheet':
    case 'xls':
    case 'xlsx':
    case 'xlsm':
    case 'csv':
      return 'mojito'
    case 'gpres':
    case 'ai':
      return 'tangerine'
    case 'gform':
      return 'aubergine'
    case 'list':
      return 'honeycomb'
    case 'sfdcRecord':
      return 'indigo'
    case 'opportunity':
      return 'paprika'
    case 'bolt':
      return 'rose'
    default:
      return null
  }
}

/** UIColor.primaryColor(for:): the palette's _50 (_60 for bolt and Salesforce records), or primary.surfacePrimary */
export function fileTypePrimaryColor(type: SKFileType): string {
  const p = palette(type)
  if (!p) return 'var(--dt_color_surface_primary)'
  return `var(--dt_color_palettes_${p}_${type === 'bolt' || type === 'sfdcRecord' ? 60 : 50})`
}

/**
 * UIColor.secondaryColor(for:): the glyph on a primaryColor tile, the palette ColorSet's theme.contentInversePrimary
 * at the default brightness (white); basePrimary / baseInversePrimary for Salesforce records; contentSecondary with no
 * palette.
 */
export function fileTypeSecondaryColor(type: SKFileType): string {
  if (type === 'sfdcRecord') return 'var(--sk-file-sfdc-glyph)'
  return palette(type) ? 'var(--dt_color_constants_white)' : 'var(--dt_color_content_secondary)'
}

/** UIColor.color(for:) (deprecated on iOS but still what SKThumbnailAttachment's file icons use) */
export function fileTypeLegacyColor(type: SKFileType): string {
  if (IMAGES.includes(type) || VIDEO.includes(type) || AUDIO.includes(type)) return 'var(--sk_highlight_accent)'
  switch (type) {
    case 'doc':
    case 'docx':
    case 'sfdcRecord':
      return 'var(--sk_indigo)'
    case 'csv':
    case 'xls':
    case 'xlsx':
    case 'xlsm':
    case 'apk':
    case 'gsheet':
      return 'var(--sk_lilypad_green)'
    case 'ppt':
    case 'pptx':
      return 'var(--sk_just_orange)'
    case 'pdf':
    case 'inDesign':
    case 'flash':
    case 'swf':
    case 'gform':
    case 'gdraw':
      return 'var(--sk_raspberry_red)'
    case 'ai':
    case 'sketch':
    case 'opportunity':
      return 'var(--sk_reddish_orange)'
    case 'paper':
    case 'papert':
      return 'var(--sk_dropbox_blue)'
    case 'canvas':
      return 'var(--dt_color_constants_white)'
    case 'ipa':
      return 'var(--dt_color_content_tertiary)'
    case 'gpres':
      return 'var(--sk_sunshine_yellow)'
    case 'key':
    case 'numbers':
    case 'pages':
    case 'rtf':
    case 'text':
    case 'sql':
    case 'huddle':
    case 'huddleTranscript':
    case 'undefined':
    case 'folder':
    case 'threadShare':
      return 'var(--dt_color_content_secondary)'
    case 'list':
      return 'var(--list_icon_foreground)'
    case 'bolt':
      return 'var(--file_type_bolt_icon_background_color)'
    default:
      // psd, email, binary, markdown, html, js, css, php, gdoc, surface, ico
      return 'var(--sk_highlight_accent)'
  }
}

const EXTENSIONS: Record<string, SKFileType> = {
  jpg: 'jpg', jpeg: 'jpeg', png: 'png', gif: 'gif', tif: 'tiff', tiff: 'tiff', bmp: 'bmp', ico: 'ico', heic: 'heic', webp: 'webp',
  mp3: 'mp3', wav: 'wav', ogg: 'ogg', aac: 'aac', m4a: 'm4a', m4r: 'm4r', webm: 'webm',
  mov: 'mov', mp4: 'mp4', m4v: 'mp4', '3gp': 'threeGP',
  pdf: 'pdf', eml: 'email', html: 'html', htm: 'html', key: 'key', pages: 'pages', rtf: 'rtf', numbers: 'numbers',
  doc: 'doc', docx: 'docx', xls: 'xls', xlsx: 'xlsx', xlsm: 'xlsm', csv: 'csv', ppt: 'ppt', pptx: 'pptx',
  php: 'php', css: 'css', txt: 'text', psd: 'psd', ai: 'ai', indd: 'inDesign', fla: 'flash', swf: 'swf',
  md: 'markdown', ipa: 'ipa', apk: 'apk', js: 'js', ts: 'js', sql: 'sql', sketch: 'sketch', zip: 'binary', bin: 'binary',
}

/** A file name ("Q3 plan.pdf") or extension to its FileType; 'undefined' when unknown. */
export function fileTypeFor(name: string): SKFileType {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  return EXTENSIONS[ext] ?? 'undefined'
}
