// First-character guide on/off state (#onboarding). Tiny localStorage-backed
// preference, matching rosterStorage.js's guarded try/catch idiom so a full or
// disabled localStorage (private browsing) never crashes the wizard.
//
// Values: 'on' | 'off' | absent (unset — no explicit choice made yet).
const KEY = 'sidherun_guide'

// Whether the guide should currently be shown. An explicit setting always wins;
// with no explicit setting, default ON for a first-time visitor (empty roster)
// and OFF for a returning one, so new players are onboarded but veterans aren't
// nagged on every visit.
export function guideEnabled(rosterEmpty) {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'on') return true
    if (v === 'off') return false
  } catch { /* ignore — fall through to the roster-based default */ }
  return Boolean(rosterEmpty)
}

// Persist an explicit on/off choice (e.g. the 💡 Guide toggle).
export function setGuide(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* ignore */ }
}
