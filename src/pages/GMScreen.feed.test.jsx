import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Turn the cloud feed on and capture the subscriber so the test can push rolls.
let pushRoll = null
vi.mock('../utils/supabaseClient.js', async (orig) => ({ ...(await orig()), cloudEnabled: true }))
vi.mock('../utils/rollFeed.js', () => ({
  subscribeRollFeed: (fn) => { pushRoll = fn; return () => {} },
  broadcastRoll: vi.fn(),
  adoptServerRoll: (entry) => entry,
}))

import GMScreen from './GMScreen.jsx'

// jsdom's storage isn't usable in this runner; same in-memory stub as GMScreen.test.jsx.
function memoryStorage() {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    clear: () => m.clear(),
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size },
  }
}

let container, root
beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

describe('GM roll feed explains each roll (#372)', () => {
  it('shows the modifier breakdown and what was not included', async () => {
    await act(async () => { root.render(<GMScreen onNavigate={() => {}} />) })
    expect(pushRoll).toBeTypeOf('function')
    await act(async () => {
      pushRoll({
        kind: 'initiative', label: 'Initiative', actor: 'Oryn Vesh', ts: 1,
        roll: 3, modifier: 12, total: 15, parts: [{ label: 'Agility', value: 12 }],
        conditionNote: 'Not included: −10 Frightened',
      })
    })
    const feed = container.querySelector('[aria-label="Live roll feed"]')
    expect(feed.textContent).toContain('d10 3 + 12')
    expect(feed.textContent).toContain('+12 = Agility 12')
    expect(feed.textContent).toContain('Not included: −10 Frightened')
  })

  it('still renders rolls from clients without a breakdown', async () => {
    await act(async () => { root.render(<GMScreen onNavigate={() => {}} />) })
    await act(async () => {
      pushRoll({ kind: 'total', label: 'Herbalism', actor: 'Dulu', ts: 2, rolls: [62], roll: 62, modifier: 19, total: 81 })
    })
    const feed = container.querySelector('[aria-label="Live roll feed"]')
    expect(feed.textContent).toContain('d100 62 + 19')
    expect(feed.textContent).not.toContain(' = ')
  })
})
