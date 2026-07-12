import { getOnboardingTip } from '../data/onboardingTips.jsx'
import styles from './OnboardingTip.module.css'

// First-character guide card (#onboarding). Renders nothing when the current
// wizard step has no tip. Purely presentational — on/off state and step→tip
// lookup live in App.jsx / onboardingTips.jsx.
export default function OnboardingTip({ step, onDismiss }) {
  const tip = getOnboardingTip(step)
  if (!tip) return null

  return (
    <div className={styles.card} role="note">
      <button
        type="button"
        className={styles.dismiss}
        onClick={onDismiss}
        aria-label="Hide the first-character guide"
      >
        Hide guide
      </button>
      <span className={styles.label}>First-Character Guide</span>
      <h3 className={styles.title}>{tip.title}</h3>
      <p className={styles.body}>{tip.body}</p>
      {tip.source && <span className={styles.source}>{tip.source}</span>}
    </div>
  )
}
