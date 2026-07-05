// Map a Supabase sign-in error to a player-facing message. The app is invite-only
// (shouldCreateUser: false), so an unknown email comes back as a "signups not
// allowed" error — surface that as clear guidance, not a raw API string (#209).
export function friendlyAuthError(err) {
  const msg = err?.message || ''
  const code = err?.code || ''
  if (code === 'otp_disabled' || /sign\s*-?\s*up|signup|not allowed/i.test(msg)) {
    return 'This app is invite-only. If you should have access, ask your GM to add you — then try again.'
  }
  return msg || 'Could not send the sign-in link. Try again.'
}
