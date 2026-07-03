# Phase 0 + 1 — Implementation Plan

**Goal:** Turn the app from a per-device sheet + tracker into a **shared, live table** where the rules do the work for players. Two ships:

- **Phase 0 — Unlock the shared table.** Promote the finished-but-dormant cloud-sync layer to default, and harden the gaps that a real multi-device session exposes.
- **Phase 1 — Tap-to-roll dice, wired to the rules engine.** The single change that turns a sheet into a game: tap a skill/spell → the app rolls it under the number it already computes → the result streams to a shared roll log.

Each phase is a standalone ship. Phase 1 depends on Phase 0's realtime channel for the shared log (single-device rolls work without it).

---

## Sidherun uses TWO resolution mechanics (this drives the dice design)

Confirmed rules — the dice core must support both, they are not the same:

| Action | What the app does | Adjudication |
|---|---|---|
| **Skill check** | roll `d100 + calcSkillTotal(skill)`, **display the total** | GM verbally, vs difficulty |
| **Attack** | roll `d100 + weaponModifier`, **display the total** | GM verbally, vs defense |
| **Spell** | roll-**under** `d100 ≤ ( matrix[casterLvl][targetLvl] + magicAttr )`, cap 95 | **app resolves** — shows pass/fail |

**Design principle (per GM): skills & combat just roll and display the total — no target input, no app-side hit/miss.** The player calls the number out loud and the GM adjudicates against difficulty/defense, exactly like D&D Beyond. That's faster than typing a target on every roll. Only **spells** self-resolve, because the target % is already computed. Note `calcSkillTotal` / `weaponModifier` are the **additive values you roll with**, not roll-under targets.

**Attack rule (per GM), verbatim intent:**
- Roll d100 and **add** the appropriate **skill value** — or, if the weapon has no applicable skill, the **attribute value**. **They do not stack**; skill is the default when applicable.
- Compare the total to the target's **defense value** (`calcDefense().typical` by default, base 50). `total ≥ defense` = hit; `<` = miss.
- The **DM may adjust the target's defense** for context (cover, target moving perpendicular, etc.) → attack UI needs an optional DM-adjust field.

**Two implications for the build:**
1. The dice core needs a **second primitive** — roll-over/additive — alongside roll-under. One `resolveCheck` can't cover both.
2. **Existing display bug:** `PlayMode.jsx:254` shows weapons as `+(attributeBonus)+(skillBonus)` **summed** — that stacks skill + attribute, which violates the non-stacking rule. Fix the attack modifier to pick one (skill if applicable, else attribute) and correct the display.

**One small data-model question (doesn't block — I'll implement the pragmatic reading and flag it):** the weapon schema stores both `attributeBonus` and `skillBonus` as ints with no explicit "which applies" flag. I'll treat a nonzero `skillBonus` as "skill applies → use it," else fall back to `attributeBonus`. If a legit skill value can be 0, we should add a tiny `weapon.usesSkill` boolean instead — say the word and I'll switch to that.

**No target inputs and no app-side hit/miss for skills & attacks in Phase 1** — they display the total only. App-side auto-resolution is deferred to **Phase 2**, when NPC entities provide a defense number to compare against (`calcDefense().typical`); until then verbal adjudication is faster. Spells already self-resolve.

---

# PHASE 0 — Unlock the shared table

