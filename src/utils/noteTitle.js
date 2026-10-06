const MAX_DERIVED_TITLE = 80

// A title is the note's heading, but a player can write the body first. Session
// 02 hit this at the table: the note text was entered, Save stayed disabled
// until a title existed, and the button looked non-interactive (#371). When
// the title is blank, the first line of the body becomes the heading so the
// note still saves.
export function noteTitleForSave(draft) {
  const explicit = (draft?.title || '').trim()
  if (explicit) return explicit
  const firstLine = String(draft?.body || '')
    .split('\n')
    .map(line => line.trim())
    .find(Boolean) || ''
  if (!firstLine) return ''
  if (firstLine.length <= MAX_DERIVED_TITLE) return firstLine
  return `${firstLine.slice(0, MAX_DERIVED_TITLE - 1)}…`
}
