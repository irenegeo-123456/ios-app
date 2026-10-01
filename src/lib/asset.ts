// Public files (public/: Slack's CSS and images, the kit's assets, avatars, emoji) are addressed by root-relative
// paths such as '/kit/logos/acme.png', in data and in markup, the way the live client addresses its CDN. A build
// hosted under a sub-path (BASE_PATH=/<owner>/<repo>/, see vite.config.ts) needs its base in front of them, so
// every place that hands a URL to the browser (an <img src>, a CSS url(), a <link>, a fetch, a navigation) passes
// it through asset(). Data and prototypes keep writing plain '/kit/…' paths. At the default base '/' asset()
// returns its input unchanged, so the DOM is exactly what it is without a base.

// Read on every call: the build replaces it with a string literal, and tests can stub it (vi.stubEnv).
const base = () => import.meta.env.BASE_URL

/**
 * A root-relative path with the app's base in front: '/kit/logos/acme.png' → '/<owner>/<repo>/kit/logos/acme.png',
 * '/?proto=x' → '/<owner>/<repo>/?proto=x'. Anything else comes back unchanged: absolute URLs (https:, data:,
 * blob:), protocol-relative '//host/…', relative paths, and paths that already carry the base (so applying it
 * twice is safe).
 */
export function asset(path: string): string
export function asset(path: string | undefined): string | undefined
export function asset(path: string | null | undefined): string | null | undefined
export function asset(path: string | null | undefined): string | null | undefined {
  const b = base()
  if (!path || b === '/' || path[0] !== '/' || path[1] === '/' || hasBase(path, b)) return path
  return b + path.slice(1)
}

/** '/r/…' has the base '/r/'; so do '/r', '/r?x' and '/r#x'. */
function hasBase(path: string, b: string) {
  if (path.startsWith(b)) return true
  const bare = b.slice(0, -1)
  return path.startsWith(bare) && (path.length === bare.length || path[bare.length] === '?' || path[bare.length] === '#')
}

/**
 * The inverse, for routing: a pathname inside the app, without the base and starting with '/'.
 * '/<owner>/<repo>/manage/E0NRTHSTR' → '/manage/E0NRTHSTR'. A pathname outside the base comes back unchanged.
 */
export function appPath(pathname: string): string {
  const b = base()
  if (b === '/') return pathname
  const bare = b.slice(0, -1)
  if (pathname === bare) return '/'
  return pathname.startsWith(b) ? pathname.slice(bare.length) : pathname
}
