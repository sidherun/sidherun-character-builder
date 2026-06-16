import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import GMScreen from './GMScreen.jsx'
import { applyAdjust } from '../utils/gmAdjust.js'

const mk = () => ({
  _rosterId: 'r1', name: 'Hero',
  hitPoints: { total: 10, current: 10 }, mana: { total: 6, current: 4 }, storyPoints: { total: 2, current: 2 },
})

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
  afterEach(() => vi.unstubAllGlobals())
  it('renders the empty state with no saved characters', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} })
    const html = renderToStaticMarkup(<GMScreen onNavigate={() => {}} theme="dark" onToggleTheme={() => {}} />)
    expect(html).toContain('GM Screen')
    expect(html).toContain('No saved characters')
  })
})
