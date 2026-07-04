import { useMemo } from 'react'
import { suggest } from '../utils/spellcheck.js'
import styles from './SpellSuggest.module.css'

// Non-blocking "did you mean" hint under a free-text field (#157). Shows a
// one-tap correction when `value` looks like a typo of a dictionary term, and a
// "Keep" that records the term so it stops being flagged. Renders nothing when
// the value looks fine (the common case), so it's cheap to drop next to inputs.
export default function SpellSuggest({ value, dictionary, custom = [], onAccept, onKeep }) {
  const suggestion = useMemo(
    () => suggest(value, dictionary, custom),
    [value, dictionary, custom],
  )
  if (!suggestion) return null

  return (
    <div className={styles.hint} role="status" aria-live="polite">
      <span>Did you mean </span>
      <button type="button" className={styles.accept} onClick={() => onAccept(suggestion)}>
        {suggestion}
      </button>
      <span>?</span>
      {onKeep && (
        <button
          type="button"
          className={styles.keep}
          onClick={() => onKeep(value.trim())}
          aria-label={`Keep "${value.trim()}" as spelled`}
        >
          Keep
        </button>
      )}
    </div>
  )
}
