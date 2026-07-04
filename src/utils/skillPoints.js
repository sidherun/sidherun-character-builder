// Sidherun skill-point budget (PHB pp.14-15). Guardrail v1 for the editable
// sheet (#178): SKILLS-ONLY pool (combat is pooled in the rulebook but the app
// stores weapons separately — unifying is deferred to the leveling engine #134).
//
// "Points" here = the dedicated skill points a player allocates (skillPoints on
// each skill), NOT the derived total (which also folds in the attribute).

// Cumulative total points available across skills at a given level.
const POOL = [30, 50, 70, 80, 90, 100, 110, 120, 125, 130] // levels 1..10
// Max points that may be ADDED to a single skill when leveling INTO that level.
const MAX_ADD = [15, 15, 10, 10, 10, 10, 10, 10, 5, 5]      // levels 1..10

const clampLevel = (level) => Math.max(1, Math.floor(level || 1))

// Cumulative point pool for a level. Level 11+ adds 5 per level over level 10.
export function poolSize(level) {
  const L = clampLevel(level)
  return L <= 10 ? POOL[L - 1] : POOL[9] + 5 * (L - 10)
}

// Per-skill add cap for a single level (5 from level 9 up).
export function maxAddPerSkill(level) {
  const L = clampLevel(level)
  return L <= 10 ? MAX_ADD[L - 1] : 5
}

// The absolute per-skill cap: the running sum of per-level add caps through the
// current level. e.g. L3 = 15+15+10 = 40 (Ed's "no skill may exceed 40").
export function cumulativeSkillCap(level) {
  const L = clampLevel(level)
  let cap = 0
  for (let i = 1; i <= L; i++) cap += maxAddPerSkill(i)
  return cap
}

// Budget snapshot for a character's skill allocation. Pure — no side effects.
//   used      total dedicated points across all skills
//   pool      points available at this level
//   available pool - used (the unspent points; negative when over)
//   remaining alias of available (kept for existing callers)
//   cap       per-skill cumulative cap at this level
//   maxAdd    per-skill add cap for THIS level
//   violations       skills whose dedicated points exceed the cumulative cap
//   perLevelAdds     skills that gained more than maxAdd since the last level-up
//                    (only when a _levelBaseline for this level exists)
//   overBudget over pool OR any per-skill / per-level violation (GM-visible)
export function skillBudget(character) {
  const level = clampLevel(character?.level)
  const skills = Array.isArray(character?.skills) ? character.skills : []
  const used = skills.reduce((n, s) => n + (Number(s?.skillPoints) || 0), 0)
  const pool = poolSize(level)
  const cap = cumulativeSkillCap(level)
  const maxAdd = maxAddPerSkill(level)
  const violations = skills
    .filter(s => (Number(s?.skillPoints) || 0) > cap)
    .map(s => ({ name: s.name || 'Unnamed', points: Number(s.skillPoints) || 0, cap }))

  // Per-level add check, only meaningful once a baseline for THIS level exists.
  const baseline = character?._levelBaseline
  const perLevelAdds = []
  if (baseline && baseline.level === level && baseline.points) {
    for (const s of skills) {
      const added = (Number(s?.skillPoints) || 0) - (Number(baseline.points[s.id]) || 0)
      if (added > maxAdd) perLevelAdds.push({ name: s.name || 'Unnamed', added, maxAdd })
    }
  }

  return {
    level,
    used,
    pool,
    available: pool - used,
    remaining: pool - used,
    cap,
    maxAdd,
    violations,
    perLevelAdds,
    overBudget: used > pool || violations.length > 0 || perLevelAdds.length > 0,
  }
}
