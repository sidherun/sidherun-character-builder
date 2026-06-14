import { z } from 'zod'

const attrSchema = z.object({
  base:      z.number().int().min(0).default(0),
  racialMod: z.number().int().default(0),
  tempMod:   z.number().int().default(0),
})

const weaponSchema = z.object({
  id:           z.string(),
  name:         z.string(),
  attribute:    z.string(),
  attributeBonus: z.number().int().default(0),
  skillBonus:   z.number().int().default(0),
  descriptor:   z.string().default(''),
})

const armorSchema = z.object({
  type:       z.string().default('none'),
  absorption: z.number().int().default(0),
  remaining:  z.number().int().default(0),
  max:        z.number().int().default(0),
})

const defenseTypeSchema = z.object({
  skillBonus: z.number().int().default(0),
  misc:       z.number().int().default(0),
})

const powerSchema = z.object({
  id:             z.string(),
  name:           z.string(),
  attributeType:  z.string().default(''),
  powerBonus:     z.number().int().default(0),
  // legacy fields — kept so old saved characters still validate
  base:           z.number().int().default(0),
  attributeBonus: z.number().int().default(0),
  skillBonus:     z.number().int().default(0),
  misc:           z.number().int().default(0),
  description:    z.string().default(''),
})

const craftSchema = z.object({
  id:             z.string(),
  name:           z.string(),
  attributeName:  z.string(),
  attributeValue: z.number().int().default(0),
  skillBonus:     z.number().int().default(0),
  misc:           z.number().int().default(0),
  description:    z.string().default(''),
})

const skillSchema = z.object({
  id:             z.string(),
  name:           z.string(),
  attributeName:  z.string(),
  attributeScore: z.number().int().default(0),
  skillPoints:    z.number().int().min(0).max(15).default(0),
  tempMod:        z.number().int().default(0),
  isSpecialty:    z.boolean().default(false),
  usePips:        z.number().int().min(0).max(10).default(0),
})

const inventoryItemSchema = z.union([
  z.string(),
  z.object({
    name:     z.string(),
    quantity: z.union([z.string(), z.number()]).default(''),
    notes:    z.string().default(''),
  }),
])

const noteSchema = z.object({
  id:          z.string(),
  title:       z.string().default(''),
  body:        z.string().default(''),
  lastEdited:  z.string().default(''),
})

export const characterSchema = z.object({
  wizardStep:  z.number().int().min(1).max(9).default(1),
  _rosterId:   z.string().nullable().default(null),

  name:           z.string().default(''),
  race:           z.string().default('human'),
  raceType:       z.string().default('healthy'),
  raceValue:      z.number().int().default(20),
  raceSize:       z.string().default('medium'),
  archetype:            z.string().default('worldly'),
  customArchetypeName:  z.string().default(''),
  hasPowers:            z.boolean().default(false),
  hasMagic:             z.boolean().default(false),
  magicAttribute:       z.string().nullable().default(null),
  level:          z.number().int().min(1).max(20).default(1),
  ageCategory:    z.string().default('adult'),
  backstory:      z.string().default(''),

  attributes: z.object({
    strength:      attrSchema,
    agility:       attrSchema,
    dexterity:     attrSchema,
    endurance:     attrSchema,
    constitution:  attrSchema,
    intelligence:  attrSchema,
    wisdom:        attrSchema,
    thaumaturgy:   attrSchema,
    enlightenment: attrSchema,
    charisma:      attrSchema,
    comeliness:    attrSchema,
    fame:          attrSchema,
  }),

  weapons: z.array(weaponSchema).default([]),
  armor:   armorSchema.default({ type: 'none', absorption: 0, remaining: 0, max: 0 }),
  shield:  z.string().default('none'),
  defense: z.object({
    typical:  defenseTypeSchema,
    prone:    defenseTypeSchema,
    magic:    defenseTypeSchema,
    psychic:  defenseTypeSchema,
    other:    defenseTypeSchema.extend({ base: z.number().int().default(0) }),
  }),

  powers:    z.array(powerSchema).default([]),
  crafts:    z.array(craftSchema).default([]),
  skills:    z.array(skillSchema).default([]),
  inventory: z.array(inventoryItemSchema).default([]),

  hitPoints:   z.object({ total: z.number().int().default(0), current: z.number().int().default(0) }).default({ total: 0, current: 0 }),
  mana:        z.object({ total: z.number().int().default(0), current: z.number().int().default(0) }).default({ total: 0, current: 0 }),
  storyPoints: z.object({ total: z.number().int().default(2), current: z.number().int().default(2) }).default({ total: 2, current: 2 }),
  xp:          z.object({ current: z.number().int().default(0), needed: z.number().int().default(1000) }).default({ current: 0, needed: 1000 }),

  _notes:    z.array(noteSchema).default([]),
  _tracking: z.object({
    hp:          z.number().int().default(0),
    mana:        z.number().int().default(0),
    storyPoints: z.number().int().default(2),
  }).default({ hp: 0, mana: 0, storyPoints: 2 }),
})

export function safeParseCharacter(data) {
  return characterSchema.safeParse(data)
}