> **RE-SCOPED 2026-07-03** after the auth/cloud-first stack merged to main (#117, #131, #132, #113, #136). The auth plane (`characterRepo.js` + `AuthProvider` + `0002_auth_roles.sql`) supersedes most of the guest-plane assumptions below. Net: **0.3 is done upstream** (drop), **0.4 downgraded** to a minor dep-array fix, and the real remaining work is now tracked as GitHub issues:
> - **#144** — provision + migrate (0001+0002) + bootstrap admin + flip `VITE_AUTH=on` (was 0.1/0.2)
> - **#145** — sync status indicator, stop silent failures (0.5)
> - **#146** — contain last-write-wins on structural blob saves; *worse* now that `saveCharacterData` has no rev check and autosave fires it continuously (0.6)
> - **#147** — GMScreen subscription keyed on `chars.length` not the id-set (0.4, latent)
> - **#148** — Phase 1.4 shared roll log (needs a real `session:<id>` channel; `hash(gmKey)` breaks under auth since players lack the GM key)
>
> The per-item detail below is kept for reference but read the issues for the current truth.

### What "on" actually means today (reality check)
- The flag is read in exactly one place: `src/utils/supabaseClient.js:14`. `cloudEnabled` requires **all three** of `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_CLOUD_SYNC === 'on'`. Flipping the flag alone does nothing without the two secrets in the build.
- Realtime is **client-side broadcast** (`channel.send` on `char:${cloudId}`), not server-authoritative. That's fine for live counters, and fine for Phase 1 rolls. No server realtime migration is needed now (the `0002` migration is only a TODO comment at `0001_init.sql:15`).
- Gaps that only bite once it's default-on: no cloud roster hydrate (`list_characters` RPC exists but is never called), no visible sync status, a stale GMScreen subscription effect, and force-LWW on structural writes.

### 0.1 — Provision Supabase + apply the schema
- [ ] Create the Supabase project (or confirm the existing one). Run `supabase/migrations/0001_init.sql` (table `characters`, RLS sealed, 7 SECURITY DEFINER RPCs). Nothing else exists to run.
- [ ] Grab the project URL and anon key.
- **Acceptance:** in the Supabase SQL editor, `select create_character('gm_test','X','{}'::jsonb,'{}'::jsonb);` returns an id + token.

### 0.2 — Wire secrets into CI and default the flag on
- **Files:** `.github/workflows/deploy.yml`, new local `.env` (gitignored).
- [ ] Add repo secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. In `deploy.yml`, expose them + `VITE_CLOUD_SYNC: 'on'` as `env:` on the build step (Vite inlines `import.meta.env.*` at build).
- [ ] Create `.env` locally with the same three for dev; confirm `.env` is gitignored.
- **Keep** the `url && anonKey && flag==='on'` guard as-is — it degrades gracefully to local-only if a secret is missing. Don't weaken it.
- **Acceptance:** a deployed build has `cloudEnabled === true`; a build without secrets still boots local-only (no crash).

### 0.3 — Cloud roster hydrate (wire up the unused `list_characters`)
- **Files:** `src/utils/cloudSync.js`, `src/pages/GMScreen.jsx`, `src/pages/RosterPage.jsx`.
- **Why:** today a GM opening the GM screen on a *different device* sees nothing from the cloud — characters only arrive via explicit `#c=` links. `list_characters(p_gm_key)` already returns all owned rows; it's just never called.
- [ ] Add `listCloudCharacters()` → `rpc('list_characters', { p_gm_key: getGmKey() })` returning `[{ id, name, data, live, updated_at }]`.
- [ ] On GMScreen/Roster load (when `cloudEnabled`), merge cloud rows into the local roster: for each cloud row, resolve `rosterIdForCloudId(id)`; if unmapped, `registerCloudLink` + create a local roster entry from `foldLive(data, live)`. Adopt cloud copy when `updated_at` is newer than local `savedAt` (same rule already used in `App.jsx:135`).
- **Acceptance:** clear localStorage on a second browser, restore the GM key via the existing `importCloudState`, load `#gm` → the full roster appears from the cloud.

### 0.4 — Fix the stale GMScreen live subscription
- **File:** `src/pages/GMScreen.jsx:17-35`.
- **Bug:** the subscribe effect has `[]` deps and captures `charsRef.current` once, so characters pushed to cloud after mount get no live subscription until refresh.
- [ ] Re-run subscribe/unsubscribe when the set of cloud-mapped rosterIds changes (derive a stable key like `mappedIds.join(',')` and use it as the dep). Subscribe per new id, tear down removed ones.
- **Acceptance:** with the GM screen open, sync a new character from another device → its HP tile goes live without a refresh.

### 0.5 — Surface sync status (kill the silent failures)
- **Files:** `src/hooks/useCloudSync.js`, `src/pages/GMScreen.jsx`, `src/components/CharacterCard.jsx`, new `src/hooks/useCloudSync.js` status return; token: `src/tokens.css`.
- **Why:** every push is fire-and-forget `.catch(()=>{})` (`useCloudSync.js:19`, `GMScreen.jsx:43`) and a bad/expired token silently shows a blank local copy (`App.jsx:142`). A live table needs the player to trust that their HP is actually shared.
- [ ] Thread a status out of `syncCharacter` calls: `'synced' | 'offline' | 'error'`. Replace the swallowed catches with a status setter.
- [ ] Render a small dot/label: on each GM card, and on the player play view a "● Live / ○ Offline" indicator near the header.
- [ ] On `fetchCloudCharacter` failure with a token present, show a real message ("This play link is expired — ask your GM to resend") instead of a blank sheet.
- **Acceptance:** kill wifi mid-session → indicator flips to Offline, local edits still work; restore → flips back to Live.

### 0.6 — Contain the last-write-wins clobber on structural edits
- **File:** `src/utils/cloudSync.js:207` (the `p_expected_rev: -1` force).
- **Risk:** live counters are safe (`patch_live` does a merge). Full-blob structural edits force-overwrite, so a GM structural edit + a player's structural edit race and one is lost.
- [ ] Minimal, correct fix for a home game: **only the builder/GM device pushes structural (`data`) changes; player play-link devices push live counters only.** Gate `chooseChannel` so a play-mode/cloud-link session never sends the `data` channel — it already patches live cleanly. Document this as the rule.
- [ ] (Optional, later) switch structural writes from `-1` to the real `data_rev` optimistic check and surface a conflict toast.
- **Acceptance:** GM edits a character's inventory while the player has the play link open and adjusts HP → both changes survive.

### 0.7 — Prove it in one real session
- [ ] Two devices: GM screen (`#gm`) on laptop, player phone on a `#c=` link. Change HP on the phone → appears live on the GM screen and vice versa; reload both → state persists; go offline → local still works, indicator honest.
- **Acceptance:** a full mock encounter's HP/mana tracking stays in sync across both screens with no manual refresh.

---

# PHASE 1 — Tap-to-roll dice, wired to the engine

### 1.1 — Net-new dice core: `src/utils/dice.js` (two primitives)
- [ ] `rollD100(rng = Math.random)` → integer 1–100.
- [ ] `rollTotal({ modifier, rng })` → `{ roll: rollD100(rng), modifier, total: roll + modifier }`. **Skills + attacks** — no pass/fail; the total is what gets read aloud and the GM adjudicates.
- [ ] `resolveUnder({ target, rng })` → `{ roll, target, success: roll <= target, margin: target - roll }`. **Spells only** — self-resolving; `roll === target` is a success.
- [ ] `rng` injectable so tests are deterministic and the same fn can later drive a shared/verifiable roll.
- **Deferred to Phase 2:** an over-vs-target resolver (automatic hit/miss) lands when NPC defense gives a number to compare against. Not needed now.
- **Crit rule:** documented TODO — no Sidherun crit/fumble bands yet. Add fields once you give thresholds (e.g. natural 100 / natural 1).
- **Test:** `src/utils/dice.test.js`, stub `rng`: `rollTotal` (total = roll + modifier) and `resolveUnder` boundaries (roll==target success, 1, 100).

### 1.2 — Bind dice to the rules engine: `src/utils/rollActions.js`
Pure resolvers reusing the existing engine — no formula duplication.
- [ ] `rollSkill(character, skill, rng)` → `rollTotal({ modifier: calcSkillTotal(skill), rng })`. Displays the total; no target.
- [ ] `rollAttack(character, weapon, rng)` → `rollTotal({ modifier: weaponModifier(weapon), rng })`. Displays the total; no defense input.
- [ ] `weaponModifier(weapon)` → the **non-stacking** attack bonus: `weapon.skillBonus > 0 ? weapon.skillBonus : (weapon.attributeBonus || 0)` (see data-model note at top — swap to a `usesSkill` flag if a 0 skill is valid).
- [ ] `rollSpell(character, targetLevel, rng)` → `resolveUnder({ target: getFinalSpellTarget(character.level, targetLevel, magicAttrValue), rng })`, `magicAttrValue = attrTotal(attributes[magicAttribute])`. Target = **`matrix[casterLvl][targetLvl] + magicAttr`, capped 95, roll ≤** — this is exactly what `getFinalSpellTarget` already computes (`spellTarget.js`), so **no engine change**, just wiring. Self-resolving.
- **Test:** `src/utils/rollActions.test.js` — skill/attack totals = d100 + the right single modifier (assert skill+attribute do **not** stack); spell roll-under success + margin.

### 1.3 — Tap-to-roll UI in Play Mode
- **File:** `src/components/steps/PlayMode.jsx` + `PlayMode.module.css` (CSS Modules, tokens from `src/tokens.css`).
- [ ] **Skills** (`PlayMode.jsx:262-285`): each row renders `calcSkillTotal(s)` + clickable use-pips — add a one-tap **"Roll" button** per row → `rollSkill` → show the total. No input fields.
- [ ] **Spell Target tile** (`142-156`): `targetLevel` select + `spellTarget%` already there — add "Roll" → `rollSpell` (shows Success/Fail; self-resolving).
- [ ] **Weapons** (`248-259`): add a one-tap **"Attack" button** per weapon → `rollAttack` → show the total. No input fields. **Also fix `:254`** to show the non-stacking modifier (`weaponModifier(w)`), not `attributeBonus + skillBonus` summed.
- [ ] **Result display:** reuse the existing `lastHit`/`.hitBanner` pattern (`194-205`), rename state `lastHit → lastRoll`. Two readouts — the **total in large read-aloud type**:
  - skill/attack: **`80`** · small: `d100 62 + 18` — no pass/fail, GM adjudicates
  - spell: **`Success`** · small: `d100 47 ≤ 62 (+15)` — colored `var(--story)` / `var(--danger)`
- **Acceptance:** on a phone — tapping a skill or weapon shows a big d100+modifier total to read aloud (one tap, no fields); a spell roll shows Success/Fail vs the computed target; the summed-modifier display bug is gone.

### 1.4 — Shared roll log over realtime
- **Files:** `src/utils/cloudSync.js` (new broadcast helpers), `src/pages/GMScreen.jsx` (feed UI), `PlayMode.jsx` (emit on roll).
- **Why:** rolls should land for the whole table, not just the roller. Current realtime only broadcasts `{ live: {...} }` on per-character channels.
- [ ] Add a **session channel** `session:${sessionId}` where every player device + the GM screen subscribe. For now `sessionId = _h(gmKey)` (one table per GM); this becomes a real `Session` entity in Phase 2.
- [ ] `broadcastRoll(sessionId, entry)` and `subscribeSession(sessionId, onRoll)` in `cloudSync.js`, event `'roll'`, payload `{ actor, label, roll, target, success, margin, ts }` (`ts` passed in — no `Date.now()` in shared utils).
- [ ] On every resolved roll in PlayMode, `broadcastRoll`. GMScreen renders a live roll feed (last ~20); the player sees their own rolls, optionally the shared feed.
- [ ] Rolls are **ephemeral broadcast** (no DB write) — consistent with today's client-broadcast model. Persistence deferred to the Phase 2 session log.
- **Acceptance:** a player taps a skill on their phone → the result appears in the GM screen's roll feed within a second.

### 1.5 — Trust model (document, don't over-build)
- The acting device rolls and broadcasts the **result** (not a seed); because it's broadcast, every screen shows the same number. Good enough for a friendly home game — no server-authoritative dice needed. Note this explicitly so it's a choice, not an omission.

### 1.6 — Tests + verify
- [ ] `dice.test.js`, `rollActions.test.js` (see above). Keep the zero-warning lint + `vitest run` green (existing CI gate).
- [ ] Manual: run one mock combat round on two devices — skill and spell rolls resolve correctly and show in the shared feed.

---

## Sequencing & rough effort (solo, with Claude Code/Cursor)
| Order | Task | Effort |
|---|---|---|
| 1 | 0.1–0.2 Provision + secrets + flag | ~half day |
| 2 | 0.4 Fix subscription staleness | ~1–2 hrs |
| 3 | 0.5 Sync status UI | ~half day |
| 4 | 0.3 Cloud roster hydrate | ~half day |
| 5 | 0.6 LWW containment | ~1–2 hrs |
| 6 | 0.7 Real-session smoke test | ~1 hr |
| 7 | 1.1–1.2 dice + resolvers (+tests) | ~half day |
| 8 | 1.3 PlayMode tap-to-roll (skills+spells) | ~half day |
| 9 | 1.4 Shared roll log | ~half day |
| — | Attack roll | unblocks on your rule, ~2 hrs |

Ship Phase 0 (1–6) as one release, Phase 1 (7–9) as the next.

## Risks / watch-items
- **Secrets in CI are the true gate** — flag-on without them silently does nothing.
- **Bearer tokens** in `#c=` links are live read/write credentials; `rotate_token` is the only revoke. Fine for a home game; don't post links publicly.
- **No server-authoritative realtime** — acceptable now; revisit if you ever need anti-cheat or DB-persisted history (Phase 2 session log is the natural home).
- **Attack rule is the one true blocker** for combat rolls; everything else is unblocked.
