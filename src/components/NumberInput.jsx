import { useState, useEffect, useRef } from 'react'
import { coerceNumberInput, displayNumber } from '../utils/numberInput.js'

// A numeric <input> that keeps a local string buffer so the user can type
// intermediate values a controlled type=number would clobber — clearing the
// field to empty, or a leading '-' before the digits of a negative. The model
// only ever receives a clamped integer. On blur the buffer resnaps to the
// canonical display of the model value.
//
// Props: value (number), onChange (number => void), min, max (optional clamps),
// showZero (show 0 instead of blank). Remaining props pass through to <input>.
export default function NumberInput({ value, onChange, min, max, showZero = false, ...rest }) {
  const [raw, setRaw] = useState(() => displayNumber(value, showZero))
  const editing = useRef(false)

  // Resync the buffer when the model value changes from the outside, but not
  // while the user is mid-edit (their in-progress string wins until blur).
  useEffect(() => {
    if (!editing.current) setRaw(displayNumber(value, showZero))
  }, [value, showZero])

  const allowNeg = min == null || min < 0
  const pattern = allowNeg ? /^-?\d*$/ : /^\d*$/

  function handleChange(e) {
    const next = e.target.value
    if (!pattern.test(next)) return // reject characters we don't allow
    editing.current = true
    setRaw(next)
    const coerced = coerceNumberInput(next, { min, max })
    if (coerced !== null) onChange(coerced)
  }

  function handleBlur(e) {
    editing.current = false
    setRaw(displayNumber(value, showZero))
    rest.onBlur?.(e)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      {...rest}
      value={raw}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  )
}
