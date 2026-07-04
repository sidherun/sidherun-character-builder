import { useState, useCallback, useRef, useEffect } from 'react'
import { createDefaultCharacter } from './utils/defaultCharacter.js'
import { loadCurrent, saveCharacterToRoster, saveCurrent, loadCharacterFromRoster, loadRoster, getLastSaveStatus } from './utils/rosterStorage.js'
import { decodeCharacterFromURL, getPlayLinkId, parseCloudLink } from './utils/urlState.js'
import { registerCloudLink, fetchCloudCharacter, mergeRemote, rosterIdForCloudId, projectLive, dataSignature, hydrateCharacter } from './utils/cloudSync.js'
import { repoEnabled, createCharacter, getCharacter, saveCharacterData, patchLive, subscribeLive, removeLiveSubscription } from './utils/characterRepo.js'
import { useAuth, isGmOrAdmin } from './auth/useAuth.js'
import { safeParseCharacter } from './utils/characterSchema.js'
import { useAutoSave } from './hooks/useAutoSave.js'
import { useCloudSync } from './hooks/useCloudSync.js'
import { useRealtimeCharacter } from './hooks/useRealtimeCharacter.js'
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
import { broadcastRoll } from './utils/rollFeed.js'
import { trackPush } from './utils/cloudStatus.js'
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

// Step number behind each editable section on the character sheet (manage mode).
// Identity is intentionally absent — name/race/archetype are set in the builder
// only, not editable from the sheet.
const SECTION_LABELS = {
  3: 'Attributes', 4: 'Combat', 5: 'Powers', 6: 'Magic', 7: 'Skills', 8: 'Resources',
}

// Returns which wizard steps are visible given hasPowers/hasMagic
function visibleSteps(hasPowers, hasMagic) {
  return [1, 2, 3, 4,
    ...(hasPowers ? [5] : []),
    ...(hasMagic  ? [6] : []),
    7, 8, 9]
}

