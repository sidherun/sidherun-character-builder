import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import NotesPanel from './NotesPanel.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function fillTextarea(textarea, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
  setter.call(textarea, value)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('NotesPanel backstory note', () => {
  let container
  let root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function renderPanel(props = {}) {
    const defaults = {
      notes: [{ id: 'note-1', title: 'Session 1', body: 'Met at the inn.', lastEdited: '' }],
      backstory: 'Raised in the deep wood.',
      onChange: vi.fn(),
      onBackstoryChange: vi.fn(),
      onClose: vi.fn(),
    }
    const merged = { ...defaults, ...props }
    act(() => root.render(<NotesPanel {...merged} />))
    return merged
  }

  it('pins a distinctly marked backstory before ordinary notes', () => {
    renderPanel()

    const cards = container.querySelectorAll('[class*="noteCard"]')
    expect(cards).toHaveLength(2)
    expect(cards[0].textContent).toContain('Backstory')
    expect(cards[0].textContent).toContain('Synced')
    expect(cards[0].textContent).toContain('Raised in the deep wood.')
    expect(cards[0].className).toContain('backstoryCard')
    expect(cards[1].textContent).toContain('Session 1')
  })

  it('writes backstory edits through the canonical backstory callback', () => {
    const props = renderPanel()

    act(() => container.querySelector('button[aria-label="Edit character backstory"]').click())
    const title = container.querySelector('#note-title')
    expect(title.value).toBe('Backstory')
    expect(title.readOnly).toBe(true)

    act(() => fillTextarea(container.querySelector('#note-body'), 'A revised history.'))
    act(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Save').click())

    expect(props.onBackstoryChange).toHaveBeenCalledWith('A revised history.')
    expect(props.onChange).not.toHaveBeenCalled()
  })

  it('omits the special note when the character has no backstory', () => {
    renderPanel({ backstory: '  ' })

    expect(container.textContent).not.toContain('Backstory')
    expect(container.textContent).toContain('Session 1')
  })
})
