import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

// Tell React this is an act() environment so state updates flush deterministically.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Hold the dice "animation" open on demand so we can observe the roll-in-flight
// window that WebGL (unavailable in jsdom) would otherwise make un-observable.
// rollDice() returns a promise we resolve manually to "settle" the dice.
const rollResolvers = []
vi.mock('../../utils/diceStage.js', () => ({
  preloadDice: vi.fn(),
  rollDice: vi.fn(() => new Promise((res) => rollResolvers.push(res))),
}))
vi.mock('../../utils/diceSound.js', () => ({
  playRollSound: vi.fn(), playSettleSound: vi.fn(), preloadSound: vi.fn(),
}))
// animationsOn=true → emitRoll takes the animated (guarded) path.
vi.mock('../../utils/diceSettings.js', () => ({
  animationsOn: true, soundOn: false, setAnimations: vi.fn(), setSound: vi.fn(),
}))
// The overlay would touch canvas/WebGL on mount; not needed for this test.
vi.mock('../DiceOverlay.jsx', () => ({ default: () => null }))

import PlayMode from './PlayMode.jsx'

const D = () => ({ skillBonus: 0, misc: 0 })
const character = () => ({
  name: 'Dulu Breac', race: 'Human', archetype: 'Druid', level: 2,
  hasMagic: false, hasPowers: false,
  attributes: Object.fromEntries(
    ['strength','agility','dexterity','endurance','constitution','intelligence',
     'wisdom','thaumaturgy','enlightenment','charisma','comeliness','fame']
      .map((a, i) => [a, { base: 8 + i }])
  ),
  hitPoints: { total: 24, current: 24 }, mana: { total: 18, current: 18 },
  storyPoints: { total: 3, current: 3 }, armor: { type: 'none', absorption: 0, remaining: 0, max: 0 },
  defense: { typical: D(), prone: D(), magic: D(), psychic: D(), other: { base: 0, skillBonus: 0, misc: 0 } },
  weapons: [{ id: 1, name: 'Quarterstaff', attribute: 'strength', attributeBonus: 3, skillBonus: 2, descriptor: '' }],
  skills: [], powers: [], crafts: [], inventory: [],
})

let container, root
beforeEach(() => {
  rollResolvers.length = 0
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const attackButton = () =>
  [...container.querySelectorAll('button')].find(b => b.textContent.trim() === 'Attack')

describe('PlayMode double-roll guard (#218/#222)', () => {
  it('ignores a second roll fired while the dice are still tumbling', async () => {
    const onRoll = vi.fn()
    await act(async () => {
      root.render(<PlayMode character={character()} onUpdate={() => {}} onExit={() => {}} onToggleNotes={() => {}} onRoll={onRoll} />)
    })

    const btn = attackButton()
    expect(btn).toBeTruthy()

    // First click starts the (held-open) animation.
    await act(async () => { btn.click() })
    expect(onRoll).toHaveBeenCalledTimes(1)
    expect(attackButton().disabled).toBe(true) // roll buttons disabled while rolling

    // Second click during the tumble must NOT fire or broadcast again.
    await act(async () => { attackButton().click() })
    expect(onRoll).toHaveBeenCalledTimes(1)

    // Settle the dice → the gate reopens and the buttons re-enable.
    await act(async () => { rollResolvers.forEach(r => r()); await Promise.resolve() })
    expect(attackButton().disabled).toBe(false)

    // A fresh roll after settling works again.
    await act(async () => { attackButton().click() })
    expect(onRoll).toHaveBeenCalledTimes(2)
  })
})
