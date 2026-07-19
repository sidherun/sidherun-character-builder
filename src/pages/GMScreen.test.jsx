import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import GMScreen from './GMScreen.jsx'
import { applyAdjust } from '../utils/gmAdjust.js'
import { saveCharacterToRoster, loadCharacterFromRoster } from '../utils/rosterStorage.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mk = () => ({
  _rosterId: 'r1', name: 'Hero',
  hitPoints: { total: 10, current: 10 }, mana: { total: 6, current: 4 }, storyPoints: { total: 2, current: 2 },
})

function memoryStorage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  }
}

describe('applyAdjust', () => {
  it('adjusts HP and clamps to [0, total]', () => {
    expect(applyAdjust(mk(), 'hp', -3).hitPoints.current).toBe(7)
    expect(applyAdjust({ ...mk(), hitPoints: { total: 10, current: 1 } }, 'hp', -5).hitPoints.current).toBe(0)
    expect(applyAdjust(mk(), 'hp', +5).hitPoints.current).toBe(10) // capped at total
  })
  it('adjusts mana and story independently', () => {
    expect(applyAdjust(mk(), 'mana', +1).mana.current).toBe(5)
    expect(applyAdjust(mk(), 'sp', -1).storyPoints.current).toBe(1)
    expect(applyAdjust(mk(), 'mana', +1).hitPoints.current).toBe(10) // others untouched
  })
  it('treats a non-positive total as no cap', () => {
    expect(applyAdjust({ ...mk(), hitPoints: { total: 0, current: 0 } }, 'hp', +3).hitPoints.current).toBe(3)
  })
})

describe('GMScreen', () => {
  let container, root

  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    if (root) act(() => root.unmount())
    container?.remove()
    vi.unstubAllGlobals()
  })

  it('renders the empty state with no saved characters', () => {
    const html = renderToStaticMarkup(<GMScreen onNavigate={() => {}} theme="dark" onToggleTheme={() => {}} />)
    expect(html).toContain('GM Screen')
    expect(html).toContain('No saved characters')
  })

  it('keeps all 15 rapid HP adjustments across six character cards', async () => {
    for (let i = 1; i <= 6; i++) {
      saveCharacterToRoster({ ...mk(), _rosterId: `r${i}`, name: `Hero ${i}`, hitPoints: { total: 20, current: 20 } })
    }
    await act(async () => {
      root.render(<GMScreen onNavigate={() => {}} theme="dark" onToggleTheme={() => {}} />)
    })

    const buttons = [...container.querySelectorAll('button[aria-label^="Damage 1 HP"]')]
    expect(buttons).toHaveLength(6)

    act(() => {
      for (let i = 0; i < 15; i++) buttons[i % buttons.length].click()
    })

    for (let i = 1; i <= 6; i++) {
      // saveCharacterToRoster prepends, so cards r6/r5/r4 receive three clicks;
      // r3/r2/r1 receive two.
      const expected = i >= 4 ? 17 : 18
      expect(loadCharacterFromRoster(`r${i}`).hitPoints.current).toBe(expected)
    }
  })

  it('applies a typed 13-point hit with one form submission', async () => {
    saveCharacterToRoster({ ...mk(), _rosterId: 'r1', hitPoints: { total: 20, current: 20 } })
    await act(async () => {
      root.render(<GMScreen onNavigate={() => {}} theme="dark" onToggleTheme={() => {}} />)
    })

    const input = container.querySelector('input[aria-label="HP adjustment amount for Hero"]')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    act(() => {
      setter.call(input, '13')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => input.form.requestSubmit())

    expect(loadCharacterFromRoster('r1').hitPoints.current).toBe(7)
    expect(input.value).toBe('')
  })
})
