import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import PrintDialog from './PrintDialog.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const roster = [
  { id: 'a', name: 'Bella', tableIds: ['t1'] },
  { id: 'b', name: 'Dulu', tableIds: [] },
]
const tables = [{ id: 't1', name: 'Thursday Table' }, { id: 't2', name: 'Empty Table' }]

describe('PrintDialog', () => {
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

  it('lists all and named-table scopes with current counts', () => {
    const html = renderToStaticMarkup(
      <PrintDialog mode="choose" roster={roster} tables={tables} tableCounts={{ t1: 1 }} onChoose={vi.fn()} onClose={vi.fn()} />,
    )
    expect(html).toContain('All characters')
    expect(html).toContain('Thursday Table')
    expect(html).toContain('Empty Table')
    expect(html).toContain('disabled')
    expect(html).toContain('2 sheets')
  })

  it('names the scope and exact count before printing', () => {
    const html = renderToStaticMarkup(
      <PrintDialog mode="confirm" roster={roster} tables={tables} tableCounts={{}} selection={{ label: 'Thursday Table', ids: ['a'] }} onConfirm={vi.fn()} onClose={vi.fn()} />,
    )
    expect(html).toContain('Print 1 character (Thursday Table)?')
    expect(html).toContain('Print 1 sheet')
  })

  it('returns exactly the selected table member ids', () => {
    const onChoose = vi.fn()
    act(() => root.render(
      <PrintDialog mode="choose" roster={roster} tables={tables} tableCounts={{ t1: 1 }} onChoose={onChoose} onClose={vi.fn()} />,
    ))
    const tableButton = [...container.querySelectorAll('button')].find(button => button.textContent.includes('Thursday Table'))
    act(() => tableButton.click())
    expect(onChoose).toHaveBeenCalledWith({ label: 'Thursday Table', ids: ['a'] })
  })

  it('confirms the reviewed print job', () => {
    const onConfirm = vi.fn()
    act(() => root.render(
      <PrintDialog mode="confirm" roster={roster} tables={tables} tableCounts={{}} selection={{ label: 'All characters', ids: ['a', 'b'] }} onConfirm={onConfirm} onClose={vi.fn()} />,
    ))
    const printButton = [...container.querySelectorAll('button')].find(button => button.textContent === 'Print 2 sheets')
    act(() => printButton.click())
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
