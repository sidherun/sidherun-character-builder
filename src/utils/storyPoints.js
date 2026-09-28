// Story Points as a list of individual points, each active or spent, with a
// reason (#377). `storyPoints.entries` holds the list; `total` (row count) and
// `current` (active count) are kept alongside it so the live counter plane,
// GM screen, roster and print keep reading plain numbers.
//
// `current` syncs on the live plane (field-merged, realtime) while `entries`
// syncs with the structural data, so the two can briefly disagree — e.g. after
// a GM spends a point from another device. `storyPointRows` reconciles them:
// the live count wins, the list keeps its reasons.

import { uuid } from './uuid.js'

const blankRow = (active) => ({ id: uuid(), active, reason: '' })

// The rows to show, reconciled to the live `current` count. Characters saved
// before #377 have no list; they are shown as `total` rows with the first
// `current` active and blank reasons (nothing is written until an edit).
export function storyPointRows(sp = {}) {
  const current = Math.max(0, Number(sp.current) || 0)
  if (!Array.isArray(sp.entries)) {
    const total = Math.max(Number(sp.total) || 0, current)
    return Array.from({ length: total }, (_, i) => ({ id: `sp-${i + 1}`, active: i < current, reason: '' }))
  }
  const rows = sp.entries.map(r => ({ id: r.id, active: !!r.active, reason: r.reason || '' }))
  let active = rows.filter(r => r.active).length
  // Spent elsewhere: the most recently gained active points go first.
  for (let i = rows.length - 1; i >= 0 && active > current; i--) {
    if (rows[i].active) { rows[i].active = false; active-- }
  }
  // Restored elsewhere: re-activate the earliest spent points.
  for (let i = 0; i < rows.length && active < current; i++) {
    if (!rows[i].active) { rows[i].active = true; active++ }
  }
  while (active < current) { rows.push(blankRow(true)); active++ }
  return rows
}

// Active points first, keeping each group in the order the points were gained.
export function sortForDisplay(rows) {
  return [...rows.filter(r => r.active), ...rows.filter(r => !r.active)]
}

function withRows(sp, rows) {
  return { ...sp, entries: rows, total: rows.length, current: rows.filter(r => r.active).length }
}

// Apply one change from the Story Points modal. Ops are intents (not whole
// lists) so the GM screen can re-apply them to a freshly fetched character
// after a save conflict.
//   { type: 'toggle', id } | { type: 'reason', id, reason }
//   { type: 'add' }        | { type: 'delete', id }
export function applyStoryPointOp(sp, op) {
  const rows = storyPointRows(sp)
  switch (op.type) {
    case 'toggle':
      return withRows(sp, rows.map(r => r.id === op.id ? { ...r, active: !r.active } : r))
    case 'reason':
      return withRows(sp, rows.map(r => r.id === op.id ? { ...r, reason: op.reason } : r))
    case 'add':
      return withRows(sp, [...rows, op.id ? { id: op.id, active: true, reason: '' } : blankRow(true)])
    case 'delete':
      return withRows(sp, rows.filter(r => r.id !== op.id))
    default:
      return sp
  }
}
