import styles from './WizardNav.module.css'

export default function WizardNav({ step, totalSteps, onBack, onNext, canNext = true, nextLabel }) {
  const resolvedNextLabel = nextLabel || (step >= totalSteps ? 'Complete' : 'Next →')
  return (
    <div className={styles.nav}>
      <button
        className={styles.backBtn}
        onClick={onBack}
        disabled={step <= 1}
        aria-label="Go back to previous step"
      >
        ← Back
      </button>
      <span className={styles.stepCount} aria-hidden="true">
        Step {step} of {totalSteps}
      </span>
      <button
        className={styles.nextBtn}
        onClick={onNext}
        disabled={!canNext && step < totalSteps}
        aria-label={`${resolvedNextLabel} — step ${step} of ${totalSteps}`}
      >
        {resolvedNextLabel}
      </button>
    </div>
  )
}
