import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { coerceNumberInput, displayNumber } from './numberInput.js'
import NumberInput from '../components/NumberInput.jsx'

describe('coerceNumberInput', () => {
  it('maps intermediate edit states to 0', () => {
    expect(coerceNumberInput('')).toBe(0)
    expect(coerceNumberInput('-')).toBe(0)
  })

  it('parses integers, including negatives', () => {
    expect(coerceNumberInput('5')).toBe(5)
    expect(coerceNumberInput('-2')).toBe(-2)
  })

  it('rejects non-integer garbage with null (no model update)', () => {
    expect(coerceNumberInput('abc')).toBeNull()
    expect(coerceNumberInput('1.5')).toBeNull()
  })

  it('clamps to min/max', () => {
    expect(coerceNumberInput('-5', { min: 0 })).toBe(0)
    expect(coerceNumberInput('200', { min: 0, max: 120 })).toBe(120)
    expect(coerceNumberInput('60', { min: 0, max: 120 })).toBe(60)
  })
})

describe('displayNumber', () => {
  it('blanks zero by default but keeps it when showZero', () => {
    expect(displayNumber(0)).toBe('')
    expect(displayNumber(0, true)).toBe('0')
    expect(displayNumber(7)).toBe('7')
    expect(displayNumber(null)).toBe('')
  })
})

describe('NumberInput render', () => {
  const render = (props) => renderToStaticMarkup(<NumberInput onChange={() => {}} {...props} />)

  it('shows blank for 0 and the value otherwise', () => {
    expect(render({ value: 0 })).toContain('value=""')
    expect(render({ value: 12 })).toContain('value="12"')
    expect(render({ value: 0, showZero: true })).toContain('value="0"')
  })
})
