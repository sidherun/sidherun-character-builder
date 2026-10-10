import { useState } from 'react'
import { noteTitleForSave } from '../utils/noteTitle.js'
import { uuid } from '../utils/uuid.js'
import styles from './NotesPanel.module.css'

const BACKSTORY_NOTE_ID = 'character-backstory'

export default function NotesPanel({ notes, backstory = '', onChange, onBackstoryChange, onClose }) {
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({ title: '', body: '' })
  const hasBackstory = Boolean(backstory.trim())
  const saveDisabled = editing !== BACKSTORY_NOTE_ID && !noteTitleForSave(draft)

  function startNew() {
    setEditing('new')
    setDraft({ title: '', body: '' })
  }

  function startEdit(note) {
    setEditing(note.id)
    setDraft({ title: note.title, body: note.body })
  }

  function startEditBackstory() {
    setEditing(BACKSTORY_NOTE_ID)
    setDraft({ title: 'Backstory', body: backstory })
  }

  function save() {
    if (editing === BACKSTORY_NOTE_ID) {
      onBackstoryChange(draft.body)
      setEditing(null)
      return
    }
    const title = noteTitleForSave(draft)
    if (!title) return
    const now = new Date().toISOString()
    const saved = { title, body: draft.body, lastEdited: now }
    if (editing === 'new') {
      onChange([...notes, { id: uuid(), ...saved }])
    } else {
      onChange(notes.map(n => n.id === editing ? { ...n, ...saved } : n))
    }
    setEditing(null)
  }

  function remove(id) {
    onChange(notes.filter(n => n.id !== id))
    if (editing === id) setEditing(null)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-panel-heading"
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 id="notes-panel-heading">Session Notes</h3>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close session notes">✕</button>
        </div>

        {editing ? (
          <div className={styles.editor}>
            <label htmlFor="note-title" className="sr-only">Note title</label>
            <input
              id="note-title"
              className={styles.titleInput}
              placeholder="Note title…"
              value={draft.title}
              readOnly={editing === BACKSTORY_NOTE_ID}
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
              {saveDisabled && (
                <p className={styles.saveHint} id="note-save-hint">Add a title or some note text to save.</p>
              )}
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                onClick={save}
                disabled={saveDisabled}
                aria-describedby={saveDisabled ? 'note-save-hint' : undefined}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <button type="button" className={`btn-primary ${styles.newBtn}`} onClick={startNew}>+ New Note</button>
            <div className={styles.list}>
              {!hasBackstory && notes.length === 0 && <p className={styles.empty}>No notes yet.</p>}
              {hasBackstory && (
                <div className={`${styles.noteCard} ${styles.backstoryCard}`}>
                  <div className={styles.noteHeading}>
                    <div className={styles.noteTitle}>Backstory</div>
                    <span className={styles.backstoryBadge}>Synced</span>
                  </div>
                  <div className={`${styles.noteBody} ${styles.backstoryBody}`}>{backstory}</div>
                  <div className={styles.noteActions}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={startEditBackstory}
                      aria-label="Edit character backstory"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
              {notes.map(n => (
                <div key={n.id} className={styles.noteCard}>
                  <div className={styles.noteTitle}>{n.title}</div>
                  <div className={styles.noteBody}>{n.body}</div>
                  <div className={styles.noteActions}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => startEdit(n)}
                      aria-label={`Edit note: ${n.title}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
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
