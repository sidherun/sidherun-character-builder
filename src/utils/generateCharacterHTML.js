import qrcode from 'qrcode-generator'
import { calcDefense, calcHitPoints, calcMana, attrTotal, calcSkillTotal, calcPowerTotal } from './characterDerived.js'
import { encodeCharacterToPlayURL } from './urlState.js'

const ATTR_LABELS = {
  strength: 'STR', agility: 'AGI', dexterity: 'DEX', endurance: 'END',
  constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', thaumaturgy: 'THA',
  enlightenment: 'EN', charisma: 'CHA', comeliness: 'COM', fame: 'FAM',
}

// Escape user-authored text so a stray < or & can't break the printout.
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// QR code linking to the character's #play= URL, generated at export time as an
// inline SVG so the printed/exported sheet stays fully self-contained (no CDN,
// no third-party API, works offline). Scanning it opens the character in Play
// Mode. Returns '' if the compressed URL is too large for a single QR.
function qrBlock(character) {
  try {
    const url = encodeCharacterToPlayURL(character)
    const qr = qrcode(0, 'L') // type 0 = auto-fit, error correction L = max capacity
    qr.addData(url)
    qr.make()
    const svg = qr.createSvgTag({ cellSize: 2, margin: 2, scalable: true })
    if (!svg || !svg.includes('<svg')) return ''
    return `<div class="qr">${svg}<div class="qr-label">Scan to play</div></div>`
  } catch {
    return ''
  }
}

// One character's sheet markup (no <html>/<head>), so it can be composed
// either as a single page or stacked into a batch print.
function sheetBody(character) {
  const defense = calcDefense(character)
  const hp      = character.hitPoints?.total || calcHitPoints(character)
  const mana    = character.hasMagic ? (character.mana?.total || calcMana(character)) : null
  const sp      = character.storyPoints?.total || 2

  const attrs = Object.entries(character.attributes || {}).map(([key, val]) =>
    `<div class="attr"><span>${ATTR_LABELS[key] || esc(key)}</span><strong>${attrTotal(val)}</strong></div>`
  ).join('')

  const weapons = (character.weapons || []).map(w =>
    `<tr><td>${esc(w.name) || '—'}</td><td>${esc(w.attribute)}</td><td>+${(w.attributeBonus||0)+(w.skillBonus||0)}</td><td>${esc(w.descriptor)}</td></tr>`
  ).join('')

  // "Use" tracking: 5 circles per skill, filled to the recorded count, the
  // rest left empty for the player to strike by hand during play.
  const useCircles = (s) => {
    const used = Math.max(0, Math.min(s.usePips || 0, 5))
    return '●'.repeat(used) + '○'.repeat(5 - used)
  }

  const skills = (character.skills || []).map(s =>
    `<tr><td>${s.isSpecialty ? '★ ' : ''}${esc(s.name) || '—'}</td><td>${esc(s.attributeName)}</td><td>${calcSkillTotal(s)}</td><td class="uses">${useCircles(s)}</td></tr>`
  ).join('')

  const powers = (character.powers || []).map(p =>
    `<tr><td>${esc(p.name)||'—'}</td><td>+${calcPowerTotal(p, character.attributes)}</td><td>${esc(p.description)}</td></tr>`
  ).join('')

  const crafts = (character.crafts || []).map(c =>
    `<tr><td>${esc(c.name)||'—'}</td><td>${esc(c.attributeName)}</td><td>${(c.attributeValue||0)+(c.skillBonus||0)+(c.misc||0)}</td><td>${esc(c.description)}</td></tr>`
  ).join('')

  // Inventory is forward-compatible: renders when the field exists (Session A
  // adds it to the schema). Accepts either strings or {name, quantity, notes}.
  const inv = (character.inventory || []).map(item => {
    if (typeof item === 'string') return `<tr><td>${esc(item)}</td><td></td><td></td></tr>`
    // quantity defaults to '' in the schema; treat empty/zero as "no quantity"
    // so an item without a count doesn't render a bare "×".
    const qty = item.quantity ? `×${esc(item.quantity)}` : ''
    return `<tr><td>${esc(item.name) || '—'}</td><td>${qty}</td><td>${esc(item.notes)}</td></tr>`
  }).join('')

  return `
  <section class="sheet">
    <div class="header">
      <div>
        <h1>${esc(character.name) || 'Unnamed Character'}</h1>
        <div class="subtitle">${esc(character.race)} · ${esc(character.archetype)} · Level ${esc(character.level)}</div>
      </div>
      ${qrBlock(character)}
    </div>

    <div class="resources">
      <div class="res"><span class="res-label">Hit Points</span><span class="res-val">${hp}</span></div>
      ${mana !== null ? `<div class="res"><span class="res-label">Mana</span><span class="res-val">${mana}</span></div>` : ''}
      <div class="res"><span class="res-label">Story Pts</span><span class="res-val">${sp}</span></div>
      ${character.armor?.type && character.armor.type !== 'none' ? `<div class="res"><span class="res-label">Armor</span><span class="res-val">${character.armor.absorption}/${character.armor.max}</span></div>` : ''}
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
        ${skills  ? `<h2>Skills</h2><table><tr><th>Skill</th><th>Attribute</th><th>Total</th><th>Use</th></tr>${skills}</table>` : ''}
        ${character.hasPowers && powers ? `<h2>Powers</h2><table><tr><th>Power</th><th>Total</th><th>Description</th></tr>${powers}</table>` : ''}
        ${character.hasMagic && crafts ? `<h2>Magic Crafts</h2><table><tr><th>Craft</th><th>Attribute</th><th>Total</th><th>Description</th></tr>${crafts}</table>` : ''}
        ${inv     ? `<h2>Inventory</h2><table><tr><th>Item</th><th>Qty</th><th>Notes</th></tr>${inv}</table>` : ''}
      </div>
    </div>

    ${character.backstory ? `<div class="backstory"><h2>Backstory</h2><p>${esc(character.backstory)}</p></div>` : ''}
  </section>`
}

