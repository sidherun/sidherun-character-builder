// Regression: ISSUE-001 / ISSUE-002 — import + share-load bypassed validation
// Found by /qa on 2026-06-12
// Report: .gstack/qa-reports/qa-report-sidherun-character-builder-2026-06-12.md
//
// The Welcome "Import JSON" button and the #share URL loader previously fed
// decoded data straight into state without running safeParseCharacter, so a
// structurally invalid payload (valid JSON, wrong shape) produced a false
// "Character imported!" success and silently loaded defaults. Both call sites
// now gate on safeParseCharacter; these tests lock that contract.
import { describe, it, expect } from 'vitest'
import { safeParseCharacter } from './characterSchema.js'
import { createDefaultCharacter } from './defaultCharacter.js'

describe('safeParseCharacter — import/share validation gate', () => {
  it('accepts a freshly created default character', () => {
    const result = safeParseCharacter(createDefaultCharacter())
    expect(result.success).toBe(true)
  })

  it('accepts a complete, well-formed character (round-trip of an export)', () => {
    const char = createDefaultCharacter()
    char.name = 'Dulu Breac'
    char.archetype = 'druid'
    char.level = 2
    char.wizardStep = 9
    const result = safeParseCharacter(char)
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Dulu Breac')
  })

  it('rejects valid JSON with wrong field types (the bug that slipped through)', () => {
    const result = safeParseCharacter({
      name: 12345,
      attributes: 'oops',
      weapons: 'notarray',
      level: 'abc',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an object missing the required nested structures', () => {
    const result = safeParseCharacter({ name: 'Partial', level: 3 })
    expect(result.success).toBe(false)
  })

  it('rejects level out of the 1–20 range', () => {
    const char = createDefaultCharacter()
    char.level = 99
    expect(safeParseCharacter(char).success).toBe(false)
  })
})
