import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import StoryPoints from './StoryPoints.jsx'
import { applyStoryPointOp } from '../utils/storyPoints.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function typeInto(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

// Stateful harness: applies ops the way the review page / Play mode do.
function Harness({ initial, onOp, readOnly }) {
  const [sp, setSp] = useState(initial)
  return (
    <StoryPoints
      storyPoints={sp}
      readOnly={readOnly}
      onOp={op => { onOp?.(op); setSp(prev => applyStoryPointOp(prev, op)) }}
    />
  )
}

describe('StoryPoints tile + modal (#377)', () => {
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

  const entries = [
    { id: 'a', active: false, reason: 'spent at the gate' },
    { id: 'b', active: true, reason: 'saved the mule' },
    { id: 'c', active: true, reason: 'spot award' },
  ]

  function render(props = {}) {
    const onOp = vi.fn()
    act(() => root.render(<Harness initial={{ total: 3, current: 2, entries }} onOp={onOp} {...props} />))
    return onOp
  }
  const tile = () => container.querySelector('button[aria-haspopup="dialog"]')
  const dialog = () => container.querySelector('[role="dialog"]')
  const open = () => act(() => tile().click())
  const reasons = () => [...dialog().querySelectorAll('input[type="text"]')].map(i => i.value)
  const toggles = () => [...dialog().querySelectorAll('button[aria-pressed]')]

  it('tile shows only the number of active points', () => {
    render()
    expect(tile().textContent).toBe('Story Pts2')
    expect(dialog()).toBeNull()
  })

  it('clicking the tile opens the modal with active points above spent ones', () => {
    render()
    open()
    expect(dialog()).not.toBeNull()
    expect([...dialog().querySelectorAll('th')].map(th => th.textContent)).toEqual(['Story Point', 'Reason', 'Remove'])
    expect(reasons()).toEqual(['saved the mule', 'spot award', 'spent at the gate'])
    expect(toggles().map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'false'])
  })

  it('toggling a point updates the tile count and re-sorts the list', () => {
    const onOp = render()
    open()
    act(() => toggles()[0].click())
    expect(onOp).toHaveBeenCalledWith({ type: 'toggle', id: 'b' })
    expect(tile().textContent).toBe('Story Pts1')
    expect(reasons()).toEqual(['spot award', 'spent at the gate', 'saved the mule'])
  })

  it('saves a reason when the field loses focus, not on every keystroke', () => {
    const onOp = render()
    open()
    const input = dialog().querySelector('input[type="text"]')
    act(() => typeInto(input, 'saved the mule twice'))
    expect(onOp).not.toHaveBeenCalled()
    act(() => { input.focus(); input.blur() })
    expect(onOp).toHaveBeenCalledWith({ type: 'reason', id: 'b', reason: 'saved the mule twice' })
  })

  it('keeps an unsaved reason when the modal is closed with Done', () => {
    const onOp = render()
    open()
    act(() => typeInto(dialog().querySelector('input[type="text"]'), 'edited'))
    act(() => [...dialog().querySelectorAll('button')].find(b => b.textContent === 'Done').click())
    expect(onOp).toHaveBeenCalledWith({ type: 'reason', id: 'b', reason: 'edited' })
    expect(dialog()).toBeNull()
  })

  it('adding a point adds an active row and raises the count', () => {
    render()
    open()
    act(() => [...dialog().querySelectorAll('button')].find(b => b.textContent === '+ Add story point').click())
    expect(toggles()).toHaveLength(4)
    expect(tile().textContent).toBe('Story Pts3')
  })

  it('deleting asks for confirmation first', () => {
    const onOp = render()
    open()
    act(() => dialog().querySelector('button[aria-label="Delete story point 3"]').click())
    expect(onOp).not.toHaveBeenCalled()
    act(() => [...dialog().querySelectorAll('button')].find(b => b.textContent === 'Keep').click())
    expect(toggles()).toHaveLength(3)

    act(() => dialog().querySelector('button[aria-label="Delete story point 3"]').click())
    act(() => [...dialog().querySelectorAll('button')].find(b => b.textContent === 'Delete').click())
    expect(onOp).toHaveBeenCalledWith({ type: 'delete', id: 'a' })
    expect(reasons()).toEqual(['saved the mule', 'spot award'])
  })

  it('Escape closes the modal and returns focus to the tile', () => {
    render()
    open()
    act(() => dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(tile())
  })

  it('read-only viewers can see reasons but not change anything', () => {
    render({ readOnly: true })
    open()
    expect(reasons()).toEqual(['saved the mule', 'spot award', 'spent at the gate'])
    expect(toggles().every(b => b.disabled)).toBe(true)
    expect(dialog().querySelector('button[aria-label^="Delete"]')).toBeNull()
    expect([...dialog().querySelectorAll('button')].some(b => b.textContent === '+ Add story point')).toBe(false)
  })

  it('characters saved before the list existed open with blank reasons', () => {
    act(() => root.render(<Harness initial={{ total: 2, current: 1 }} />))
    expect(tile().textContent).toBe('Story Pts1')
    open()
    expect(toggles().map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'false'])
    expect(reasons()).toEqual(['', ''])
  })
})
