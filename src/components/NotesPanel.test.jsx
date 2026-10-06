import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import NotesPanel from './NotesPanel.jsx'
import { noteTitleForSave } from '../utils/noteTitle.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function fillTextarea(textarea, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
  setter.call(textarea, value)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

function fillInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function saveButton() {
  return [...document.body.querySelectorAll('button')].find(button => button.textContent === 'Save')
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

  it('gives a long backstory an unclipped reading surface', () => {
    const finalLine = 'The homecoming changes everything.'
    const longBackstory = `${'A long history of Völlur.\n\n'.repeat(80)}${finalLine}`
    renderPanel({ backstory: longBackstory })

    const body = container.querySelector('[class*="backstoryBody"]')
    expect(body).not.toBeNull()
    expect(body.textContent).toContain(finalLine)
    expect(body.className).toContain('backstoryBody')
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

describe('NotesPanel note save', () => {
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
      notes: [],
      backstory: '',
      onChange: vi.fn(),
      onBackstoryChange: vi.fn(),
      onClose: vi.fn(),
    }
    const merged = { ...defaults, ...props }
    act(() => root.render(<NotesPanel {...merged} />))
    return merged
  }

  function openNewNote() {
    act(() => [...container.querySelectorAll('button')].find(button => button.textContent === '+ New Note').click())
  }

  it('keeps Save disabled, with a reason, until the note has text', () => {
    renderPanel()
    openNewNote()

    const save = saveButton()
    expect(save.disabled).toBe(true)
    expect(container.querySelector('#note-save-hint').textContent).toMatch(/title or some note text/i)
    expect(save.getAttribute('aria-describedby')).toBe('note-save-hint')
  })

  it('saves a body-only note, using the first line as the title', () => {
    const props = renderPanel()
    openNewNote()

    act(() => fillTextarea(container.querySelector('#note-body'), 'The Empty Road\n1. The dog on the ridge.\n2. A winter market.'))
    const save = saveButton()
    expect(save.disabled).toBe(false)
    act(() => save.click())

    expect(props.onChange).toHaveBeenCalledTimes(1)
    const [saved] = props.onChange.mock.calls[0]
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      title: 'The Empty Road',
      body: 'The Empty Road\n1. The dog on the ridge.\n2. A winter market.',
    })
    expect(saved[0].id).toEqual(expect.any(String))
    expect(saved[0].lastEdited).toEqual(expect.any(String))
  })

  it('keeps an explicit title instead of replacing it with the first line', () => {
    const props = renderPanel()
    openNewNote()

    act(() => {
      fillInput(container.querySelector('#note-title'), 'The Empty Road')
      fillTextarea(container.querySelector('#note-body'), '1. The dog on the ridge.')
    })
    act(() => saveButton().click())

    const [saved] = props.onChange.mock.calls[0]
    expect(saved[0]).toMatchObject({
      title: 'The Empty Road',
      body: '1. The dog on the ridge.',
    })
  })

  it('updates an existing note when the title is cleared but the body remains', () => {
    const props = renderPanel({
      notes: [{ id: 'note-1', title: 'Session 1', body: 'Met at the inn.', lastEdited: '' }],
    })

    act(() => container.querySelector('button[aria-label="Edit note: Session 1"]').click())
    act(() => {
      fillInput(container.querySelector('#note-title'), '   ')
      fillTextarea(container.querySelector('#note-body'), 'Remembered on the road.')
    })
    act(() => saveButton().click())

    const [saved] = props.onChange.mock.calls[0]
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      id: 'note-1',
      title: 'Remembered on the road.',
      body: 'Remembered on the road.',
    })
  })
})

describe('noteTitleForSave', () => {
  it('caps a long first line used as a heading', () => {
    const firstLine = 'A'.repeat(120)
    expect(noteTitleForSave({ title: '', body: `${firstLine}\nsecond` })).toBe(`${'A'.repeat(79)}…`)
  })

  it('returns an empty heading when the draft is blank', () => {
    expect(noteTitleForSave({ title: '  ', body: '\n  \n' })).toBe('')
  })
})
