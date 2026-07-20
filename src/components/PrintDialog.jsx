import styles from './PrintDialog.module.css'

export default function PrintDialog({ mode, roster, tables, tableCounts, selection, onChoose, onConfirm, onClose }) {
  if (mode === 'confirm' && selection) {
    const count = selection.ids.length
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="print-confirm-title" onClick={e => e.stopPropagation()}>
          <h2 id="print-confirm-title">Print character sheets</h2>
          <p>Print {count} character{count === 1 ? '' : 's'} ({selection.label})?</p>
          <p className={styles.hint}>One character per page. The printable tab includes a Save as PDF option through your browser.</p>
          <div className={styles.actions}>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={onConfirm}>Print {count} sheet{count === 1 ? '' : 's'}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="print-scope-title" onClick={e => e.stopPropagation()}>
        <h2 id="print-scope-title">Print…</h2>
        <p className={styles.hint}>Choose which character sheets to include.</p>
        <div className={styles.choices}>
          <button className={styles.choice} onClick={() => onChoose({ label: 'All characters', ids: roster.map(entry => entry.id) })}>
            <strong>All characters</strong>
            <span>{roster.length} sheet{roster.length === 1 ? '' : 's'}</span>
          </button>
          {tables.map(table => {
            const count = tableCounts[table.id] || 0
            const ids = roster.filter(entry => (entry.tableIds || []).includes(table.id)).map(entry => entry.id)
            return (
              <button
                key={table.id}
                className={styles.choice}
                disabled={count === 0}
                onClick={() => onChoose({ label: table.name, ids })}
              >
                <strong>{table.name}</strong>
                <span>{count} sheet{count === 1 ? '' : 's'}</span>
              </button>
            )
          })}
        </div>
        {tables.length === 0 && <p className={styles.empty}>No named tables yet.</p>}
        <div className={styles.actions}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
