import { useRef } from 'react'
import styles from './Step1Welcome.module.css'
import { safeParseCharacter } from '../../utils/characterSchema.js'

export default function Step1Welcome({ onUpdate, onStartNew, onNavigate, addToast }) {
  const fileRef = useRef()

  function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      let data
      try {
        data = JSON.parse(evt.target.result)
      } catch {
        addToast('Invalid JSON file.', 'error')
        return
      }
      const result = safeParseCharacter(data)
      if (result.success) {
        onUpdate(result.data)
        addToast('Character imported!', 'success')
      } else {
        const detail = result.error.issues.slice(0, 3)
          .map(i => `${i.path.join('.') || 'root'}: ${i.message}`)
          .join('; ')
        addToast(`Invalid character — ${detail}`, 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleStart() {
    onStartNew()
    onUpdate({ wizardStep: 2 })
  }

  return (
    <div className={styles.welcome}>
      <div className={styles.hero}>
        <div className={styles.ornament}>✦</div>
        <h1 className={styles.title}>Sidherun</h1>
        <p className={styles.tagline}>Character Builder</p>
        <p className={styles.desc}>
          Create, track, and play your characters in the world of Sidherun.
          Build your story, set your attributes, and bring your character to life.
        </p>
      </div>

      <div className={styles.actions}>
        <button className={`btn-primary ${styles.mainBtn}`} onClick={handleStart}>
          Begin New Character
        </button>
        <button className={`btn-secondary ${styles.actionBtn}`} onClick={() => onNavigate('roster')}>
          Load from Roster
        </button>
        <button className={`btn-secondary ${styles.actionBtn}`} onClick={() => fileRef.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />
      </div>

      <div className={styles.footer}>
        <p>Story-driven. Rule-flexible. Built for the Southern Shores.</p>
      </div>
    </div>
  )
}
