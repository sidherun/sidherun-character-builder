import { useState } from 'react'
import { uuid } from '../utils/uuid.js'
import styles from './NotesPanel.module.css'

export default function NotesPanel({ notes, onChange, onClose }) {
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({ title: '', body: '' })

  function startNew() {
    setEditing('new')
    setDraft({ title: '', body: '' })
  }

  function startEdit(note) {
    setEditing(note.id)
    setDraft({ title: note.title, body: note.body })
  }

  function save() {
    if (!draft.title.trim()) return
    const now = new Date().toISOString()
    if (editing === 'new') {
      onChange([...notes, { id: uuid(), ...draft, lastEdited: now }])
    } else {
      onChange(notes.map(n => n.id === editing ? { ...n, ...draft, lastEdited: now } : n))
    }
    setEditing(null)
  }

  function remove(id) {
    onChange(notes.filter(n => n.id !== id))
    if (editing === id) setEditing(null)
  }

  return (
    <div className={styles.overlay} aria-hidden="true" onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-panel-heading"
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 id="notes-panel-heading">Session Notes</h3>
          <button className={styles.close} onClick={onClose} aria-label="Close session notes">✕</button>
        </div>

        {editing ? (
          <div className={styles.editor}>
            <label htmlFor="note-title" className="sr-only">Note title</label>
            <input
              id="note-title"
              className={styles.titleInput}
              placeholder="Note title…"
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            />
            <label htmlFor="note-body" className="sr-only">Note body</label>
            <textarea
              id="note-body"
              className={styles.body}
              placeholder="Note body…"
              value={draft.body}
              onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
              rows={8}
            />
            <div className={styles.editorActions}>
              <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        ) : (
          <>
            <button className={`btn-primary ${styles.newBtn}`} onClick={startNew}>+ New Note</button>
            <div className={styles.list}>
              {notes.length === 0 && <p className={styles.empty}>No notes yet.</p>}
              {notes.map(n => (
                <div key={n.id} className={styles.noteCard}>
                  <div className={styles.noteTitle}>{n.title}</div>
                  <div className={styles.noteBody}>{n.body}</div>
                  <div className={styles.noteActions}>
                    <button
                      className="btn-secondary"
                      onClick={() => startEdit(n)}
                      aria-label={`Edit note: ${n.title}`}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => remove(n.id)}
                      aria-label={`Delete note: ${n.title}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
