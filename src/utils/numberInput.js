// Coerce a raw <input> string to the integer we store in the model.
//
// Intermediate edit states map to 0 so the model stays numeric while the field
// keeps showing the raw string (so the user can finish typing):
//   ''  -> 0   (field cleared)
//   '-' -> 0   (just started typing a negative)
// Anything that isn't an optional leading '-' followed by digits returns null,
// signalling "don't update the model" (the keystroke is rejected). Valid values
// are clamped to min/max when provided.
export function coerceNumberInput(raw, { min, max } = {}) {
  if (raw === '' || raw === '-') return 0
  if (!/^-?\d+$/.test(raw)) return null
  let v = parseInt(raw, 10)
  if (min != null) v = Math.max(min, v)
  if (max != null) v = Math.min(max, v)
  return v
}

// What to show in the field for a given model value. Mirrors the old
// `value || ''` convention: zero shows as blank unless showZero is set (used for
// live resource readouts where "0 HP" must stay visible).
export function displayNumber(value, showZero = false) {
  if (!showZero && (value === 0 || value == null)) return ''
  return String(value)
}
