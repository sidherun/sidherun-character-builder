import { useState, useCallback, useRef, useEffect } from 'react'
import { createDefaultCharacter } from './utils/defaultCharacter.js'
import { loadCurrent, saveCharacterToRoster, saveCurrent, loadCharacterFromRoster, getLastSaveStatus } from './utils/rosterStorage.js'
import { decodeCharacterFromURL, getPlayLinkId } from './utils/urlState.js'
import { safeParseCharacter } from './utils/characterSchema.js'
import { useAutoSave } from './hooks/useAutoSave.js'
import { useCloudSync } from './hooks/useCloudSync.js'
import { usePlayMode } from './hooks/usePlayMode.js'
import { useNotesPanel } from './hooks/useNotesPanel.js'
import { useToast } from './hooks/useToast.js'
import { useCharacterManagement } from './hooks/useCharacterManagement.js'
import StepIndicator from './components/StepIndicator.jsx'
import WizardNav from './components/WizardNav.jsx'
import Toast from './components/Toast.jsx'
import NotesPanel from './components/NotesPanel.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Step1Welcome from './components/steps/Step1Welcome.jsx'
import Step2Identity from './components/steps/Step2Identity.jsx'
import Step3Attributes from './components/steps/Step3Attributes.jsx'
import Step4Combat from './components/steps/Step4Combat.jsx'
import Step5Powers from './components/steps/Step5Powers.jsx'
import Step6Magic from './components/steps/Step6Magic.jsx'
import Step7Skills from './components/steps/Step7Skills.jsx'
import Step8Resources from './components/steps/Step8Resources.jsx'
import Step9Review from './components/steps/Step9Review.jsx'
import PlayMode from './components/steps/PlayMode.jsx'
import styles from './App.module.css'

const STEP_COMPONENTS = {
  1: Step1Welcome,
  2: Step2Identity,
  3: Step3Attributes,
  4: Step4Combat,
  5: Step5Powers,
  6: Step6Magic,
  7: Step7Skills,
  8: Step8Resources,
  9: Step9Review,
}

// Returns which wizard steps are visible given hasPowers/hasMagic
function visibleSteps(hasPowers, hasMagic) {
  return [1, 2, 3, 4,
    ...(hasPowers ? [5] : []),
    ...(hasMagic  ? [6] : []),
    7, 8, 9]
}

