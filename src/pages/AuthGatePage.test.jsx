import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AuthLoadingPage, AuthRecoveryPage } from './AuthGatePage.jsx'

describe('AuthGatePage', () => {
  it('shows visible status while auth is loading', () => {
    const html = renderToStaticMarkup(<AuthLoadingPage />)
    expect(html).toContain('Restoring your sign-in')
    expect(html).toContain('role="status"')
  })

  it('offers targeted sign-in recovery without suggesting app-data deletion', () => {
    const html = renderToStaticMarkup(
      <AuthRecoveryPage reason="Session restore timed out." onReset={vi.fn()} />,
    )
    expect(html).toContain('Session restore timed out.')
    expect(html).toContain('Clear saved sign-in and try again')
    expect(html).toContain('characters, roster backups, and app settings will stay')
  })
})
