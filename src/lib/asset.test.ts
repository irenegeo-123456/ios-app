import { afterEach, describe, expect, it, vi } from 'vitest'
import { appPath, asset } from './asset'

afterEach(() => vi.unstubAllEnvs())

describe('asset() at the default base', () => {
  it('returns every path unchanged', () => {
    for (const p of ['/kit/logos/acme.png', '/?proto=x', '/', 'https://example.com/a.png', 'data:image/png;base64,AA', ''])
      expect(asset(p)).toBe(p)
    expect(asset(undefined)).toBeUndefined()
    expect(appPath('/manage/E0NRTHSTR/people')).toBe('/manage/E0NRTHSTR/people')
  })
})

describe('asset() under a sub-path (BASE_PATH=/owner/repo/)', () => {
  const based = () => vi.stubEnv('BASE_URL', '/owner/repo/')

  it('prefixes root-relative paths, query-only paths and the root', () => {
    based()
    expect(asset('/kit/logos/acme.png')).toBe('/owner/repo/kit/logos/acme.png')
    expect(asset('/avatars/demo/alex.svg')).toBe('/owner/repo/avatars/demo/alex.svg')
    expect(asset('/?proto=project-channel')).toBe('/owner/repo/?proto=project-channel')
    expect(asset('/manage/E0NRTHSTR/people')).toBe('/owner/repo/manage/E0NRTHSTR/people')
    expect(asset('/')).toBe('/owner/repo/')
  })

  it('is idempotent', () => {
    based()
    expect(asset(asset('/kit/x.png'))).toBe('/owner/repo/kit/x.png')
    expect(asset('/owner/repo')).toBe('/owner/repo')
    expect(asset('/owner/repo?kit=assets')).toBe('/owner/repo?kit=assets')
    // a sibling path that merely starts with the same letters is not "already based"
    expect(asset('/owner/repository.png')).toBe('/owner/repo/owner/repository.png')
  })

  it('leaves absolute, protocol-relative, data:, blob: and relative URLs alone', () => {
    based()
    for (const p of ['https://a.slack-edge.com/x.png', 'http://localhost/x', '//cdn.example.com/x.png', 'data:image/svg+xml,<svg/>', 'blob:http://localhost/1', 'mailto:a@b.c', '#top', 'kit/x.png', ''])
      expect(asset(p)).toBe(p)
    expect(asset(undefined)).toBeUndefined()
    expect(asset(null)).toBeNull()
  })

  it('appPath() strips the base from a pathname', () => {
    based()
    expect(appPath('/owner/repo/manage/E0NRTHSTR/people')).toBe('/manage/E0NRTHSTR/people')
    expect(appPath('/owner/repo/')).toBe('/')
    expect(appPath('/owner/repo')).toBe('/')
    expect(appPath('/manage/E0NRTHSTR')).toBe('/manage/E0NRTHSTR')
  })
})
