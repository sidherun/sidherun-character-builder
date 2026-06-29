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
})
