import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Step9Review from './Step9Review.jsx'
import { createDefaultCharacter } from '../../utils/defaultCharacter.js'

const noop = () => {}
const base = () => {
  const c = createDefaultCharacter()
  c.name = 'Sheet Test'
  return c
}

// Step9Review is both the wizard's read-only Review step AND, in manage mode,
// the editable character sheet. The difference is the onEditSection prop.
describe('Step9Review as the manage-mode character sheet', () => {
  it('shows a per-section ✎ Edit and inline inventory when onEditSection is given', () => {
    const html = renderToStaticMarkup(
      <Step9Review
        character={base()} onEnterPlayMode={noop} onSaveToRoster={noop}
        addToast={noop} onUpdate={noop} onEditSection={noop}
      />,
    )
    expect(html).toContain('✎ Edit')      // edit affordance on section headers
    expect(html).toContain('+ Add item')   // inline inventory editor
    expect(html).toContain('Resources')    // resources section header (manage only)
  })

  it('stays a read-only summary in the wizard review (no onEditSection)', () => {
    const html = renderToStaticMarkup(
      <Step9Review
        character={base()} onEnterPlayMode={noop} onSaveToRoster={noop} addToast={noop}
      />,
    )
    expect(html).not.toContain('✎ Edit')
    expect(html).not.toContain('+ Add item')
  })

  // Skills-header budget badge: under-spent shows an informational unspent cue,
  // exactly-spent shows neither cue, over-spent keeps the warning (#178).
  // Three skills so no single skill trips the per-skill cap (40 at level 3) —
  // these cases exercise only the pool total.
  const withPoints = (total) => {
    const c = base()
    c.level = 3 // pool 70
    const rest = (total - 30) / 2
    c.skills = [
      { id: 's1', name: 'Herbalism', attributeName: 'Wisdom', attributeScore: 10, skillPoints: 30 },
      { id: 's2', name: 'Perception', attributeName: 'Wisdom', attributeScore: 10, skillPoints: rest },
      { id: 's3', name: 'Foraging', attributeName: 'Wisdom', attributeScore: 10, skillPoints: rest },
    ]
    return c
  }
  const sheet = (c) => renderToStaticMarkup(
    <Step9Review
      character={c} onEnterPlayMode={noop} onSaveToRoster={noop}
      addToast={noop} onUpdate={noop} onEditSection={noop}
    />,
  )

  it('cues unspent points when under budget', () => {
    const html = sheet(withPoints(50))
    expect(html).toContain('50/70 pts')
    expect(html).toContain('+20 unspent')
    expect(html).not.toContain('over budget')
  })

  it('shows a bare used/pool when exactly on budget', () => {
    const html = sheet(withPoints(70))
    expect(html).toContain('70/70 pts')
    expect(html).not.toContain('unspent')
    expect(html).not.toContain('over budget')
  })

  it('keeps the over-budget warning, without an unspent cue', () => {
    const html = sheet(withPoints(90))
    expect(html).toContain('90/70 pts')
    expect(html).toContain('⚠ over budget')
    expect(html).not.toContain('unspent')
  })
})
