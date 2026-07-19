import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import EncounterPanel from './EncounterPanel.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const character = (id, name, hp = 30) => ({
  _rosterId: id,
  name,
  hitPoints: { total: hp, current: hp },
  attributes: { agility: { base: 10, racialMod: 0, tempMod: 0 } },
})

function memoryStorage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  }
}

function fill(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('EncounterPanel', () => {
  let container, root

  beforeEach(() => {
    vi.stubGlobal('sessionStorage', memoryStorage())
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  it('starts with roster PCs, adds an NPC, and applies armor-aware damage', async () => {
    const characters = [character('a', 'Ada'), character('b', 'Bram')]
    await act(async () => {
      root.render(
        <EncounterPanel
          characters={characters}
          seedCharacters={characters}
          onAdjustPc={() => {}}
          onActiveChange={() => {}}
        />,
      )
    })

    act(() => [...container.querySelectorAll('button')].find(b => b.textContent.includes('Start encounter')).click())
    expect(container.textContent).toContain('Ada')
    expect(container.textContent).toContain('Bram')

    act(() => [...container.querySelectorAll('button')].find(b => b.textContent.includes('Add NPC')).click())
    const form = [...container.querySelectorAll('form')].find(f => f.textContent.includes('Add combatant'))
    const inputs = form.querySelectorAll('input')
    act(() => {
      fill(inputs[0], 'Shard-Wraith')
      fill(inputs[1], '75')
      fill(inputs[2], '80')
      fill(inputs[3], '8')
      fill(inputs[4], '60')
    })
    act(() => form.requestSubmit())

    expect(container.textContent).toContain('Shard-Wraith')
    expect(container.textContent).toContain('Defense 80 · Armor 8/blow · Pool 60/60')

    const damageInput = container.querySelector('input[aria-label="HP adjustment amount for Shard-Wraith"]')
    act(() => fill(damageInput, '13'))
    act(() => damageInput.form.requestSubmit())

    expect(container.textContent).toContain('70/75')
    expect(container.textContent).toContain('Pool 52/60')
    expect(container.textContent).toContain('8 blocked · 5 to HP')
  })

  it('restores an active encounter from session storage', async () => {
    sessionStorage.setItem('sidherun_encounter_v1', JSON.stringify({
      active: true,
      currentId: 'pc:a',
      combatants: [{ id: 'pc:a', type: 'pc', rosterId: 'a', name: 'Ada', initiative: 17, initiativeBonus: 10 }],
    }))
    await act(async () => {
      root.render(
        <EncounterPanel
          characters={[character('a', 'Ada')]}
          seedCharacters={[]}
          onAdjustPc={() => {}}
          onActiveChange={() => {}}
        />,
      )
    })
    expect(container.textContent).toContain('Encounter mode')
    expect(container.querySelector('input[aria-label="Initiative for Ada"]').value).toBe('17')
  })

  it('auto-populates and re-sorts matched player initiative rolls', async () => {
    sessionStorage.setItem('sidherun_encounter_v1', JSON.stringify({
      active: true,
      currentId: 'pc:a',
      combatants: [
        { id: 'pc:a', type: 'pc', rosterId: 'a', name: 'Ada', initiative: 12, initiativeBonus: 10 },
        { id: 'pc:b', type: 'pc', rosterId: 'b', name: 'Bram', initiative: 15, initiativeBonus: 10 },
      ],
    }))
    const characters = [character('a', 'Ada'), character('b', 'Bram')]
    await act(async () => {
      root.render(<EncounterPanel characters={characters} seedCharacters={[]} onAdjustPc={() => {}} initiativeRoll={null} />)
    })
    await act(async () => {
      root.render(<EncounterPanel
        characters={characters}
        seedCharacters={[]}
        onAdjustPc={() => {}}
        initiativeRoll={{ kind: 'initiative', rosterId: 'a', total: 22 }}
      />)
    })

    expect(container.querySelector('input[aria-label="Initiative for Ada"]').value).toBe('22')
    const orderedNames = [...container.querySelectorAll('article strong')].map(node => node.textContent)
    expect(orderedNames.slice(0, 2)).toEqual(['Ada', 'Bram'])
  })

  it('ignores initiative rolls for characters outside the active encounter', async () => {
    sessionStorage.setItem('sidherun_encounter_v1', JSON.stringify({
      active: true,
      currentId: 'pc:a',
      combatants: [{ id: 'pc:a', type: 'pc', rosterId: 'a', name: 'Ada', initiative: 12, initiativeBonus: 10 }],
    }))
    await act(async () => {
      root.render(<EncounterPanel
        characters={[character('a', 'Ada')]}
        seedCharacters={[]}
        onAdjustPc={() => {}}
        initiativeRoll={{ kind: 'initiative', rosterId: 'other-table', total: 99 }}
      />)
    })
    expect(container.querySelector('input[aria-label="Initiative for Ada"]').value).toBe('12')
  })
})
