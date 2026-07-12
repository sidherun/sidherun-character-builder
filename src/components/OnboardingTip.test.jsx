import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import OnboardingTip from './OnboardingTip.jsx'
import { poolSize } from '../utils/skillPoints.js'

const noop = () => {}

describe('OnboardingTip (#onboarding)', () => {
  it('renders the title and body for a step with a tip', () => {
    const html = renderToStaticMarkup(<OnboardingTip step={1} onDismiss={noop} />)
    expect(html).toContain('Welcome to Sidherun')
    expect(html).toContain('First-Character Guide')
    expect(html).toContain('Hide the first-character guide')
  })

  it('renders nothing for a step without a tip', () => {
    const html = renderToStaticMarkup(<OnboardingTip step={99} onDismiss={noop} />)
    expect(html).toBe('')
  })

  it('the skill-step tip contains the real level-1 pool number', () => {
    const html = renderToStaticMarkup(<OnboardingTip step={7} onDismiss={noop} />)
    expect(html).toContain(String(poolSize(1)))
    expect(html).toContain('Skills (ch. 6)') // rules citation footer
  })

  it('marks the card as a note landmark', () => {
    const html = renderToStaticMarkup(<OnboardingTip step={1} onDismiss={noop} />)
    expect(html).toContain('role="note"')
  })
})