export default function App({ onNavigate, shareMode, playMode, theme, onToggleTheme }) {
  // Cloud link (#c=<id>~<token>): references a server row instead of embedding
  // the character. Routed to Play Mode (Router maps #c= → 'play').
  const cloud = (shareMode || playMode) ? parseCloudLink() : null
  const cloudId = cloud?.id || null
  const cloudToken = cloud?.token || null
  // If we already own this cloud character (its id is in our cloud map), reuse
  // that roster entry; otherwise it's someone else's link — make a 'cloud-<id>'
  // entry. Prevents the owner's own link from duplicating the card.
  const cloudRosterId = cloud ? (rosterIdForCloudId(cloud.id) || ('cloud-' + cloud.id)) : null

  const [character, setCharacter] = useState(() => {
    if (cloud && playMode) {
      // Render the local copy instantly if we have one (local-first); the effect
      // below refreshes from the cloud. First open shows a brief loading state.
      registerCloudLink(cloudRosterId, cloud)
      const existing = loadCharacterFromRoster(cloudRosterId)
      if (existing) { saveCurrent(existing); return existing }
      return { ...createDefaultCharacter(), _rosterId: cloudRosterId }
    }
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

  const [cloudLoading, setCloudLoading] = useState(
    Boolean(cloud && playMode && !loadCharacterFromRoster(cloudRosterId)),
  )

  const { user, role } = useAuth()
  const { isPlayMode, enterPlayMode, exitPlayMode } = usePlayMode(playMode)
  const { isNotesOpen, toggleNotes, closeNotes }    = useNotesPanel()
  const { toasts, addToast, removeToast }           = useToast()
  const { startNew, loadFromRoster }                = useCharacterManagement(setCharacter)

  // 'create' = the guided wizard (a new character); 'manage' = the character
  // sheet for an existing one (read view + per-section editors). Seeded from
  // whether the opened character is already saved. editSection !== null = editing
  // a single section in a focused shell. Explicit (not derived from _rosterId)
  // so saving mid-wizard doesn't yank a half-built character into manage mode.
  const [mode, setMode] = useState(() => (character._rosterId ? 'manage' : 'create'))
  const [editSection, setEditSection] = useState(null)

  const saveStatus = useAutoSave(character)
  useCloudSync(character)

  // Apply remote live-counter broadcasts (another viewer's HP/mana/etc. change)
  // to local state in real time. No-op for non-cloud characters.
  const applyRemoteLive = useCallback((payload) => {
    setCharacter(prev => mergeRemote(prev, payload))
  }, [])
  // A structural edit elsewhere (inventory/skills/name) → refetch the fresh
  // character and adopt its data fields, so it shows up here in real time too.
  const applyRemoteData = useCallback(() => {
    const rid = character._rosterId
    if (!rid) return
    hydrateCharacter(rid).then(fresh => {
      console.log('[inv-sync] app guest refetch', rid, 'items:', fresh?.inventory?.length) // TEMP
      if (!fresh) return
      setCharacter(prev => (prev._rosterId === rid ? { ...prev, ...fresh } : prev))
    }).catch(() => {})
  }, [character._rosterId])
  useRealtimeCharacter(character._rosterId, applyRemoteLive, applyRemoteData)

  // Authenticated cloud sync. The guest broadcast above only covers #c=/#play=
  // links; signed-in play uses the cloud row as source of truth. We track the
  // last live + data signatures we pushed OR received so the effects below never
  // echo each other into a loop.
  const lastLiveSig = useRef(null)
  const lastDataSig = useRef(null)
  // The authoritative data_rev for optimistic-concurrency structural saves
  // (#146). Kept in a ref, not state: dataSignature() doesn't strip it, so
  // putting it in `character` would loop the structural-autosave effect.
  const dataRevRef = useRef(null)
  useEffect(() => { dataRevRef.current = character._dataRev ?? null }, [character._rosterId, character._dataRev])

  // RECEIVE: subscribe to this character's live-counter broadcasts so a GM's
  // (or another viewer's) edit shows up here in real time.
  useEffect(() => {
    if (!repoEnabled() || !user || !character._rosterId) return
    lastLiveSig.current = null // reset for the newly-opened character
    lastDataSig.current = null
    const rid = character._rosterId
    subscribeLive(rid, ({ live }) => {
      setCharacter(prev => {
        const next = mergeRemote(prev, { live })
        lastLiveSig.current = JSON.stringify(projectLive(next)) // mark known → don't re-push
        return next
      })
    }, () => {
      // Structural edit elsewhere → adopt the fresh row (same as conflict-adopt),
      // marking the sigs known so the autosave effects don't echo it back.
      getCharacter(rid).then(fresh => {
        console.log('[inv-sync] app repo refetch', rid, 'items:', fresh?.inventory?.length) // TEMP
        if (!fresh) return
        dataRevRef.current = fresh._dataRev ?? null
        lastDataSig.current = dataSignature(fresh)
        setCharacter(prev => {
          const applied = prev._rosterId === rid // TEMP
          console.log('[inv-sync] app repo setCharacter applied?', applied, 'prevRid', prev._rosterId, 'rid', rid, 'freshItems', fresh?.inventory?.length) // TEMP
          return applied ? fresh : prev
        })
      }).catch(() => {})
    })
    return () => removeLiveSubscription(rid)
  }, [user, character._rosterId])

  // SEND: push local live-counter changes (HP/Mana/Story/armor/use-pips) to the
  // cloud, debounced, so the GM and other viewers see them and they survive a
  // reload. Structure/data edits still persist on explicit save. Skips the
  // initial load and any change that merely echoes a received update.
  useEffect(() => {
    if (!repoEnabled() || !user || !character._rosterId || !character._ownerUserId) return
    const sig = JSON.stringify(projectLive(character))
    if (lastLiveSig.current === null) { lastLiveSig.current = sig; return }
    if (sig === lastLiveSig.current) return
    lastLiveSig.current = sig
    const t = setTimeout(() => { trackPush(patchLive(character._rosterId, character)).catch(() => {}) }, 800)
    return () => clearTimeout(t)
  }, [character, user])

  // SEND (structure): push non-counter edits — inventory, notes, name, skills,
  // attributes, etc. — to the cloud, debounced, so every field persists during
  // play, not just on an explicit Save. dataSignature excludes the live counters
  // (handled above) and wizardStep, so this fires only on real structural change.
  useEffect(() => {
    if (!repoEnabled() || !user || !character._rosterId || !character._ownerUserId) return
    const sig = dataSignature(character)
    if (lastDataSig.current === null) { lastDataSig.current = sig; return } // initial load
    if (sig === lastDataSig.current) return
    lastDataSig.current = sig
    const rosterId = character._rosterId
    const snapshot = character
    console.log('[inv-sync] app structural change detected → scheduling push', rosterId) // TEMP
    const t = setTimeout(() => {
      trackPush(saveCharacterData(rosterId, snapshot, dataRevRef.current))
        .then(res => {
          if (res && res.conflict) {
            // Another device wrote this character between our load and this save.
            // Adopt the latest instead of silently clobbering it, and say so (#146).
            getCharacter(rosterId).then(fresh => {
              if (!fresh) return
              dataRevRef.current = fresh._dataRev ?? null
              lastDataSig.current = dataSignature(fresh)
              setCharacter(prev => (prev._rosterId === rosterId ? fresh : prev))
              addToast('This character changed on another device — reloaded the latest.', 'info')
            }).catch(() => {})
          } else if (res && res._dataRev != null) {
            dataRevRef.current = res._dataRev // advance so the next save guards on the fresh rev
          }
        })
        .catch(() => {}) // a network error is already reflected by the sync-status badge
    }, 1200)
    return () => clearTimeout(t)
  }, [character, user, addToast])

  // Hydrate a cloud link from the server (once on mount). Adopt the cloud copy
  // when it's newer than the local one (or there's no local copy); otherwise
  // keep local and let the background push reconcile.
  useEffect(() => {
    if (!cloudToken || !playMode) return
    let alive = true
    fetchCloudCharacter(cloudToken)
      .then(res => {
        if (!alive) return
        if (res) {
          const parsed = safeParseCharacter(res.character)
          if (parsed.success) {
            const entry = loadRoster().find(r => r.id === cloudRosterId)
            // Compare as timestamps: cloud uses "+00:00", local toISOString uses
            // "Z", so a string compare would be wrong.
            if (!entry || Date.parse(res.updatedAt) > Date.parse(entry.savedAt)) {
              const saved = saveCharacterToRoster({ ...parsed.data, _rosterId: cloudRosterId })
              saveCurrent(saved)
              setCharacter(saved)
            }
          }
        }
        setCloudLoading(false)
      })
      .catch(() => { if (alive) setCloudLoading(false) })
    return () => { alive = false }
  }, [cloudId, cloudToken, playMode, cloudRosterId])

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

  // Authenticated source-of-truth write: create the cloud row on first save (so
  // _rosterId becomes the row id), update it thereafter. localStorage is written
  // too, as the offline cache. No-op (returns the local save) when auth is off.
  async function persistToCloud(saved) {
    if (!repoEnabled() || !user) return saved
    try {
      const isCloudRow = Boolean(saved._ownerUserId)
      const row = isCloudRow
        ? await saveCharacterData(saved._rosterId, saved)
        : await createCharacter(saved)
      if (row) { setCharacter(row); saveCharacterToRoster(row); return row }
    } catch {
      addToast('Saved locally — cloud sync will retry when you’re back online.', 'success')
    }
    return saved
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
    persistToCloud(saved)
  }

  function completeCharacter() {
    const saved = saveCharacterToRoster(character)
    setCharacter(saved)
    setEditSection(null)
    setMode('manage') // finishing creation drops you onto the character sheet
    persistToCloud(saved)
  }

  if (cloudLoading) {
    return (
      <ErrorBoundary>
        <div className={styles.app}>
          <main
            id="main-content"
            className={styles.mainFullBleed}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}
          >
            <p style={{ opacity: 0.8 }}>Loading character…</p>
          </main>
          <Toast toasts={toasts} onRemove={removeToast} />
        </div>
      </ErrorBoundary>
    )
  }

  // A signed-in user may edit only characters they own, are assigned, or (gm/
  // admin) any. Unknown ownership (guest #c=/#play= links, local-only chars)
  // stays editable so printout-scan players can still tick their own HP.
  const playReadOnly = Boolean(
    repoEnabled() && user && character._ownerUserId
    && !isGmOrAdmin(role)
    && character._ownerUserId !== user.id
    && character._assignedPlayerId !== user.id,
  )

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
          readOnly={playReadOnly}
          onRoll={broadcastRoll}
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

  // Manage mode: an existing character. Show the character sheet (read view +
  // per-section ✎ edit), or one section's editor in a focused shell. No step bar.
  if (mode === 'manage') {
    console.log('[inv-sync] app render manage', 'items', character?.inventory?.length, 'editSection', editSection) // TEMP
    const SectionComp = editSection != null ? STEP_COMPONENTS[editSection] : null
    return (
      <ErrorBoundary>
        <div className={styles.app}>
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <div className={styles.page}>
            <div className={styles.wizardCard}>
              <header className={styles.header}>
                {editSection != null ? (
                  <button className={styles.brand} onClick={() => setEditSection(null)} aria-label="Done — back to character sheet">
                    <span className={styles.brandName}>‹ Done</span>
                    <span className={styles.brandSub}>{SECTION_LABELS[editSection]}</span>
                  </button>
                ) : (
                  <button className={styles.brand} onClick={() => onNavigate('roster')} aria-label="Back to roster">
                    <span className={styles.brandName}>‹ Roster</span>
                    <span className={styles.brandSub}>Sidherun</span>
                  </button>
                )}
                <div className={styles.headerActions}>
                  {(saveStatus === 'saving' || saveStatus === 'saved') && (
                    <span className={styles.saveStatus}>{saveStatus === 'saving' ? 'Saving…' : 'Saved ✓'}</span>
                  )}
                  <button className={styles.headerBtn} onClick={onToggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
                  <button className={styles.headerBtn} onClick={toggleNotes}>Notes</button>
                </div>
              </header>

              <main
                id="main-content"
                className={styles.main}
                ref={mainRef}
                tabIndex={-1}
                aria-label={editSection != null ? `Edit ${SECTION_LABELS[editSection]}` : 'Character sheet'}
              >
                {editSection != null ? (
                  <SectionComp
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
                ) : (
                  <Step9Review
                    character={character}
                    onUpdate={update}
                    onEnterPlayMode={enterPlayMode}
                    onSaveToRoster={saveToRoster}
                    addToast={addToast}
                    onEditSection={setEditSection}
                  />
                )}
              </main>

              {editSection != null && (
                <div className={styles.sectionDoneBar}>
                  <button className="btn-primary" onClick={() => setEditSection(null)}>Done</button>
                </div>
              )}
            </div>
          </div>
          {isNotesOpen && (
            <NotesPanel notes={character._notes} onChange={notes => update({ _notes: notes })} onClose={closeNotes} />
          )}
          <Toast toasts={toasts} onRemove={removeToast} />
        </div>
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
                  {(saveStatus === 'saving' || saveStatus === 'saved') && (
                    <span className={styles.saveStatus}>{saveStatus === 'saving' ? 'Saving…' : 'Saved ✓'}</span>
                  )}
                  <button className={styles.headerBtn} onClick={onToggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
                  <button className={styles.headerBtn} onClick={() => onNavigate('roster')}>Roster</button>
                  <button className={styles.headerBtn} onClick={toggleNotes}>Notes</button>
                </div>
              </header>

              {!character._rosterId && character.wizardStep !== 9 && (
                <div className={styles.saveBanner} role="status">
                  Not saved yet — finish the <strong>Review</strong> step and click <strong>Complete</strong> to save this character to your roster.
                </div>
              )}

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
