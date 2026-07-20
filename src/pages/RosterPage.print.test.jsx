import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import RosterPage from './RosterPage.jsx'
import { createDefaultCharacter } from '../utils/defaultCharacter.js'
import { saveCharacterToRoster } from '../utils/rosterStorage.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const button = (container, label) => [...container.querySelectorAll('button')]
  .find(candidate => candidate.textContent.trim() === label)

function memoryStorage() {
  const values = new Map()
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  }
}

describe('RosterPage print flow', () => {
  let container
  let root
  let originalCreateObjectURL
  let originalRevokeObjectURL

  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    saveCharacterToRoster({ ...createDefaultCharacter(), name: 'Bella' })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    originalCreateObjectURL = URL.createObjectURL
    originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:print')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    if (root) act(() => root.unmount())
    container?.remove()
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows a retry message when the confirmed print tab is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    act(() => root.render(<RosterPage onNavigate={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />))

    act(() => button(container, 'Print…').click())
    act(() => button(container, 'All characters1 sheet').click())
    expect(container.textContent).toContain('Print 1 character (All characters)?')
    act(() => button(container, 'Print 1 sheet').click())

    expect(container.textContent).toContain('Print tab was blocked. Allow pop-ups for this site, then try again.')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:print')
  })
})
