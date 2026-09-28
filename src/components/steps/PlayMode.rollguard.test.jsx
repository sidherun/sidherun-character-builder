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
  _rosterId: 'r-dulu', name: 'Dulu Breac', race: 'Human', archetype: 'Druid', level: 2,
  hasMagic: false, hasPowers: false,
  attributes: Object.fromEntries(
    ['strength','agility','dexterity','endurance','constitution','intelligence',
     'wisdom','thaumaturgy','enlightenment','charisma','comeliness','fame']
      .map((a, i) => [a, { base: 8 + i }])
  ),
  hitPoints: { total: 24, current: 24 }, mana: { total: 18, current: 18 },
  storyPoints: { total: 3, current: 3 }, armor: { type: 'none', absorption: 0, remaining: 0, max: 0 },
  defense: { typical: D(), prone: D(), magic: D(), psychic: D(), other: { base: 0, skillBonus: 0, misc: 0 } },
  weapons: [{ id: 1, name: 'Quarterstaff', attribute: 'strength', attributeBonus: 3, skillBonus: 2,
    damageDice: '1d6', damageBonus: 2, damageType: 'blunt', isMelee: true, descriptor: '' }],
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
  vi.restoreAllMocks()
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

  it('broadcasts a bare attribute roll with its derived modifier', async () => {
    const onRoll = vi.fn()
    await act(async () => {
      root.render(<PlayMode character={character()} onUpdate={() => {}} onExit={() => {}} onToggleNotes={() => {}} onRoll={onRoll} />)
    })

    await act(async () => { container.querySelector('button[aria-label^="Roll STR attribute"]').click() })
    expect(onRoll).toHaveBeenCalledTimes(1)
    expect(onRoll.mock.calls[0][0]).toMatchObject({
      kind: 'total', label: 'STR attribute', modifier: 8,
      actor: 'Dulu Breac', rosterId: 'r-dulu',
    })

    await act(async () => { rollResolvers.forEach(r => r()); await Promise.resolve() })
  })

  it('offers one-tap structured damage after an attack settles', async () => {
    // Pin the d100 mid-range: a natural-1 fumble correctly withholds Damage,
    // which made this test fail ~1% of runs and block deploys (#315, #328).
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const onRoll = vi.fn()
    await act(async () => {
      root.render(<PlayMode character={character()} onUpdate={() => {}} onExit={() => {}} onToggleNotes={() => {}} onRoll={onRoll} />)
    })

    await act(async () => { attackButton().click() })
    const damageButton = () => [...container.querySelectorAll('button')].find(b => b.textContent.trim() === 'Damage')
    expect(damageButton()).toBeTruthy()
    expect(damageButton().disabled).toBe(true)

    await act(async () => { rollResolvers.forEach(r => r()); await Promise.resolve() })
    await act(async () => { damageButton().click() })
    expect(onRoll).toHaveBeenCalledTimes(2)
    expect(onRoll.mock.calls[1][0]).toMatchObject({ kind: 'damage', label: 'Quarterstaff damage', dice: '1d6', bonus: 2, damageType: 'blunt' })
  })

  it('broadcasts explicit d10 + AGI initiative with stable roster identity', async () => {
    const onRoll = vi.fn()
    await act(async () => {
      root.render(<PlayMode character={character()} onUpdate={() => {}} onExit={() => {}} onToggleNotes={() => {}} onRoll={onRoll} />)
    })
    const initiative = [...container.querySelectorAll('button')].find(b => b.textContent.trim() === 'Roll initiative')
    await act(async () => { initiative.click() })
    expect(onRoll).toHaveBeenCalledTimes(1)
    expect(onRoll.mock.calls[0][0]).toMatchObject({
      kind: 'initiative', label: 'Initiative', modifier: 9, rosterId: 'r-dulu', actor: 'Dulu Breac',
    })
    expect(onRoll.mock.calls[0][0].total).toBe(onRoll.mock.calls[0][0].roll + 9)
  })
})

