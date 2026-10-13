import { useEffect, useRef } from 'react'
import styles from './RosterMoreActions.module.css'

// A disclosure of ordinary buttons: native Enter/Space and normal Tab order.
export default function RosterMoreActions({ grouped, children }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!grouped) return
    function dismiss(event) {
      const disclosure = ref.current
      if (!disclosure?.open) return
      if (event.type === 'keydown' && event.key === 'Escape') {
        disclosure.open = false
        disclosure.querySelector('summary').focus()
      } else if (event.type === 'pointerdown' && !disclosure.contains(event.target)) {
        disclosure.open = false
      }
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    return () => {
      document.removeEventListener('keydown', dismiss)
      document.removeEventListener('pointerdown', dismiss)
    }
  }, [grouped])

  if (!grouped) return children
  return (
    <details ref={ref} className={styles.disclosure} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
    }}>
      <summary className="btn-secondary">More</summary>
      <div className={styles.panel} onClickCapture={event => {
        if (event.target.closest('button')) {
          ref.current.querySelector('summary').focus()
          ref.current.open = false
        }
      }}>
        {children}
      </div>
    </details>
  )
}
