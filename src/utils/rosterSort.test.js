import { describe, it, expect } from 'vitest'
import { sortRoster } from './rosterSort.js'

const roster = [
  { id: '1', name: 'Zara', playerName: 'Bob', archetype: 'wizard' },
  { id: '2', name: 'Alda', playerName: '', archetype: 'druid' },
  { id: '3', name: 'Mara', playerName: 'Ada', archetype: 'priest' },
  { id: '4', name: 'Boris', playerName: '', archetype: 'worldly' },
]
const names = (arr) => arr.map(e => e.name)

describe('sortRoster', () => {
  it('default name sort, players above the cut line', () => {
    const { withPlayer, noPlayer } = sortRoster(roster, 'name')
    expect(names(withPlayer)).toEqual(['Mara', 'Zara']) // with-player, A→Z by name
    expect(names(noPlayer)).toEqual(['Alda', 'Boris'])  // no-player, A→Z by name
  })

  it('sorts by player name within the with-player group', () => {
    const { withPlayer } = sortRoster(roster, 'player')
    expect(names(withPlayer)).toEqual(['Mara', 'Zara']) // Ada < Bob
  })

  it('sorts by archetype, players still above the cut line', () => {
    const { withPlayer, noPlayer } = sortRoster(roster, 'archetype')
    expect(names(withPlayer)).toEqual(['Mara', 'Zara']) // priest < wizard
    expect(names(noPlayer)).toEqual(['Alda', 'Boris'])  // druid < worldly
  })

  it('breaks ties by character name', () => {
    const tied = [
      { id: 'a', name: 'Bea', playerName: 'X', archetype: 'mage' },
      { id: 'b', name: 'Abe', playerName: 'X', archetype: 'mage' },
    ]
    expect(names(sortRoster(tied, 'archetype').withPlayer)).toEqual(['Abe', 'Bea'])
  })

  it('treats whitespace-only / missing player as no-player', () => {
    const { noPlayer } = sortRoster([{ id: 'x', name: 'X', playerName: '  ' }, { id: 'y', name: 'Y' }], 'name')
    expect(names(noPlayer)).toEqual(['X', 'Y'])
  })
})
