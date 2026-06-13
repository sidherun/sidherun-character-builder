import { useState } from 'react'
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
      onChange([...notes, { id: crypto.randomUUID(), ...draft, lastEdited: now }])
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
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3>Session Notes</h3>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        {editing ? (
          <div className={styles.editor}>
            <input
              className={styles.titleInput}
              placeholder="Note title…"
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            />
            <textarea
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
                    <button className="btn-secondary" onClick={() => startEdit(n)}>Edit</button>
                    <button className="btn-danger" onClick={() => remove(n.id)}>Delete</button>
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
