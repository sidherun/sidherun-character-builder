import { describe, it, expect } from 'vitest'
import { friendlyAuthError } from './authErrors.js'

describe('friendlyAuthError (invite-only sign-in messaging)', () => {
  it('shows invite-only guidance when Supabase blocks an unknown-email sign-up', () => {
    // shouldCreateUser:false → Supabase returns this for an email with no account
    expect(friendlyAuthError({ code: 'otp_disabled', message: 'Signups not allowed for otp' }))
      .toMatch(/invite-only/i)
    expect(friendlyAuthError({ message: 'Signups not allowed for this instance' }))
      .toMatch(/invite-only/i)
  })

  it('passes through a genuine error message (e.g. rate limit / network)', () => {
    expect(friendlyAuthError({ message: 'Email rate limit exceeded' }))
      .toBe('Email rate limit exceeded')
  })

  it('falls back to a generic message when there is none', () => {
    expect(friendlyAuthError({})).toMatch(/could not send/i)
    expect(friendlyAuthError(null)).toMatch(/could not send/i)
  })
})
