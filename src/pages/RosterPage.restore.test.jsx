import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const repo = vi.hoisted(() => ({ rows: [], create: vi.fn(), replace: vi.fn(), list: vi.fn(), print: vi.fn() }))
vi.mock('../utils/printCharacters.js', () => ({ openCharacterPrintWindow: repo.print }))
vi.mock('../utils/characterRepo.js', () => ({
  repoEnabled: () => true, listCharacters: repo.list, listPlayers: async () => [],
  assignPlayer: vi.fn(), deleteCharacter: vi.fn(), getCharacter: vi.fn(), saveCharacterData: vi.fn(),
  createCharacter: repo.create, replaceCharacterFromBackup: repo.replace, currentUserId: async () => 'player',
}))
import RosterPage from './RosterPage.jsx'
import { AuthContext } from '../auth/AuthProvider.jsx'
import { createDefaultCharacter } from '../utils/defaultCharacter.js'
import { loadCurrent } from '../utils/rosterStorage.js'
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container, navigate
const existing = () => ({ ...createDefaultCharacter(), name:'Oryn Vesh', _rosterId:'old', _ownerUserId:'player', _dataRev:3, _liveRev:5 })
const backup = () => ({ ...createDefaultCharacter(), name:'Oryn backup', _rosterId:'old', hitPoints:{total:40,current:17}, backstory:'Recovered history', _notes:[{id:'n',title:'Recovered',body:'Complete note',lastEdited:''}] })
const button = label => [...container.querySelectorAll('button')].find(b => b.textContent.trim() === label)
async function click(label) { await act(async () => button(label).click()) }
async function render() { await act(async () => root.render(<AuthContext.Provider value={{ user:{id:'player'}, role:'player' }}><RosterPage onNavigate={navigate} theme="dark" onToggleTheme={vi.fn()} /></AuthContext.Provider>)) }
async function restore(records) {
  const input = container.querySelector('input[type="file"]')
  Object.defineProperty(input,'files',{configurable:true,value:[{text:async () => JSON.stringify({_type:'sidherun-roster-backup',characters:records,_gmKey:'do-not-import',_cloudMap:{secret:'ignored'}})}]})
  await act(async () => input.dispatchEvent(new Event('change',{bubbles:true})))
}
beforeEach(() => {
  const data = new Map(); vi.stubGlobal('localStorage',{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)})
  container=document.createElement('div');document.body.append(container);root=createRoot(container);navigate=vi.fn()
  repo.rows=[existing()]; repo.list.mockReset().mockImplementation(async()=>repo.rows)
  repo.print.mockReset().mockReturnValue(true)
  repo.create.mockReset().mockImplementation(async c=>{ const saved={...c,_rosterId:'new',_ownerUserId:'player',_dataRev:0,_liveRev:0};repo.rows=[...repo.rows,saved];return saved })
  repo.replace.mockReset().mockImplementation(async(target,c)=>{const saved={...target,...c,_rosterId:target._rosterId};repo.rows=repo.rows.map(r=>r._rosterId===target._rosterId?saved:r);return saved})
})
afterEach(()=>{act(()=>root.unmount());container.remove();vi.restoreAllMocks();vi.unstubAllGlobals()})
it('previews without writes, imports a new cloud copy, then loads it after a fresh roster mount',async()=>{
  await render(); await restore([backup()])
  expect(repo.create).not.toHaveBeenCalled();expect(repo.replace).not.toHaveBeenCalled()
  expect(localStorage.getItem('sidherun_gm_key')).toBeNull()
  await click('Import new copies')
  expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({_rosterId:null,name:'Oryn backup'}),expect.objectContaining({ownerUserId:'player'}))
  expect(repo.rows.find(c=>c._rosterId==='old').name).toBe('Oryn Vesh')
  await click('Done')
  act(()=>root.unmount());root=createRoot(container);await render()
  expect(container.textContent).toContain('Oryn backup')
  const card=[...container.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='More options for Oryn backup')?.parentElement.parentElement
  expect(card).toBeDefined()
  const load=[...card.querySelectorAll('button')].find(b=>b.textContent.trim()==='Load')
  await act(async()=>load.click())
  expect(navigate).toHaveBeenCalledWith('app')
  expect(loadCurrent('player').backstory).toBe('Recovered history')
  expect(loadCurrent('player').hitPoints.current).toBe(17)
  await act(async () => card.querySelector('[aria-label="More options for Oryn backup"]').click())
  await click('Print sheet')
  await click('Print 1 sheet')
  expect(repo.print).toHaveBeenCalledWith([expect.objectContaining({ name:'Oryn backup', _rosterId:'new', backstory:'Recovered history', hitPoints:expect.objectContaining({current:17}) })], 'Oryn backup')
})
it('requires explicit target selection and confirmation before replacement',async()=>{
  await render();await restore([backup()])
  const radio=container.querySelectorAll('input[type="radio"]')[1]
  act(()=>radio.click())
  expect(button('Review replacements').disabled).toBe(true)
  const select=container.querySelector('select')
  act(()=>{select.value='old';select.dispatchEvent(new Event('change',{bubbles:true}))})
  await click('Review replacements')
  expect(repo.replace).not.toHaveBeenCalled()
  expect(container.textContent).toContain('Changes made since this backup may be lost')
  expect(button('Replace selected characters').disabled).toBe(true)
  act(() => container.querySelector('input[type="checkbox"]').click())
  await click('Replace selected characters')
  expect(repo.create).not.toHaveBeenCalled()
  expect(repo.replace).toHaveBeenCalledWith(expect.objectContaining({_rosterId:'old',_dataRev:3,_liveRev:5}),expect.objectContaining({name:'Oryn backup'}),expect.objectContaining({signal:expect.anything()}))
})
it('reports partial failures and keeps the visible roster limited to cloud rows',async()=>{
  await render();repo.create.mockRejectedValueOnce(new Error('Permission denied'))
  await restore([backup(),{...backup(),name:'Second backup'}]);await click('Import new copies')
  expect(container.textContent).toContain('Permission denied')
  expect(container.textContent).toContain('1 saved to the cloud. 1 failed.')
  await click('Done')
  expect(container.textContent).not.toContain('Oryn backup')
  expect(container.textContent).toContain('Second backup')
})
it('never claims roster refresh succeeded when it fails after an import',async()=>{
  await render();await restore([backup()]);repo.list.mockRejectedValueOnce(new Error('offline'))
  await click('Import new copies')
  expect(container.textContent).toContain('Could not refresh the roster')
  expect(container.textContent).toContain('Reload to see the cloud records')
})
