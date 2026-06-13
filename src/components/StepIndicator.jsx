import styles from './StepIndicator.module.css'

const STEPS = [
  { n: 1, label: 'Welcome' },
  { n: 2, label: 'Identity' },
  { n: 3, label: 'Attributes' },
  { n: 4, label: 'Combat' },
  { n: 5, label: 'Powers' },
  { n: 6, label: 'Magic' },
  { n: 7, label: 'Skills' },
  { n: 8, label: 'Resources' },
  { n: 9, label: 'Review' },
]

export default function StepIndicator({ current, hasPowers, hasMagic, onGoTo }) {
  return (
    <nav className={styles.nav}>
      {STEPS.map(({ n, label }) => {
        const isHidden = (n === 5 && !hasPowers) || (n === 6 && !hasMagic)
        if (isHidden) return null
        const isCurrent = n === current
        const isDone    = n < current
        return (
          <button
            key={n}
            className={`${styles.step} ${isCurrent ? styles.current : ''} ${isDone ? styles.done : ''}`}
            onClick={() => isDone && onGoTo(n)}
            disabled={!isDone && !isCurrent}
            title={label}
          >
            <span className={styles.num}>{isDone ? '✓' : n}</span>
            <span className={styles.label}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
