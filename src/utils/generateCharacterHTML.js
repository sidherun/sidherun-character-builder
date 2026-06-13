import { calcDefense, calcHitPoints, calcMana, attrTotal, calcSkillTotal } from './characterDerived.js'

const ATTR_LABELS = {
  strength: 'STR', agility: 'AGI', dexterity: 'DEX', endurance: 'END',
  constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', thaumaturgy: 'THA',
  enlightenment: 'EN', charisma: 'CHA', comeliness: 'COM', fame: 'FAM',
}

export function generateCharacterHTML(character) {
  const defense   = calcDefense(character)
  const hp        = character.hitPoints?.total || calcHitPoints(character)
  const mana      = character.hasMagic ? (character.mana?.total || calcMana(character)) : null
  const sp        = character.storyPoints?.total || 2

  const attrs = Object.entries(character.attributes).map(([key, val]) =>
    `<div class="attr"><span>${ATTR_LABELS[key] || key}</span><strong>${attrTotal(val)}</strong></div>`
  ).join('')

  const weapons = (character.weapons || []).map(w =>
    `<tr><td>${w.name || '—'}</td><td>${w.attribute}</td><td>+${(w.attributeBonus||0)+(w.skillBonus||0)}</td><td>${w.descriptor}</td></tr>`
  ).join('')

  const skills = (character.skills || []).map(s =>
    `<tr><td>${s.isSpecialty ? '★ ' : ''}${s.name || '—'}</td><td>${s.attributeName}</td><td>${calcSkillTotal(s)}</td></tr>`
  ).join('')

  const powers = (character.powers || []).map(p =>
    `<tr><td>${p.name||'—'}</td><td>+${(p.base||0)+(p.attributeBonus||0)+(p.skillBonus||0)+(p.misc||0)}</td><td>${p.description}</td></tr>`
  ).join('')

  const crafts = (character.crafts || []).map(c =>
    `<tr><td>${c.name||'—'}</td><td>${c.attributeName}</td><td>${(c.attributeValue||0)+(c.skillBonus||0)+(c.misc||0)}</td><td>${c.description}</td></tr>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${character.name || 'Character'} — Sidherun</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;1,400&display=swap');
  :root { --gold: #c8a84b; --ink: #1a1208; --parchment: #f5ead0; --crimson: #8b1a1a; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--parchment); color: var(--ink); font-family: 'EB Garamond', serif; font-size: 14px; padding: 20px; }
  h1 { font-family: 'Cinzel', serif; font-size: 24px; color: var(--ink); }
  h2 { font-family: 'Cinzel', serif; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gold); border-bottom: 1px solid var(--gold); padding-bottom: 3px; margin: 16px 0 8px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid var(--gold); padding-bottom: 12px; }
  .subtitle { color: #3d2b0a; font-style: italic; font-size: 13px; text-transform: capitalize; }
  .resources { display: flex; gap: 20px; margin-bottom: 16px; }
  .res { text-align: center; border: 1px solid var(--gold); padding: 8px 16px; border-radius: 4px; }
  .res-label { font-family: 'Cinzel', serif; font-size: 10px; text-transform: uppercase; color: #8b6914; display: block; }
  .res-val { font-family: 'Cinzel', serif; font-size: 20px; font-weight: 700; }
  .cols { display: grid; grid-template-columns: 1fr 1.5fr; gap: 20px; }
  .attrs { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; margin-bottom: 4px; }
  .attr { display: flex; justify-content: space-between; padding: 3px 6px; background: rgba(200,168,75,0.07); font-size: 13px; }
  .attr span { font-size: 11px; color: #8b6914; }
  .attr strong { font-family: 'Cinzel', serif; font-size: 13px; }
  .def-row { display: flex; justify-content: space-between; padding: 3px 6px; font-size: 13px; }
  .def-row strong { font-family: 'Cinzel', serif; color: var(--crimson); }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { font-family: 'Cinzel', serif; font-size: 10px; text-align: left; padding: 3px 6px; color: #8b6914; background: rgba(200,168,75,0.1); }
  td { padding: 3px 6px; border-bottom: 1px solid rgba(200,168,75,0.2); }
  .backstory { margin-top: 16px; border-top: 1px solid var(--gold); padding-top: 12px; line-height: 1.7; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${character.name || 'Unnamed Character'}</h1>
      <div class="subtitle">${character.race} · ${character.archetype} · Level ${character.level}</div>
    </div>
  </div>

  <div class="resources">
    <div class="res"><span class="res-label">Hit Points</span><span class="res-val">${hp}</span></div>
    ${mana !== null ? `<div class="res"><span class="res-label">Mana</span><span class="res-val">${mana}</span></div>` : ''}
    <div class="res"><span class="res-label">Story Pts</span><span class="res-val">${sp}</span></div>
    ${character.armor?.type !== 'none' ? `<div class="res"><span class="res-label">Armor</span><span class="res-val">${character.armor.absorption}/${character.armor.max}</span></div>` : ''}
    <div class="res"><span class="res-label">XP</span><span class="res-val">${(character.xp?.current||0).toLocaleString()}</span></div>
  </div>

  <div class="cols">
    <div>
      <h2>Attributes</h2>
      <div class="attrs">${attrs}</div>

      <h2>Defense</h2>
      ${['typical','prone','magic','psychic','other'].map(k =>
        `<div class="def-row"><span>${k}</span><strong>${defense[k]}</strong></div>`
      ).join('')}
    </div>
    <div>
      ${weapons ? `<h2>Weapons</h2><table><tr><th>Weapon</th><th>Attr</th><th>Bonus</th><th>Descriptor</th></tr>${weapons}</table>` : ''}
      ${skills  ? `<h2>Skills</h2><table><tr><th>Skill</th><th>Attribute</th><th>Total</th></tr>${skills}</table>` : ''}
      ${powers  ? `<h2>Powers</h2><table><tr><th>Power</th><th>Total</th><th>Description</th></tr>${powers}</table>` : ''}
      ${crafts  ? `<h2>Magic Crafts</h2><table><tr><th>Craft</th><th>Attribute</th><th>Total</th><th>Description</th></tr>${crafts}</table>` : ''}
    </div>
  </div>

  ${character.backstory ? `<div class="backstory"><h2>Backstory</h2><p>${character.backstory}</p></div>` : ''}
</body>
</html>`
}
