import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import RosterMoreActions from './RosterMoreActions.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let container, root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})
it('closes after an action, on Escape with restored focus, and on outside pointer', () => {
  const action = vi.fn()
  act(() => root.render(<RosterMoreActions grouped><button onClick={action}>Print</button></RosterMoreActions>))
  const details = container.querySelector('details')
  details.open = true
  act(() => container.querySelector('button').click())
  expect(action).toHaveBeenCalledOnce()
  expect(document.activeElement).toBe(container.querySelector('summary'))
  expect(details.open).toBe(false)
  details.open = true
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  expect(details.open).toBe(false)
  expect(document.activeElement).toBe(container.querySelector('summary'))
  details.open = true
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  expect(details.open).toBe(false)
})
it('leaves player actions directly visible', () => {
  act(() => root.render(<RosterMoreActions grouped={false}><button>Print</button></RosterMoreActions>))
  expect(container.querySelector('details')).toBeNull()
  expect(container.querySelector('button').textContent).toBe('Print')
})
