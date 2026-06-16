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
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.topEdge} />

        {/* Top bar */}
        <div className={styles.topBar}>
          <div className={styles.wordmark}>
            <span className={styles.wordmarkName}>Sidherun</span>
            <span className={styles.wordmarkSub}>Character Builder</span>
          </div>
          <span className={styles.version}>v2.0</span>
        </div>

        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.glow} aria-hidden="true" />
          <div className={styles.heroContent}>
            <img
              src={`${import.meta.env.BASE_URL}sidherun-logo.png`}
              alt="Sidherun"
              className={styles.logo}
            />
            <p className={styles.desc}>
              Create, track, and play your characters in the world of Sidherun.
              Build your story, set your attributes, and bring your character to life.
            </p>
            <div className={styles.actions}>
              <button className={styles.mainBtn} onClick={handleStart}>
                Create New Character
              </button>
              <div className={styles.secondaryBtns}>
                <button className={styles.ghostBtn} onClick={() => onNavigate('roster')}>
                  Load from Roster
                </button>
                <button className={styles.ghostBtn} onClick={() => fileRef.current?.click()}>
                  Import JSON
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          Story-driven · Rule-flexible · Built for the Southern Shores
        </div>
      </div>
    </div>
  )
}
