import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { storyPointRows, sortForDisplay } from '../utils/storyPoints.js'
import { uuid } from '../utils/uuid.js'
import styles from './StoryPoints.module.css'

// Story Points tile + modal (#377). The tile shows the number of active points;
// clicking anywhere on it opens a modal over the tile listing every point
// (active first) with a toggle and a reason. Each surface (review page, Play
// mode, GM screen) passes its own tile classes and an `onOp` handler that
// applies ops from utils/storyPoints.js.
export default function StoryPoints({
  storyPoints, onOp, readOnly = false, label = 'Story Pts', characterName,
  tileClassName, tileStyle, labelClassName, labelStyle, valueClassName, valueStyle,
}) {
  const [open, setOpen] = useState(false)
  const tileRef = useRef(null)
  const rows = storyPointRows(storyPoints)
  const active = rows.filter(r => r.active).length
  const who = characterName ? ` for ${characterName}` : ''

  function close() {
    setOpen(false)
    tileRef.current?.focus()
  }

  return (
    <div className={styles.anchor}>
      <button
        ref={tileRef}
        type="button"
        className={`${styles.tile} ${tileClassName || ''}`}
        style={tileStyle}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${label}: ${active} active${who}. Open story points`}
      >
        <span className={labelClassName} style={labelStyle}>{label}</span>
        <span className={valueClassName} style={valueStyle}>{active}</span>
      </button>
      {open && (
        <StoryPointsModal rows={rows} onOp={onOp} readOnly={readOnly} onClose={close} who={who} anchorRef={tileRef} />
      )}
    </div>
  )
}

function StoryPointsModal({ rows, onOp, readOnly, onClose, who, anchorRef }) {
  const dialogRef = useRef(null)
  const [drafts, setDrafts] = useState({})
  const [confirmId, setConfirmId] = useState(null)
  const [focusId, setFocusId] = useState(null)
  const [alignRight, setAlignRight] = useState(false)
  const sorted = sortForDisplay(rows)

  // Keep the modal on screen when the tile sits near the right edge (GM grid).
  useLayoutEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect()
    const width = dialogRef.current?.offsetWidth || 0
    if (rect && rect.left + width > window.innerWidth - 16) setAlignRight(true)
  }, [anchorRef])

  useEffect(() => { dialogRef.current?.querySelector('[data-autofocus]')?.focus() }, [])

  // A newly added point focuses its reason field so the player can type straight away.
  useEffect(() => {
    if (!focusId) return
    dialogRef.current?.querySelector(`[data-reason="${focusId}"]`)?.focus()
    setFocusId(null)
  }, [focusId, rows])

  function commitReason(id) {
    if (!(id in drafts)) return
    const row = rows.find(r => r.id === id)
    if (row && row.reason !== drafts[id]) onOp({ type: 'reason', id, reason: drafts[id] })
    setDrafts(d => { const next = { ...d }; delete next[id]; return next })
  }

  function flushAndClose() {
    for (const id of Object.keys(drafts)) {
      const row = rows.find(r => r.id === id)
      if (row && row.reason !== drafts[id]) onOp({ type: 'reason', id, reason: drafts[id] })
    }
    onClose()
  }

  function addPoint() {
    const id = uuid()
    onOp({ type: 'add', id })
    setFocusId(id)
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { e.stopPropagation(); flushAndClose(); return }
    if (e.key !== 'Tab') return
    const focusable = dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled)')
    if (!focusable.length) return
    const first = focusable[0], last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  return (
    <>
      <div className={styles.scrim} onClick={flushAndClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className={`${styles.dialog} ${alignRight ? styles.alignRight : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-dialog-title"
        onKeyDown={onKeyDown}
      >
        <h2 id="sp-dialog-title" className={styles.title}>Story Points{who}</h2>
        {sorted.length === 0 ? (
          <p className={styles.empty}>No story points yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Story Point</th>
                <th scope="col">Reason</th>
                {!readOnly && <th scope="col"><span className="sr-only">Remove</span></th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id} className={r.active ? '' : styles.spent}>
                  <td className={styles.toggleCell}>
                    <button
                      type="button"
                      className={`${styles.radio} ${r.active ? styles.radioOn : ''}`}
                      aria-pressed={r.active}
                      aria-label={`Story point ${i + 1}, ${r.active ? 'active' : 'inactive'}`}
                      onClick={() => onOp({ type: 'toggle', id: r.id })}
                      disabled={readOnly}
                      {...(i === 0 ? { 'data-autofocus': true } : {})}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className={styles.reason}
                      value={r.id in drafts ? drafts[r.id] : r.reason}
                      placeholder={readOnly ? '' : 'Why you gained it'}
                      aria-label={`Reason for story point ${i + 1}`}
                      data-reason={r.id}
                      onChange={e => setDrafts(d => ({ ...d, [r.id]: e.target.value }))}
                      onBlur={() => commitReason(r.id)}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      disabled={readOnly}
                      maxLength={200}
                    />
                  </td>
                  {!readOnly && (
                    <td className={styles.removeCell}>
                      {confirmId === r.id ? (
                        <span className={styles.confirm}>
                          <button type="button" className="btn-danger" onClick={() => { onOp({ type: 'delete', id: r.id }); setConfirmId(null) }}>
                            Delete
                          </button>
                          <button type="button" className="btn-secondary" onClick={() => setConfirmId(null)}>Keep</button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={styles.remove}
                          onClick={() => setConfirmId(r.id)}
                          aria-label={`Delete story point ${i + 1}`}
                        >×</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={styles.actions}>
          {!readOnly && (
            <button type="button" className="btn-secondary" onClick={addPoint} {...(sorted.length === 0 ? { 'data-autofocus': true } : {})}>
              + Add story point
            </button>
          )}
          <button type="button" className="btn-primary" onClick={flushAndClose}>Done</button>
        </div>
      </div>
    </>
  )
}