const SHEET_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;1,400&display=swap');
  :root { --gold: #8a6d1f; --ink: #1a1208; --parchment: #f5ead0; --crimson: #7a1414; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #d9cba8; color: var(--ink); font-family: 'EB Garamond', serif; font-size: 14px; }
  .sheet { background: var(--parchment); padding: 24px; max-width: 800px; margin: 16px auto; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
  h1 { font-family: 'Cinzel', serif; font-size: 24px; color: var(--ink); }
  h2 { font-family: 'Cinzel', serif; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gold); border-bottom: 1px solid var(--gold); padding-bottom: 3px; margin: 16px 0 8px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid var(--gold); padding-bottom: 12px; }
  .subtitle { color: #3d2b0a; font-style: italic; font-size: 13px; text-transform: capitalize; }
  .qr { text-align: center; flex-shrink: 0; }
  .qr svg { width: 180px; height: 180px; display: block; background: #fff; padding: 6px; }
  .qr-label { font-family: 'Cinzel', serif; font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b520f; margin-top: 2px; }
  .resources { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
  .res { text-align: center; border: 1px solid var(--gold); padding: 8px 16px; border-radius: 4px; }
  .res-label { font-family: 'Cinzel', serif; font-size: 10px; text-transform: uppercase; color: #6b520f; display: block; }
  .res-val { font-family: 'Cinzel', serif; font-size: 20px; font-weight: 700; }
  .cols { display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; }
  .attrs { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; margin-bottom: 4px; }
  .attr { display: flex; justify-content: space-between; padding: 4px 6px; background: rgba(138,109,31,0.1); font-size: 13px; }
  .attr span { font-size: 11px; color: #6b520f; }
  .attr strong { font-family: 'Cinzel', serif; font-size: 13px; }
  .def-row { display: flex; justify-content: space-between; padding: 4px 6px; font-size: 13px; text-transform: capitalize; }
  .def-row strong { font-family: 'Cinzel', serif; color: var(--crimson); }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 4px; }
  th { font-family: 'Cinzel', serif; font-size: 10px; text-align: left; padding: 4px 6px; color: #6b520f; background: rgba(138,109,31,0.14); }
  td { padding: 4px 6px; border-bottom: 1px solid rgba(138,109,31,0.25); vertical-align: top; }
  td.uses { letter-spacing: 1px; color: var(--gold); font-size: 11px; white-space: nowrap; }
  .backstory { margin-top: 16px; border-top: 1px solid var(--gold); padding-top: 12px; line-height: 1.7; }
  .toolbar { position: sticky; top: 0; background: var(--ink); color: var(--parchment); padding: 12px 24px; display: flex; gap: 12px; align-items: center; font-family: 'Cinzel', serif; z-index: 10; }
  .toolbar button { font-family: 'Cinzel', serif; font-size: 13px; padding: 8px 18px; background: #c8a84b; color: var(--ink); border: none; border-radius: 4px; cursor: pointer; font-weight: 700; }
  .toolbar span { font-size: 13px; opacity: 0.85; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .sheet { box-shadow: none; margin: 0; max-width: none; padding: 0; page-break-after: always; }
    .sheet:last-of-type { page-break-after: auto; }
  }
  @page { margin: 12mm; }
`

function pageWrap(title, innerHTML, toolbar = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<style>${SHEET_CSS}</style>
</head>
<body>
${toolbar}
${innerHTML}
</body>
</html>`
}

// Single-character printable sheet (used by Step 9 export).
export function generateCharacterHTML(character) {
  return pageWrap(`${character.name || 'Character'} — Sidherun`, sheetBody(character))
}

// All characters in one printable document, one page each — the game-day
// "print all" deliverable. Includes a screen-only toolbar so the GM can
// trigger the browser print dialog with a single click (no popup-blocker
// timing issues from auto-calling window.print()).
export function generateBatchHTML(characters) {
  const sheets = (characters || []).map(sheetBody).join('\n')
  const toolbar = `<div class="toolbar">
    <button onclick="window.print()">🖨 Print all ${characters.length} sheets</button>
    <span>One character per page. Use your browser's "Save as PDF" to keep a copy.</span>
  </div>`
  return pageWrap(`Sidherun — ${characters.length} character sheets`, sheets, toolbar)
}
