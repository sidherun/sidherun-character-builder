import { stageId } from '../utils/diceStage.js'
import styles from './DiceOverlay.module.css'

// Full-screen, click-through stage the 3D dice render into. The engine mounts its
// canvas onto the inner div by id (diceStage targets it lazily on first roll).
export default function DiceOverlay() {
  return (
    <div className={styles.overlay} aria-hidden="true">
      <div id={stageId()} className={styles.stage} />
    </div>
  )
}
