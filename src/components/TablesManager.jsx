import { useState } from 'react'
import styles from './TablesManager.module.css'

// Create / rename / delete the GM's named tables (#175). Membership is assigned
// per-character from each roster card's ⋯ menu; this panel just manages the
// registry itself. Deleting a table also strips it from every member (handled by
// the caller via onDelete).
export default function TablesManager({ tables, counts = {}, onCreate, onRename, onDelete }) {
  const [newName, setNewName] = useState('')

  function submitNew(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    onCreate(name)
    setNewName('')
  }

  return (
    <section className={styles.panel} aria-label="Manage tables">
      <form className={styles.addRow} onSubmit={submitNew}>
        <input
          className={styles.input}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New table name (e.g. Thursday Table)"
          aria-label="New table name"
        />
        <button type="submit" className="btn-secondary" disabled={!newName.trim()}>Add table</button>
      </form>

      {tables.length === 0 ? (
        <p className={styles.empty}>No tables yet. Add one, then assign characters from each card’s ⋯ menu.</p>
      ) : (
        <ul className={styles.list}>
          {tables.map(t => (
            <li key={t.id} className={styles.row}>
              <input
                className={styles.rename}
                defaultValue={t.name}
                aria-label={`Rename ${t.name}`}
                onBlur={e => { const v = e.target.value.trim(); if (v && v !== t.name) onRename(t.id, v) }}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
              />
              <span className={styles.count}>{counts[t.id] || 0} character{(counts[t.id] || 0) === 1 ? '' : 's'}</span>
              <button
                className={styles.delete}
                onClick={() => onDelete(t.id, t.name)}
                aria-label={`Delete table ${t.name}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
