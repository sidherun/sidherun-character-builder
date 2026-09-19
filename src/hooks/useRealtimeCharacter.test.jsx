import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({ subscriptions: new Map(), unsubscribe: vi.fn() }))

vi.mock('../utils/supabaseClient.js', () => ({ cloudEnabled: true }))
vi.mock('../utils/cloudSync.js', () => ({
  getCloudMap: () => ({ a: { id: 'a' }, b: { id: 'b' } }),
  subscribeCharacter: (id, live, data) => h.subscriptions.set(id, { live, data }),
  unsubscribeCharacter: h.unsubscribe,
}))

import { useRealtimeCharacter } from './useRealtimeCharacter.js'

function Probe({ rosterId, onLive, onData }) {
  useRealtimeCharacter(rosterId, onLive, onData)
  return null
}

beforeEach(() => {
  h.subscriptions.clear()
  h.unsubscribe.mockReset()
})

it('keeps the subscribed character id on a late callback after switching characters', async () => {
  const onLive = vi.fn()
  const onData = vi.fn()
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () => { root.render(<Probe rosterId="a" onLive={onLive} onData={onData} />) })
  const lateA = h.subscriptions.get('a')

  await act(async () => { root.render(<Probe rosterId="b" onLive={onLive} onData={onData} />) })
  lateA.live({ live: { hpCurrent: 1 } })
  lateA.data()

  expect(onLive).toHaveBeenCalledWith({ live: { hpCurrent: 1 } }, 'a')
  expect(onData).toHaveBeenCalledWith('a')
  act(() => root.unmount())
})
