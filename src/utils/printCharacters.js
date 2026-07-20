import { generateBatchHTML } from './generateCharacterHTML.js'

// Open a printable, one-sheet-per-page document. Dependencies are injectable
// so popup-block and cleanup behavior can be verified without a real browser.
export function openCharacterPrintWindow(characters, scopeLabel, deps = {}) {
  if (!Array.isArray(characters) || characters.length === 0) return false
  const createObjectURL = deps.createObjectURL || (blob => URL.createObjectURL(blob))
  const revokeObjectURL = deps.revokeObjectURL || (url => URL.revokeObjectURL(url))
  const openWindow = deps.openWindow || (url => window.open(url, '_blank'))
  const scheduleRevoke = deps.scheduleRevoke || (fn => setTimeout(fn, 60000))

  const html = generateBatchHTML(characters, scopeLabel)
  const url = createObjectURL(new Blob([html], { type: 'text/html' }))
  const opened = openWindow(url)
  if (!opened) {
    revokeObjectURL(url)
    return false
  }
  scheduleRevoke(() => revokeObjectURL(url))
  return true
}
