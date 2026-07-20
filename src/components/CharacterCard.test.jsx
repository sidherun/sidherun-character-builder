import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import CharacterCard from './CharacterCard.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const noop = () => {}
const entry = () => ({
  id: 'abc',
  name: 'Thorin',
  playerName: 'Ed',
  race: 'dwarf',
  archetype: 'warrior',
  level: 3,
  hp: 24,
  savedAt: '2026-07-01T00:00:00.000Z',
})

// The menu is interactive (open state lives in the component), so a static
// render exercises the collapsed default: Load is the only visible action
// button and the ⋯ "more options" control is present and labelled.
describe('CharacterCard action collapsing (#158)', () => {
  let container
  let root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('shows Load as the primary action and a labelled ⋯ menu button', () => {
    const html = renderToStaticMarkup(
      <CharacterCard entry={entry()} onLoad={noop} onDelete={noop} onGetCharacter={noop} />
    )
    expect(html).toContain('>Load<')
    expect(html).toContain('More options for Thorin')
    expect(html).toContain('aria-haspopup="menu"')
  })

  it('does not surface Delete on the card face (it lives in the menu)', () => {
    const html = renderToStaticMarkup(
      <CharacterCard entry={entry()} onLoad={noop} onDelete={noop} onGetCharacter={noop} />
    )
    // Menu is closed in a static render, so no Delete control is emitted.
    expect(html).not.toContain('>Delete<')
    expect(html).not.toContain('btn-danger')
  })

  it('falls back to "Unnamed" in the menu label when name is empty', () => {
    const html = renderToStaticMarkup(
      <CharacterCard entry={{ ...entry(), name: '' }} onLoad={noop} onDelete={noop} onGetCharacter={noop} />
    )
    expect(html).toContain('More options for Unnamed')
  })

  it('shows a chip for each table the character belongs to (#175)', () => {
    const tables = [{ id: 't1', name: 'Thursday Table' }, { id: 't2', name: 'Campaign B' }]
    const html = renderToStaticMarkup(
      <CharacterCard
        entry={{ ...entry(), tableIds: ['t1'] }}
        tables={tables} onToggleTable={noop}
        onLoad={noop} onDelete={noop} onGetCharacter={noop}
      />
    )
    expect(html).toContain('Thursday Table')
    expect(html).not.toContain('Campaign B') // only member tables become chips
  })

  it('offers one-sheet printing from the ⋯ menu', () => {
    const onPrint = vi.fn()
    act(() => root.render(
      <CharacterCard entry={entry()} onLoad={noop} onDelete={noop} onGetCharacter={noop} onPrint={onPrint} />,
    ))
    act(() => container.querySelector('button[aria-label="More options for Thorin"]').click())
    const print = [...container.querySelectorAll('button')].find(button => button.textContent === 'Print sheet')
    act(() => print.click())
    expect(onPrint).toHaveBeenCalledWith('abc')
    expect(container.querySelector('[role="menu"]')).toBeNull()
  })
})
