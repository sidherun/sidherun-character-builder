const makeAttr = () => ({ base: 0, racialMod: 0, tempMod: 0 })

export function createDefaultCharacter() {
  return {
    wizardStep: 1,
    _rosterId: null,

    // Step 2
    name: '',
    playerName: '',
    race: 'human',
    raceType: 'healthy',
    raceValue: 20,
    raceSize: 'medium',
    archetype: 'worldly',
    customArchetypeName: '',
    hasPowers: false,
    hasMagic: false,
    magicAttribute: null,
    level: 1,
    ageCategory: 'adult',
    backstory: '',

    // Step 3
    attributes: {
      strength:      makeAttr(),
      agility:       makeAttr(),
      dexterity:     makeAttr(),
      endurance:     makeAttr(),
      constitution:  makeAttr(),
      intelligence:  makeAttr(),
      wisdom:        makeAttr(),
      thaumaturgy:   makeAttr(),
      enlightenment: makeAttr(),
      charisma:      makeAttr(),
      comeliness:    makeAttr(),
      fame:          makeAttr(),
    },

    // Step 4
    weapons: [],
    armor: { type: 'none', absorption: 0, remaining: 0, max: 0 },
    shield: 'none',
    defense: {
      typical:  { skillBonus: 0, misc: 0 },
      prone:    { skillBonus: 0, misc: 0 },
      magic:    { skillBonus: 0, misc: 0 },
      psychic:  { skillBonus: 0, misc: 0 },
      other:    { base: 0, skillBonus: 0, misc: 0 },
    },

    // Step 5
    powers: [],

    // Step 6
    crafts: [],

    // Step 7
    skills: [],
    inventory: [],

    // Step 8
    hitPoints:   { total: 0, current: 0 },
    mana:        { total: 0, current: 0 },
    storyPoints: { total: 2, current: 2 },
    xp:          { current: 0, needed: 1000 },

    // Internal
    _notes: [],
    _tracking: { hp: 0, mana: 0, storyPoints: 2 },
  }
}
