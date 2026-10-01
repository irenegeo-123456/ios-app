// EmailAddressUtility.isValidEmailAddress (Modules/Foundation/StringExtensions/Implementation/EmailAddressUtility.swift:26-47):
// a quoted or dot-string local part, "@", then a domain with at least one dot and no "_" or "@" in its labels.

const CTRL = '\\u0000-\\u001F\\u007F'
const ADDRESS = '(?:[^.@_]+\\.)+[^.@_]+'
const QUOTED = `"(?:[^${CTRL}"\\\\]|\\\\[^${CTRL}])+"`
const ATOM = `[^${CTRL} ()<>\\[\\]:;@\\\\,."]`
const DOT_STRING = `${ATOM}+(?:\\.${ATOM}+)*`
const QUOTED_RE = new RegExp(`^${QUOTED}@${ADDRESS}$`)
const DOT_RE = new RegExp(`^${DOT_STRING}@${ADDRESS}$`)

export const isValidEmailAddress = (s: string) => QUOTED_RE.test(s) || DOT_RE.test(s)

/** WorkspaceAuthServiceConstants.commonSignupDomains (Modules/Integration/WorkspaceAuth/Interface/WorkspaceAuthServiceInterface.swift:83) */
const COMMON_SIGNUP_DOMAINS = new Set(['hotmail.com', 'outlook.com', 'yahoo.com', 'gmail.com'])

/**
 * The field's placeholder: "name@%@" with your email's domain (`invite_by_email_dynamic_placeholder`, yaml:9217), or
 * "name@example.com" (`invite_by_email_generic_placeholder`, yaml:9221) for the common sign-up domains
 * (Modules/Features/InviteEmail/Implementation/InviteEmailFeature.swift:77-84).
 */
export function emailPlaceholder(currentEmail?: string): string {
  const parts = (currentEmail ?? '').split('@')
  return parts.length === 2 && parts[1] && !COMMON_SIGNUP_DOMAINS.has(parts[1]) ? `name@${parts[1]}` : 'name@example.com'
}
