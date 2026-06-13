import styles from './WizardNav.module.css'

export default function WizardNav({ step, totalSteps, onBack, onNext, onSave, canNext = true, nextLabel }) {
  const resolvedNextLabel = nextLabel || (step >= totalSteps ? 'Complete' : 'Next')
  return (
    <div className={styles.nav}>
      <button
        className="btn-secondary"
        onClick={onBack}
        disabled={step <= 1}
        aria-label="Go back to previous step"
      >
        ← Back
      </button>
      <div className={styles.center}>
        <button className={`btn-secondary ${styles.save}`} onClick={onSave} aria-label="Save character to roster">
          Save to Roster
        </button>
      </div>
      <button
        className="btn-primary"
        onClick={onNext}
        disabled={!canNext && step < totalSteps}
        aria-label={`${resolvedNextLabel} — step ${step} of ${totalSteps}`}
      >
        {nextLabel || (step >= totalSteps ? 'Complete' : 'Next →')}
      </button>
    </div>
  )
}
