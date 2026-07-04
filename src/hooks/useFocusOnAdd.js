import { useRef } from 'react'

// Focus-on-add for repeatable row editors (inventory, weapons, skills).
//
// The pattern: when the user appends a row, the new row's first input should
// grab the keyboard, and pressing Enter in the row's last text field should
// commit and start another row — so several rows can be entered without the
// mouse (#153, #185, #189). This was hand-rolled per-section; this hook is the
// single source of truth.
//
// Usage in an editor:
//   const focus = useFocusOnAdd()
//   function addRow() {
//     const rows = [...(list || []), blankRow()]
//     focus.markLast(rows.length)   // remember the new index
//     onUpdate({ list: rows })
//   }
//   // row's first input:      ref={focus.focusRef(i)}
//   // row's last text field:  onKeyDown={focus.enterAdds(addRow)}
export function useFocusOnAdd() {
  const idx = useRef(null)

  // Call from the add handler with the NEW list length; marks the appended
  // row (last index) as the one to focus on the next render.
  const markLast = len => { idx.current = len - 1 }

  // Callback ref for a row's first input: focuses it once, on the render after
  // it became the marked row, then clears the mark so it doesn't re-steal focus.
  const focusRef = i => el => {
    if (el && idx.current === i) { el.focus(); idx.current = null }
  }

  // onKeyDown handler for a row's last text input: Enter commits the row and
  // adds a fresh one (which markLast focuses). Guard against a repeat key so a
  // held Enter doesn't spawn a burst of rows.
  const enterAdds = add => e => {
    if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); add() }
  }

  return { markLast, focusRef, enterAdds }
}
