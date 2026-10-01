import { describe, expect, it } from 'vitest'
import { emailPlaceholder, isValidEmailAddress } from './email'

describe('isValidEmailAddress (EmailAddressUtility)', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmailAddress('zoe@lunalab.com')).toBe(true)
    expect(isValidEmailAddress('zoe.maxwell+test@mail.lunalab.co.uk')).toBe(true)
    expect(isValidEmailAddress('"zoe maxwell"@lunalab.com')).toBe(true)
  })
  it('needs a dotted domain without underscores', () => {
    expect(isValidEmailAddress('zoe@lunalab')).toBe(false)
    expect(isValidEmailAddress('zoe@luna_lab.com')).toBe(false)
    expect(isValidEmailAddress('zoe@')).toBe(false)
  })
  it('refuses spaces and specials in the local part', () => {
    expect(isValidEmailAddress('zoe maxwell@lunalab.com')).toBe(false)
    expect(isValidEmailAddress('zoe,max@lunalab.com')).toBe(false)
    expect(isValidEmailAddress('zoe..max@lunalab.com')).toBe(false)
  })
})

describe('emailPlaceholder', () => {
  it('uses your domain unless it is a common sign-up domain', () => {
    expect(emailPlaceholder('alex.morgan@northstar-hq.com')).toBe('name@northstar-hq.com')
    expect(emailPlaceholder('alex@gmail.com')).toBe('name@example.com')
    expect(emailPlaceholder(undefined)).toBe('name@example.com')
  })
})
