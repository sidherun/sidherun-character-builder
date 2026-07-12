import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// The overlay would touch canvas/WebGL on mount; not needed for this test.
vi.mock('../../utils/diceStage.js', () => ({ preloadDice: vi.fn(), rollDice: vi.fn() }))
vi.mock('../../utils/diceSound.js', () => ({
  playRollSound: vi.fn(), playSettleSound: vi.fn(), preloadSound: vi.fn(),
}))
vi.mock('../../utils/diceSettings.js', () => ({
  animationsOn: false, soundOn: false, setAnimations: vi.fn(), setSound: vi.fn(),
}))
vi.mock('../DiceOverlay.jsx', () => ({ default: () => null }))

import PlayMode from './PlayMode.jsx'

const D = () => ({ skillBonus: 0, misc: 0 })
// Level-1 caster with Thaumaturgy 15 — the verbatim rules example (L1 vs L2 = 55,
// vs L3 the cell is red = 30 with no modifier).
const caster = () => ({
  name: 'Evie', race: 'Human', archetype: 'Wizard', level: 1,
  hasMagic: true, hasPowers: false, magicAttribute: 'thaumaturgy',
  attributes: Object.fromEntries(
    ['strength','agility','dexterity','endurance','constitution','intelligence',
     'wisdom','thaumaturgy','enlightenment','charisma','comeliness','fame']
      .map(a => [a, { base: a === 'thaumaturgy' ? 15 : 8 }])
  ),
  hitPoints: { total: 20, current: 20 }, mana: { total: 18, current: 18 },
  storyPoints: { total: 3, current: 3 }, armor: { type: 'none', absorption: 0, remaining: 0, max: 0 },
  defense: { typical: D(), prone: D(), magic: D(), psychic: D(), other: { base: 0, skillBonus: 0, misc: 0 } },
  weapons: [], skills: [], powers: [], crafts: [], inventory: [],
})

let container, root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const render = () =>
  act(() => root.render(<PlayMode character={caster()} onUpdate={() => {}} onExit={() => {}} />))
const targetSelect = () => container.querySelector('select[aria-label="Target level"]')
const setTargetLevel = (level) =>
  act(() => {
    const sel = targetSelect()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
    setter.call(sel, String(level))
    sel.dispatchEvent(new Event('change', { bubbles: true }))
  })

describe('PlayMode spell-target tile is zone-aware (#245)', () => {
  it('adds the attribute in green/yellow zones (L1 vs L2 → 55%)', async () => {
    await render()
    await setTargetLevel(2)
    expect(container.textContent).toContain('55%')
    expect(container.textContent).not.toContain('Red zone')
  })

  it('red zone shows the raw base and says the attribute is not added (L1 vs L3 → 30%)', async () => {
    await render()
    await setTargetLevel(3)
    expect(container.textContent).toContain('30%')
    expect(container.textContent).toContain('Red zone')
    expect(container.textContent).toContain('not added')
  })
})

describe('PlayMode per-craft Cast flow (#237)', () => {
  const withCraft = () => ({
    ...caster(),
    crafts: [{ id: 'c1', name: 'Arcane', attributeName: 'Intelligence', attributeValue: 15, skillBonus: 0, misc: 0, description: '' }],
  })
  const castButton = () =>
    [...container.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cast')

  it('renders a Cast button per craft and deducts the interim mana cost', async () => {
    const updates = []
    await act(() => root.render(
      <PlayMode character={{ ...withCraft(), mana: { total: 18, current: 10 } }}
        onUpdate={(p) => updates.push(p)} onExit={() => {}} />,
    ))
    expect(castButton()).toBeTruthy()
    // Enter an interim mana cost of 3, then cast.
    const costInput = container.querySelector('input[aria-label*="Mana cost"]')
    await act(() => {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      set.call(costInput, '3')
      costInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(() => { castButton().click() })
    // Banner resolves pass/fail and records the deduction; mana drops 10 → 7.
    expect(container.textContent).toMatch(/Success|Miss/)
    expect(container.textContent).toContain('−3 mana')
    const manaUpdate = updates.find(p => p.mana)
    expect(manaUpdate.mana.current).toBe(7)
  })

  it('casts without deduction when no cost is entered', async () => {
    const updates = []
    await act(() => root.render(
      <PlayMode character={{ ...withCraft(), mana: { total: 18, current: 10 } }}
        onUpdate={(p) => updates.push(p)} onExit={() => {}} />,
    ))
    await act(() => { castButton().click() })
    expect(container.textContent).toMatch(/Success|Miss/)
    expect(updates.find(p => p.mana)).toBeUndefined()
  })
})
