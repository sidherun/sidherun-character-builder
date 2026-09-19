import { useState, useCallback, useRef, useEffect } from 'react'
import { createDefaultCharacter } from './utils/defaultCharacter.js'
import { loadCurrent, saveCharacterToRoster, saveCurrent, loadCharacterFromRoster, loadRoster, getLastSaveStatus } from './utils/rosterStorage.js'
import { decodeCharacterFromURL, getPlayLinkId, parseCloudLink } from './utils/urlState.js'
import { registerCloudLink, fetchCloudCharacter, mergeRemote, rosterIdForCloudId, projectLive, dataSignature, hydrateCharacter } from './utils/cloudSync.js'
import { repoEnabled, upsertCharacter, getCharacter, saveCharacterData, patchLive, subscribeLive, removeLiveSubscription } from './utils/characterRepo.js'
import { useAuth, isGmOrAdmin } from './auth/useAuth.js'
import { safeParseCharacter } from './utils/characterSchema.js'
import { guideEnabled, setGuide } from './utils/onboarding.js'
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
import OnboardingTip from './components/OnboardingTip.jsx'
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
import { appCharacterSyncScopes } from './utils/characterSyncScope.js'
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
// Identity (step 2) is editable from the sheet so race/archetype/level and the
// powers/magic capability flags can be changed after creation (#178, leveling).
const SECTION_LABELS = {
  2: 'Identity', 3: 'Attributes', 4: 'Combat', 5: 'Powers', 6: 'Magic', 7: 'Skills', 8: 'Resources',
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

  const { user, role, loading: authLoading } = useAuth()
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

  // First-character guide (#onboarding): explicit setting wins; unset defaults
  // to on for a first-time visitor (empty roster). Computed once at mount —
  // toggling later is explicit via the 💡 Guide button, not re-derived from the
  // roster (which changes the moment this character is saved).
  const [guideOn, setGuideOn] = useState(() => guideEnabled(loadRoster().length === 0))
  const toggleGuide = useCallback(() => {
    setGuideOn(prev => {
      const next = !prev
      setGuide(next)
      return next
    })
  }, [])
  const dismissGuide = useCallback(() => {
    setGuide(false)
    setGuideOn(false)
  }, [])

  const syncIdentity = cloudToken
    ? `capability:${cloudId}:${cloudToken}`
    : (authLoading ? null : (user ? `repository:${user.id}` : 'guest:local'))
  const syncScope = appCharacterSyncScopes.forIdentity(syncIdentity)
  const pendingWrites = syncScope.writes
  const dataRevisions = syncScope.revisions
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const saveStatus = useAutoSave(character)
  const cloudWritePlane = useCloudSync(character, {
    user,
    authLoading,
    capabilityToken: cloudToken,
  }, pendingWrites)
  const useRepoPlane = cloudWritePlane === 'repo'

  // Apply remote live-counter broadcasts (another viewer's HP/mana/etc. change)
  // to local state in real time. No-op for non-cloud characters.
  const applyRemoteLive = useCallback((payload, rid) => {
    if (!rid || syncScope.disposed) return
    setCharacter(prev => (prev._rosterId === rid ? mergeRemote(prev, payload) : prev))
  }, [syncScope])
  // A structural edit elsewhere (inventory/skills/name) → refetch the fresh
  // character and adopt its data fields, so it shows up here in real time too.
  const applyRemoteData = useCallback((rid) => {
    if (!rid || syncScope.disposed) return
    const refresh = () => hydrateCharacter(rid).then(fresh => {
      if (syncScope.disposed) return
      if (!fresh) throw new Error('Could not refresh the cloud character')
      if (pendingWrites.isBusy(rid)) {
        pendingWrites.requestRemote(rid, refresh)
        return
      }
      if (!mountedRef.current) return
      setCharacter(prev => (prev._rosterId === rid ? { ...prev, ...fresh } : prev))
    })
    pendingWrites.requestRemote(rid, refresh)
  }, [pendingWrites, syncScope])
  useRealtimeCharacter(character._rosterId, applyRemoteLive, applyRemoteData)

  // Authenticated cloud sync. The guest broadcast above only covers #c=/#play=
  // links; signed-in play uses the cloud row as source of truth. We track the
  // last live + data signatures we pushed OR received so the effects below never
  // echo each other into a loop.
  const lastLiveSigs = useRef(new Map())
  const lastDataSigs = useRef(new Map())
  const dataGenerations = useRef(new Map())
  // Latest character, for the focus/visibility reconcile listener below whose
  // effect doesn't re-bind on every character change.
  const charRef = useRef(character)
  charRef.current = character
  // The authoritative data_rev for optimistic-concurrency structural saves
  // (#146). Kept in a ref, not state: dataSignature() doesn't strip it, so
  // putting it in `character` would loop the structural-autosave effect.
  useEffect(() => {
    if (character._rosterId) {
      const known = dataRevisions.get(character._rosterId)
      const incoming = character._dataRev ?? null
      if (!dataRevisions.has(character._rosterId)
          || (incoming != null && (known == null || incoming > known))) {
        dataRevisions.set(character._rosterId, incoming)
      }
    }
  }, [character._rosterId, character._dataRev, dataRevisions])

  // Authed localStorage cutover (#127). When signed in, App still seeds the
  // working character from the localStorage 'current' slot (deferred cloud-first
  // load, #119). That draft can predate sign-in: it has a _rosterId but no
  // _ownerUserId, so the cloud-sync effects below stay dormant and its stored
  // slot is out of step with the authed format. Once auth resolves, if the draft
  // already matches a cloud row we own, stamp that row's identity onto it — in
  // place, preserving any unsaved edits — so background sync re-engages and an
  // explicit Save updates the row instead of minting a duplicate. useAutoSave
  // then rewrites the 'current' slot in the authed format, completing the
  // cutover. A brand-new local draft (no matching cloud row) is left untouched
  // and is created on first save. No-op when signed out — the unauthenticated
  // localStorage-only flow is unaffected. upsertCharacter guards Save either way.
  useEffect(() => {
    if (!useRepoPlane || !repoEnabled() || !user) return
    if (!character._rosterId || character._ownerUserId) return
    let alive = true
    getCharacter(character._rosterId)
      .then(row => {
        if (!alive || !row) return
        setCharacter(prev =>
          (prev._rosterId === row._rosterId && !prev._ownerUserId)
            ? {
                ...prev,
                _ownerUserId:      row._ownerUserId,
                _assignedPlayerId: row._assignedPlayerId,
                _dataRev:          row._dataRev,
                _updatedAt:        row._updatedAt,
              }
            : prev)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [user, useRepoPlane, character._rosterId, character._ownerUserId])

  // RECEIVE: subscribe to this character's live-counter broadcasts so a GM's
  // (or another viewer's) edit shows up here in real time.
  useEffect(() => {
    if (!useRepoPlane || !repoEnabled() || !user || !character._rosterId) return
    const rid = character._rosterId
    const opened = charRef.current
    lastLiveSigs.current.set(rid, JSON.stringify(projectLive(opened)))
    lastDataSigs.current.set(rid, dataSignature(opened))
    subscribeLive(rid, ({ live }) => {
      if (!mountedRef.current || syncScope.disposed) return
      setCharacter(prev => {
        if (prev._rosterId !== rid) return prev
        const next = mergeRemote(prev, { live })
        lastLiveSigs.current.set(rid, JSON.stringify(projectLive(next)))
        return next
      })
    }, () => {
      // Structural edit elsewhere → adopt the fresh row (same as conflict-adopt),
      // marking the sigs known so the autosave effects don't echo it back.
      const refresh = () => getCharacter(rid).then(fresh => {
        if (syncScope.disposed) return
        if (!fresh) throw new Error('Could not refresh the repository character')
        if (pendingWrites.isBusy(rid)) {
          pendingWrites.requestRemote(rid, refresh)
          return
        }
        dataRevisions.set(rid, fresh._dataRev ?? null)
        lastDataSigs.current.set(rid, dataSignature(fresh))
        if (!mountedRef.current) return
        setCharacter(prev => (prev._rosterId === rid ? fresh : prev))
      })
      pendingWrites.requestRemote(rid, refresh)
    })
    return () => removeLiveSubscription(rid)
  }, [user, useRepoPlane, character._rosterId, pendingWrites, dataRevisions, syncScope])

  // SEND: push local live-counter changes (HP/Mana/Story/armor/use-pips) to the
  // cloud, debounced, so the GM and other viewers see them and they survive a
  // reload. Structure/data edits still persist on explicit save. Skips the
  // initial load and any change that merely echoes a received update.
  useEffect(() => {
    if (!useRepoPlane || !repoEnabled() || !user || !character._rosterId || !character._ownerUserId) return
    const rid = character._rosterId
    const sig = JSON.stringify(projectLive(character))
    if (!lastLiveSigs.current.has(rid)) { lastLiveSigs.current.set(rid, sig); return }
    if (sig === lastLiveSigs.current.get(rid)) return
    lastLiveSigs.current.set(rid, sig)
    const snapshot = character
    pendingWrites.schedule('repo-live', {
      characterId: rid,
      delay: 800,
      run: () => trackPush(patchLive(rid, snapshot)),
    })
  }, [character, user, useRepoPlane, pendingWrites])

  // SEND (structure): push non-counter edits — inventory, notes, name, skills,
  // attributes, etc. — to the cloud, debounced, so every field persists during
  // play, not just on an explicit Save. dataSignature excludes the live counters
  // (handled above) and wizardStep, so this fires only on real structural change.
  useEffect(() => {
    if (!useRepoPlane || !repoEnabled() || !user || !character._rosterId || !character._ownerUserId) return
    const rosterId = character._rosterId
    const sig = dataSignature(character)
    if (!lastDataSigs.current.has(rosterId)) { lastDataSigs.current.set(rosterId, sig); return }
    if (sig === lastDataSigs.current.get(rosterId)) return
    lastDataSigs.current.set(rosterId, sig)
    const generation = (dataGenerations.current.get(rosterId) || 0) + 1
    dataGenerations.current.set(rosterId, generation)
    const snapshot = character
    const push = ({ expectedRevision: capturedRevision }) => trackPush(
      saveCharacterData(rosterId, snapshot, capturedRevision).then(res => {
        if (syncScope.disposed) throw new Error('Sync identity changed')
        if (res && res.conflict) {
          // Another device wrote this character between our load and this save.
          // Adopt the latest instead of silently clobbering it, and say so (#146).
          return getCharacter(rosterId).then(fresh => {
            if (!fresh) throw new Error('Could not reload the conflicted character')
            if (syncScope.disposed) throw new Error('Sync identity changed')
            dataRevisions.set(rosterId, fresh._dataRev ?? null)
            const stillCurrent = mountedRef.current && charRef.current._rosterId === rosterId
            const sameGeneration = dataGenerations.current.get(rosterId) === generation
            const sameSnapshot = dataSignature(charRef.current) === sig
            if (stillCurrent && sameGeneration && sameSnapshot) {
              lastDataSigs.current.set(rosterId, dataSignature(fresh))
              setCharacter(prev => (prev._rosterId === rosterId ? fresh : prev))
              addToast('This character changed on another device — reloaded the latest.', 'info')
            } else {
              // A was switched away from or edited again while its conflict was
              // resolving. Keep this snapshot failed/retryable; treating it as
              // success would strand the unsaved edit in the local cache.
              throw new Error('Conflict remains pending for the local snapshot')
            }
          })
        } else if (res && res._dataRev != null) {
          if (syncScope.disposed) throw new Error('Sync identity changed')
          dataRevisions.set(rosterId, res._dataRev) // advance this character only
          const sameGeneration = dataGenerations.current.get(rosterId) === generation
          const metadata = {
            _dataRev: res._dataRev,
            _updatedAt: res._updatedAt ?? snapshot._updatedAt,
            _ownerUserId: res._ownerUserId ?? snapshot._ownerUserId,
            _assignedPlayerId: res._assignedPlayerId ?? snapshot._assignedPlayerId,
          }
          if (sameGeneration) {
            // Persist the authoritative revision even across reloads. The
            // metadata-free dataSignature keeps this state/cache refresh from
            // creating another cloud save.
            const revised = { ...snapshot, ...metadata }
            saveCharacterToRoster(revised)
            const cachedCurrent = loadCurrent()
            if (cachedCurrent?._rosterId === rosterId && dataSignature(cachedCurrent) === sig) {
              saveCurrent(revised)
            }
            if (mountedRef.current) {
              setCharacter(prev => (
                prev._rosterId === rosterId && dataSignature(prev) === sig
                  ? { ...prev, ...metadata }
                  : prev
              ))
            }
          }
        }
      }),
    )
    pendingWrites.schedule('repo-data', {
      characterId: rosterId,
      expectedRevision: () => dataRevisions.get(rosterId) ?? snapshot._dataRev ?? null,
      delay: 1200,
      run: push,
    })
  }, [character, user, useRepoPlane, addToast, pendingWrites, dataRevisions, syncScope])

  // A character switch flushes only the character being left. The coordinator
  // consumes callbacks before starting them, so a later pagehide cannot replay A
  // after B is open.
  useEffect(() => {
    const rosterId = character._rosterId
    if (!rosterId) return
    pendingWrites.retryCharacter(rosterId)
    return () => { pendingWrites.flushCharacter(rosterId) }
  }, [character._rosterId, pendingWrites])

  // Flush any pending debounced cloud push before the app goes away, so the last
  // HP/Mana/Story (or structural) change isn't dropped with the timer (#196).
  // App is the root component and rarely unmounts mid-session, so the signals
  // that matter are the tab backgrounding (mobile) and closing/refreshing —
  // fire the pending pushes then, plus on a true unmount. Pushes are idempotent
  // (patchLive/saveCharacterData set fields to the snapshot), so a redundant
  // flush is harmless.
  useEffect(() => {
    const flush = () => { pendingWrites.flushAll() }
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [pendingWrites])

  // A failed newest snapshot stays retryable. Connectivity recovery or a later
  // focus retries it once; repeated failures remain parked until the next event.
  useEffect(() => {
    const retry = () => { pendingWrites.retryAllFailed() }
    window.addEventListener('online', retry)
    window.addEventListener('focus', retry)
    return () => {
      window.removeEventListener('online', retry)
      window.removeEventListener('focus', retry)
    }
  }, [pendingWrites])

  // RECONCILE: a live Broadcast can be dropped (weak wifi, rate cap, a peer that
  // was backgrounded), leaving this screen showing a stale number until the
  // character is reopened. When the tab regains focus / becomes visible, re-read
  // the cloud row and self-heal (#196/#200). Guarded to never clobber a local
  // edit: skip if a push is still pending (the live/data signature differs from
  // what was last synced), and only adopt a strictly newer cloud row.
  useEffect(() => {
    if (!useRepoPlane || !repoEnabled() || !user) return
    const reconcile = () => {
      if (document.visibilityState !== 'visible') return
      const c = charRef.current
      const rid = c._rosterId
      if (!rid) return
      if (pendingWrites.isBusy(rid)) return
      if (JSON.stringify(projectLive(c)) !== lastLiveSigs.current.get(rid)) return
      if (dataSignature(c) !== lastDataSigs.current.get(rid)) return
      getCharacter(rid).then(fresh => {
        if (syncScope.disposed) return
        if (!fresh || fresh._rosterId !== rid) return
        if (c._updatedAt && fresh._updatedAt &&
            Date.parse(fresh._updatedAt) <= Date.parse(c._updatedAt)) return // not newer → nothing missed
        dataRevisions.set(rid, fresh._dataRev ?? null)
        lastLiveSigs.current.set(rid, JSON.stringify(projectLive(fresh)))
        lastDataSigs.current.set(rid, dataSignature(fresh))
        if (!mountedRef.current) return
        setCharacter(prev => (prev._rosterId === rid ? fresh : prev))
      }).catch(() => {})
    }
    document.addEventListener('visibilitychange', reconcile)
    window.addEventListener('focus', reconcile)
    return () => {
      document.removeEventListener('visibilitychange', reconcile)
      window.removeEventListener('focus', reconcile)
    }
  }, [user, useRepoPlane, pendingWrites, dataRevisions, syncScope])

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
    // A character needs a name — don't let it advance past Identity nameless and
    // silently save as "Unnamed Character" on Complete (#218).
    if (character.wizardStep === 2 && !character.name?.trim()) {
      addToast('Give your character a name to continue.', 'error')
      return
    }
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
  // _rosterId becomes the row id), update it thereafter. upsertCharacter keys
  // create-vs-update on whether a cloud row already exists for this _rosterId —
  // NOT on the _ownerUserId marker — so a stale localStorage 'current' draft
  // that predates sign-in can never insert a duplicate (#127). localStorage is
  // written too, as the offline cache. No-op (returns the local save) when auth
  // is off.
  async function persistToCloud(saved) {
    if (!useRepoPlane || !repoEnabled() || !user) return saved
    try {
      const row = await upsertCharacter(saved)
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
    // Backstop the name gate: never save a nameless character as "Unnamed" (#218).
    if (!character.name?.trim()) {
      addToast('Give your character a name first (Identity step).', 'error')
      goToStep(2)
      return
    }
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
  const syncOwnershipWarning = Boolean(
    repoEnabled() && user && character._rosterId
    && !character._ownerUserId && !character._assignedPlayerId,
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
          syncOwnershipWarning={syncOwnershipWarning}
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
            {guideOn && <OnboardingTip step={character.wizardStep} onDismiss={dismissGuide} />}
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
                  <button
                    className={styles.headerBtn}
                    onClick={toggleGuide}
                    aria-pressed={guideOn}
                  >
                    💡 Guide
                  </button>
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
                {guideOn && <OnboardingTip step={character.wizardStep} onDismiss={dismissGuide} />}
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
