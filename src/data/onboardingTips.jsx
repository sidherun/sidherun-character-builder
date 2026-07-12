// Plain-language "what does this step mean" copy for the first-character guide
// (#onboarding), keyed by wizard step number (character.wizardStep, 1-9 — NOT
// the visible step index, since Powers/Magic (5/6) are conditionally hidden but
// keep their fixed numbers). See src/components/OnboardingTip.jsx for rendering.
//
// Every claim is grounded in the golden pages (rules/) — each tip cites its
// chapter, and audited quotes back each statement (see #198-era audit in the
// onboarding PR). Numbers are interpolated from the real skill-point rules
// (src/utils/skillPoints.js) rather than hardcoded, so this copy can't drift
// from the actual PHB math.
import { poolSize, maxAddPerSkill } from '../utils/skillPoints.js'

const LEVEL_1_POOL = poolSize(1)
const LEVEL_1_MAX_ADD = maxAddPerSkill(1)

export const ONBOARDING_TIPS = {
  1: {
    title: 'Welcome to Sidherun',
    body: "You're about to create your first Sidherun hero — it takes about ten minutes, and all you need is a concept; the app does the math. One rule to know going in: nearly everything is a d100 roll where you match or beat the GM's target. Spellcasting is the one exception (you roll under). Everything stays editable later.",
    source: 'PHB 2.8 · Dice Rolling (ch. 1)',
  },
  2: {
    title: 'Identity',
    body: 'Your archetype is a starter story, not a straitjacket — the rules call it "healthy guardrails" around the character you want to play, so pick the role that sounds fun (fighter, wizard, druid, rogue…). Race mainly sets the base of your Hit Points. A name is required before you can move on.',
    source: 'PHB 2.8 · Archetypes (ch. 3) · Hit Points (ch. 5)',
  },
  3: {
    title: 'Attributes',
    body: 'Ten of the twelve attributes are core; Comeliness and Fame are social extras. The PHB’s starting guideline: aim for an average of 15 across the ten core attributes. Physical heroes lean on Strength, Physical Agility and Endurance; casters need their casting attribute high (Thaumaturgy drives arcane magic, Enlightenment divine, Intellect psychic). Attributes feed your HP, Mana and Defense automatically.',
    source: 'PHB 2.8 · Attributes (ch. 4)',
  },
  4: {
    title: 'Combat',
    body: 'In this app a weapon rolls off its skill or its governing attribute, whichever the "Uses skill" flag selects. Armor absorbs a fixed number of points per blow and loses that much durability each time it soaks — when durability runs out, the armor is useless.',
    source: 'PHB 2.8 · Combat Essentials (ch. 7) · Armor (ch. 14)',
  },
  5: {
    title: 'Powers',
    body: 'The PHB leaves powers open-ended: they show up as bonus sources — its example is a power granting "skin as tough as bark" for +5 Typical Defense. Record anything innate or supernatural here and agree its effect with your GM. Not every hero has powers; skip freely.',
    source: 'PHB 2.8 · Combat Essentials (ch. 7)',
  },
  6: {
    title: 'Magic',
    body: 'The app organizes casting into crafts, each with its own governing attribute — per the PHB you cast with whichever attribute governs your practice (Thaumaturgy arcane, Enlightenment divine, Intellect psychic…). Casting inverts the usual rule: roll UNDER your Spell Target, which depends on your level vs the target’s — and in red-zone matchups your attribute doesn’t help at all, so mind the color. Your Mana equals your casting attribute.',
    source: 'PHB 2.8 · Magic & Spellcasting (ch. 16) · Mana (ch. 19)',
  },
  7: {
    title: 'Skills',
    body: `You have ${LEVEL_1_POOL} skill points at level 1, at most ${LEVEL_1_MAX_ADD} in any one skill — pick skills that tell your hero's story. Strike a use circle each time a skill comes up in play: hit your level's usage target and the skill earns bonus points at level-up.`,
    source: 'PHB 2.8 · Skills (ch. 6)',
  },
  8: {
    title: 'Resources',
    body: 'HP, Mana and Defense are calculated from your attributes — you rarely touch them here. Story Points are Sidherun’s luck currency: every hero starts with 2. Spend 1 to re-roll any roll (or add a second roll to the first); spend 2 to force an automatic 100, declared before you roll.',
    source: 'PHB 2.8 · Story Points (ch. 10)',
  },
  9: {
    title: 'Review',
    body: 'Look everything over, then hit Complete — your hero is saved to the roster. From there, Enter Play Mode for live play: HP tracking, dice rolls, casting. Each section stays editable, so nothing here is final.',
  },
}

// Returns the tip for a wizard step, or null when there isn't one.
export function getOnboardingTip(step) {
  return ONBOARDING_TIPS[step] || null
}