describe('Plain Roll Dice button (#370)', () => {
  const plainButton = () => container.querySelector('button[aria-label^="Roll Dice"]')

  it('rolls an unmodified d100 in one click and broadcasts it as a plain roll', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.61) // d100 → 62
    const onRoll = vi.fn()
    await act(async () => {
      root.render(<PlayMode character={character()} onUpdate={() => {}} onExit={() => {}} onToggleNotes={() => {}} onRoll={onRoll} />)
    })
    await act(async () => { plainButton().click() })
    expect(onRoll).toHaveBeenCalledTimes(1)
    expect(onRoll.mock.calls[0][0]).toMatchObject({
      kind: 'total', label: 'Roll Dice', plain: true, roll: 62, modifier: 0, total: 62,
      actor: 'Dulu Breac', rosterId: 'r-dulu',
    })
  })

  it('respects the double-roll guard while the dice tumble', async () => {
    const onRoll = vi.fn()
    await act(async () => {
      root.render(<PlayMode character={character()} onUpdate={() => {}} onExit={() => {}} onToggleNotes={() => {}} onRoll={onRoll} />)
    })
    await act(async () => { plainButton().click() })
    expect(plainButton().disabled).toBe(true)
    await act(async () => { plainButton().click() })
    expect(onRoll).toHaveBeenCalledTimes(1)
    await act(async () => { rollResolvers.forEach(r => r()); await Promise.resolve() })
    expect(plainButton().disabled).toBe(false)
  })

  it('stays available on a read-only sheet', async () => {
    await act(async () => {
      root.render(<PlayMode character={character()} readOnly onUpdate={() => {}} onExit={() => {}} onToggleNotes={() => {}} onRoll={() => {}} />)
    })
    expect(plainButton()).toBeTruthy()
    expect(plainButton().disabled).toBe(false)
  })
})

describe('Roll banner explains its numbers (#372)', () => {
  const settle = async () => { await act(async () => { rollResolvers.forEach(r => r()); await Promise.resolve() }) }
  const banner = () => container.querySelector('[role="status"][aria-live="polite"]')

  it('names the attack value used and the one that does not stack', async () => {
    await act(async () => {
      root.render(<PlayMode character={character()} onUpdate={() => {}} onExit={() => {}} onToggleNotes={() => {}} onRoll={() => {}} />)
    })
    await act(async () => { attackButton().click() })
    await settle()
    // Quarterstaff: weapon skill 2 (used), Strength 3 (ignored — non-stacking).
    expect(banner().textContent).toContain('+2 = weapon skill 2')
    expect(banner().textContent).toContain("Strength 3 not added (doesn't stack)")
  })

  it('names Agility as the initiative modifier', async () => {
    await act(async () => {
      root.render(<PlayMode character={character()} onUpdate={() => {}} onExit={() => {}} onToggleNotes={() => {}} onRoll={() => {}} />)
    })
    const init = [...container.querySelectorAll('button')].find(b => b.textContent.trim() === 'Roll initiative')
    await act(async () => { init.click() })
    await settle()
    expect(banner().textContent).toContain('+9 = Agility 9')
  })

  it('says GM conditions were not included, and sends that to the feed', async () => {
    const onRoll = vi.fn()
    const c = { ...character(), conditions: [{ id: 'x', label: 'Frightened', modifier: -10 }, { id: 'y', label: 'Prone', modifier: null }] }
    await act(async () => {
      root.render(<PlayMode character={c} onUpdate={() => {}} onExit={() => {}} onToggleNotes={() => {}} onRoll={onRoll} />)
    })
    await act(async () => { attackButton().click() })
    await settle()
    expect(onRoll.mock.calls[0][0].conditionNote).toBe('Not included: −10 Frightened')
    expect(banner().textContent).toContain('Not included: −10 Frightened')
  })

  it('attack buttons say the modifier is included, with the breakdown on hover', async () => {
    await act(async () => {
      root.render(<PlayMode character={character()} onUpdate={() => {}} onExit={() => {}} onToggleNotes={() => {}} onRoll={() => {}} />)
    })
    expect(attackButton().getAttribute('aria-label')).toBe('Attack with Quarterstaff: d100 + 2, modifier included')
    expect(attackButton().title).toBe("d100 + 2 (weapon skill 2) · Strength 3 not added (doesn't stack)")
  })
})
