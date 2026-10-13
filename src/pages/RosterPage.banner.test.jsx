import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import RosterPage from './RosterPage.jsx'
import { createDefaultCharacter } from '../utils/defaultCharacter.js'
const auth = vi.hoisted(() => ({ role: 'admin', user: {id:'preview',email:'preview@example.test'} }))
vi.mock('../auth/useAuth.js', () => ({ useAuth: () => auth, isGmOrAdmin: r => ['gm','admin'].includes(r), isAdmin: r => r === 'admin' }))
vi.mock('../utils/characterRepo.js', () => ({ repoEnabled: () => true, listCharacters: vi.fn(), listPlayers: async () => [], assignPlayer: vi.fn(), deleteCharacter: vi.fn(), getCharacter: vi.fn(), saveCharacterData: vi.fn() }))
import { listCharacters } from '../utils/characterRepo.js'
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container
beforeEach(() => {
  vi.stubGlobal('localStorage', {getItem:()=>null,setItem:vi.fn(),removeItem:vi.fn()})
  listCharacters.mockResolvedValue([{...createDefaultCharacter(),_rosterId:'test',name:'Preview'}])
  container=document.createElement('div');document.body.appendChild(container);root=createRoot(container)
})
afterEach(() => { act(()=>root.unmount());container.remove();vi.unstubAllGlobals() })
for (const role of ['admin','gm','player']) it(`preserves ${role} permissions and places actions correctly`, async () => {
  auth.role=role
  await act(async()=>root.render(<RosterPage theme="dark" onToggleTheme={vi.fn()} onNavigate={vi.fn()} />))
  const header=container.querySelector('header')
  const labels=[...header.querySelectorAll('button')].map(b=>b.textContent.trim())
  expect(labels.includes('Manage Roles')).toBe(role==='admin')
  expect(labels.includes('GM Screen')).toBe(role!=='player')
  const more=header.querySelector('details:has(summary.btn-secondary)')
  if (role==='player') expect(more).toBeNull()
  else {
    expect(more).not.toBeNull()
    expect(more.textContent).toContain('Print…')
    expect(more.textContent).toContain('Restore…')
    expect(more.textContent).not.toContain('Tables')
    expect(more.textContent).not.toContain('New Character')
  }
})
