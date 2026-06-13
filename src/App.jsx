import { useState, useCallback, useRef, useEffect } from 'react'
import { createDefaultCharacter } from './utils/defaultCharacter.js'
import { loadCurrent, saveCharacterToRoster } from './utils/rosterStorage.js'
import { decodeCharacterFromURL } from './utils/urlState.js'
import { safeParseCharacter } from './utils/characterSchema.js'
import { useAutoSave } from './hooks/useAutoSave.js'
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

export default function App({ onNavigate, shareMode }) {
  const [character, setCharacter] = useState(() => {
    if (shareMode) {
      const data = decodeCharacterFromURL()
      if (data) {
        const result = safeParseCharacter(data)
        if (result.success) return result.data
      }
    }
    return loadCurrent() || createDefaultCharacter()
  })

  const { isPlayMode, enterPlayMode, exitPlayMode } = usePlayMode()
  const { isNotesOpen, toggleNotes, closeNotes }    = useNotesPanel()
  const { toasts, addToast, removeToast }           = useToast()
  const { startNew, loadFromRoster }                = useCharacterManagement(setCharacter)

  useAutoSave(character)

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
    addToast('Character saved to roster!', 'success')
  }

  if (isPlayMode) {
    return (
      <ErrorBoundary>
        <PlayMode
          character={character}
          onUpdate={update}
          onExit={exitPlayMode}
          onToggleNotes={toggleNotes}
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
        <header className={styles.header}>
          <button
            className={styles.brand}
            onClick={() => goToStep(1)}
            aria-label="Sidherun Character Builder — return to welcome screen"
          >
            <h1>Sidherun</h1>
            <span className={styles.subtitle}>Character Builder</span>
          </button>
          <div className={styles.headerActions}>
            <button className="btn-secondary" onClick={() => onNavigate('roster')}>Roster</button>
            <button className="btn-secondary" onClick={toggleNotes}>Notes</button>
          </div>
        </header>

        {!isFirstStep && (
          <StepIndicator
            current={character.wizardStep}
            hasPowers={character.hasPowers}
            hasMagic={character.hasMagic}
            onGoTo={goToStep}
          />
        )}

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

        {!isFirstStep && (
          <WizardNav
            step={currentStepIdx + 1}
            totalSteps={totalVisible}
            onBack={prevStep}
            onNext={nextStep}
            onSave={saveToRoster}
            nextLabel={character.wizardStep === 9 ? undefined : undefined}
          />
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
