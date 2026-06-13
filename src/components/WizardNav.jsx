import styles from './WizardNav.module.css'

export default function WizardNav({ step, totalSteps, onBack, onNext, onSave, canNext = true, nextLabel }) {
  return (
    <div className={styles.nav}>
      <button
        className="btn-secondary"
        onClick={onBack}
        disabled={step <= 1}
      >
        ← Back
      </button>
      <div className={styles.center}>
        <button className={`btn-secondary ${styles.save}`} onClick={onSave}>
          Save to Roster
        </button>
      </div>
      <button
        className="btn-primary"
        onClick={onNext}
        disabled={!canNext && step < totalSteps}
      >
        {nextLabel || (step >= totalSteps ? 'Complete' : 'Next →')}
      </button>
    </div>
  )
}