export default function App({ onNavigate, shareMode, playMode, theme, onToggleTheme }) {
  const [character, setCharacter] = useState(() => {
    if (shareMode || playMode) {
      const data = decodeCharacterFromURL()
      if (data) {
        const result = safeParseCharacter(data)
        if (result.success) {
          if (playMode) {
            // Map this play link to a stable roster id so HP/Mana/notes persist
            // across refreshes. On refresh, resume the already-tracked copy
            // instead of re-importing the pristine URL state (which would reset
            // tracking and spawn a duplicate roster entry on every reload).
            const playId = getPlayLinkId()
            const existing = playId ? loadCharacterFromRoster(playId) : null
            if (existing) {
              saveCurrent(existing)
              return existing
            }
            const seeded = playId ? { ...result.data, _rosterId: playId } : result.data
            const saved = saveCharacterToRoster(seeded)
            saveCurrent(saved)
            return saved
          }
          return result.data
        }
      }
    }
    return loadCurrent() || createDefaultCharacter()
  })

  const { isPlayMode, enterPlayMode, exitPlayMode } = usePlayMode(playMode)
  const { isNotesOpen, toggleNotes, closeNotes }    = useNotesPanel()
  const { toasts, addToast, removeToast }           = useToast()
  const { startNew, loadFromRoster }                = useCharacterManagement(setCharacter)

  useAutoSave(character)
  useCloudSync(character)

  const update = useCallback((patch) => {
    setCharacter(prev => ({ ...prev, ...patch }))
  }, [])

  const updateNested = useCallback((path, value) => {
    setCharacter(prev => {
      const next = { ...prev }
      const keys = path.split('.')
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] }
        obj = obj[keys[i]]
      }
      obj[keys[keys.length - 1]] = value
      return next
    })
  }, [])

  const steps = visibleSteps(character.hasPowers, character.hasMagic)
  const currentStepIdx = steps.indexOf(character.wizardStep)
  const totalVisible = steps.length
  const isLastStep = currentStepIdx === steps.length - 1
  const mainRef = useRef(null)

  // Move focus to main content area when the wizard step changes
  useEffect(() => {
    mainRef.current?.focus()
  }, [character.wizardStep])

  function nextStep() {
    const nextIdx = currentStepIdx + 1
    if (nextIdx < steps.length) update({ wizardStep: steps[nextIdx] })
  }

  function prevStep() {
    const prevIdx = currentStepIdx - 1
    if (prevIdx >= 0) update({ wizardStep: steps[prevIdx] })
  }

  function goToStep(n) {
    if (steps.includes(n)) update({ wizardStep: n })
  }

  function saveToRoster() {
    const saved = saveCharacterToRoster(character)
    setCharacter(saved)
    const status = getLastSaveStatus()
    if (status === 'failed') {
      addToast('Could not save — browser storage is full. Export a JSON backup.', 'error')
    } else if (status === 'truncated') {
      addToast('Saved, but version history was trimmed (storage nearly full).', 'success')
    } else {
      addToast('Character saved to roster!', 'success')
    }
  }

  function completeCharacter() {
    saveCharacterToRoster(character)
    onNavigate('roster')
  }

  if (isPlayMode) {
    return (
      <ErrorBoundary>
        <PlayMode
          character={character}
          onUpdate={update}
          onExit={exitPlayMode}
          onToggleNotes={toggleNotes}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
        {isNotesOpen && (
          <NotesPanel
            notes={character._notes}
            onChange={notes => update({ _notes: notes })}
            onClose={closeNotes}
          />
        )}
        <Toast toasts={toasts} onRemove={removeToast} />
      </ErrorBoundary>
    )
  }

  const StepComponent = STEP_COMPONENTS[character.wizardStep]
  const isFirstStep = character.wizardStep === 1

  return (
    <ErrorBoundary>
      <div className={styles.app}>
        <a href="#main-content" className="skip-link">Skip to main content</a>

        {isFirstStep ? (
          <main
            id="main-content"
            className={styles.mainFullBleed}
            ref={mainRef}
            tabIndex={-1}
            aria-label="Character creation step"
          >
            <StepComponent
              character={character}
              onUpdate={update}
              onUpdateNested={updateNested}
              onSetCharacter={setCharacter}
              onNavigate={onNavigate}
              onStartNew={startNew}
              onLoadFromRoster={loadFromRoster}
              onEnterPlayMode={enterPlayMode}
              onSaveToRoster={saveToRoster}
              addToast={addToast}
            />
          </main>
        ) : (
          <div className={styles.page}>
            <div className={styles.wizardCard}>
              <header className={styles.header}>
                <button
                  className={styles.brand}
                  onClick={() => goToStep(1)}
                  aria-label="Sidherun Character Builder — return to welcome screen"
                >
                  <span className={styles.brandName}>Sidherun</span>
                  <span className={styles.brandSub}>Character Builder</span>
                </button>
                <div className={styles.headerActions}>
                  <button className={styles.headerBtn} onClick={onToggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
                  <button className={styles.headerBtn} onClick={() => onNavigate('roster')}>Roster</button>
                  <button className={styles.headerBtn} onClick={toggleNotes}>Notes</button>
                </div>
              </header>

              <StepIndicator
                current={character.wizardStep}
                hasPowers={character.hasPowers}
                hasMagic={character.hasMagic}
                onGoTo={goToStep}
              />

              <main
                id="main-content"
                className={styles.main}
                ref={mainRef}
                tabIndex={-1}
                aria-label="Character creation step"
              >
                <StepComponent
                  character={character}
                  onUpdate={update}
                  onUpdateNested={updateNested}
                  onSetCharacter={setCharacter}
                  onNavigate={onNavigate}
                  onStartNew={startNew}
                  onLoadFromRoster={loadFromRoster}
                  onEnterPlayMode={enterPlayMode}
                  onSaveToRoster={saveToRoster}
                  addToast={addToast}
                />
              </main>

              <WizardNav
                step={currentStepIdx + 1}
                totalSteps={totalVisible}
                onBack={prevStep}
                onNext={isLastStep ? completeCharacter : nextStep}
              />
            </div>
          </div>
        )}

        {isNotesOpen && (
          <NotesPanel
            notes={character._notes}
            onChange={notes => update({ _notes: notes })}
            onClose={closeNotes}
          />
        )}
        <Toast toasts={toasts} onRemove={removeToast} />
      </div>
    </ErrorBoundary>
  )
}
