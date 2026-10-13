import { useEffect, useRef, useState } from 'react'
import { restoreCloudCharacters } from '../utils/cloudRestore.js'
import styles from './RestoreDialog.module.css'

export default function RestoreDialog({ preview, userId, onFinish, onClose }) {
  const [mode, setMode] = useState('copy')
  const [targets, setTargets] = useState({})
  const [confirm, setConfirm] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const panel = useRef(null)
  const operation = useRef(null)
  const busyRef = useRef(false)
  useEffect(() => {
    const trigger = document.activeElement
    const controller = new AbortController()
    operation.current = controller
    panel.current?.focus()
    return () => { controller.abort(); trigger?.focus?.() }
  }, [])
  useEffect(() => { panel.current?.focus() }, [confirm, results, busy])

  const selected = Object.values(targets).filter(Boolean)
  const duplicate = new Set(selected).size !== selected.length
  const enabled = preview.characters.length > 0 && (mode === 'copy' || (selected.length > 0 && !duplicate))

  async function run() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true); setError('')
    const signal = operation.current.signal
    try {
      const outcomes = await restoreCloudCharacters({ ...preview, mode, targets, userId, signal })
      if (signal.aborted) return
      setResults(outcomes)
      const refreshError = await onFinish(outcomes)
      if (!signal.aborted && refreshError) setError(refreshError)
    } catch (err) {
      if (!signal.aborted) setError(err.message || 'Could not restore characters.')
    } finally {
      if (!signal.aborted) { setBusy(false); busyRef.current = false }
    }
  }

  function keyDown(event) {
    if (event.key === 'Escape' && !busy) { event.preventDefault(); onClose(); return }
    if (event.key !== 'Tab') return
    const controls = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')]
    const first = controls[0], last = controls.at(-1)
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      event.preventDefault(); last?.focus()
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) {
      event.preventDefault(); first?.focus()
    }
  }

  return (
    <div className={styles.overlay}>
      <section className={styles.panel} ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="restore-title" onKeyDown={keyDown}>
        <h2 id="restore-title">{results ? 'Restore results' : confirm ? 'Confirm replacement' : 'Restore characters'}</h2>
        {results ? (
          <ul>{results.map((result, index) => <li key={index}><strong>{result.name}</strong> — {result.status === 'failed' ? 'Failed: ' : ''}{result.message}</li>)}</ul>
        ) : confirm ? (
          <>
            <p>The selected characters will take the backup’s contents, including inventory, notes, HP, Mana, Story Points and armor. Ownership and player assignments stay the same.</p>
            <ul>{preview.characters.map((character, index) => targets[index] && <li key={index}>Replace <strong>{preview.existing.find(c => c._rosterId === targets[index])?.name}</strong> with backup <strong>{character.name}</strong>.</li>)}</ul>
            <p>Changes made since this backup may be lost.</p>
            <label><input type="checkbox" checked={acknowledged} disabled={busy} onChange={event => setAcknowledged(event.target.checked)} /> I want to replace the selected characters with this backup.</label>
          </>
        ) : (
          <>
            <p>{preview.characters.length} character{preview.characters.length === 1 ? '' : 's'} ready to restore.
              {preview.invalid > 0 && ` ${preview.invalid} invalid record${preview.invalid === 1 ? '' : 's'} skipped.`}
              {preview.unreadable > 0 && ` ${preview.unreadable} unreadable file${preview.unreadable === 1 ? '' : 's'} skipped.`}
            </p>
            <fieldset disabled={busy}>
              <legend>How should these characters be restored?</legend>
              <label><input type="radio" name="restore-mode" checked={mode === 'copy'} onChange={() => setMode('copy')} /> Import new copies (default)</label>
              <label><input type="radio" name="restore-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Replace existing characters</label>
            </fieldset>
            <p>{mode === 'copy' ? 'Each copy will be saved to your cloud roster. Existing characters stay unchanged.' : 'Choose the existing character to replace for each backup. Leave a row unselected to skip it.'}</p>
            <ul>{preview.characters.map((character, index) => (
              <li key={index}>
                <strong>{character.name}</strong> · Level {character.level} · HP {character.hitPoints.current}/{character.hitPoints.total}
                {mode === 'replace' && <label>Replace target for {character.name}
                  <select value={targets[index] || ''} disabled={busy} onChange={event => setTargets(previous => ({ ...previous, [index]: event.target.value }))}>
                    <option value="">Do not replace</option>
                    {preview.existing.map(target => <option key={target._rosterId} value={target._rosterId}>{target.name} · Level {target.level}{target.playerName ? ` · ${target.playerName}` : ''}</option>)}
                  </select>
                </label>}
              </li>
            ))}</ul>
            {duplicate && <p role="alert">Choose each existing character only once.</p>}
          </>
        )}
        {busy && <p role="status">Saving to the cloud…</p>}
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}>
          <button className="btn-secondary" disabled={busy} onClick={confirm && !results ? () => { setConfirm(false); setAcknowledged(false); setError('') } : onClose}>{results ? 'Done' : confirm ? 'Back' : 'Cancel'}</button>
          {!results && <button className={confirm ? 'btn-danger' : 'btn-primary'} disabled={busy || !enabled || (confirm && !acknowledged)} onClick={() => mode === 'replace' && !confirm ? setConfirm(true) : run()}>
            {confirm ? 'Replace selected characters' : mode === 'copy' ? 'Import new copies' : 'Review replacements'}
          </button>}
        </div>
      </section>
    </div>
  )
}
