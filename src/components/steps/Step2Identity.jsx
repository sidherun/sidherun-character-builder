import races from '../../data/races.json'
import archetypes from '../../data/archetypes.json'
import styles from './Step2Identity.module.css'

const AGE_CATEGORIES = [
  { id: 'young',   label: 'Young (×0.75)' },
  { id: 'adult',   label: 'Adult (×1.0)'  },
  { id: 'elderly', label: 'Elderly (×0.75)' },
]

export default function Step2Identity({ character, onUpdate }) {
  function handleRaceChange(raceId) {
    const race = races.find(r => r.id === raceId)
    if (race) {
      onUpdate({
        race:     race.id,
        raceType: race.raceType,
        raceValue: race.raceValue,
        raceSize: race.defaultSize,
      })
    }
  }

  function handleArchetypeChange(archetypeId) {
    const arch = archetypes.find(a => a.id === archetypeId)
    if (arch) {
      onUpdate({
        archetype:           arch.id,
        customArchetypeName: '',
        hasPowers:           arch.hasPowers,
        hasMagic:            arch.hasMagic,
        magicAttribute:      arch.magicAttribute,
      })
    }
  }

  const selectedRace      = races.find(r => r.id === character.race)
  const selectedArchetype = archetypes.find(a => a.id === character.archetype)

  return (
    <div className={styles.step}>
      <h2>Identity</h2>
      <p className={styles.intro}>
        Define who your character is. Work with your GM to determine your race and archetype.
      </p>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="identity-name">Character Name</label>
          <input
            id="identity-name"
            type="text"
            value={character.name}
            onChange={e => onUpdate({ name: e.target.value })}
            placeholder="Enter your character's name…"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="identity-level">Level</label>
          <select
            id="identity-level"
            value={character.level}
            onChange={e => onUpdate({ level: parseInt(e.target.value) })}
          >
            {Array.from({ length: 20 }, (_, i) => i + 1).map(l => (
              <option key={l} value={l}>Level {l}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="identity-race">Race</label>
          <select
            id="identity-race"
            value={character.race}
            onChange={e => handleRaceChange(e.target.value)}
            aria-describedby={selectedRace ? 'identity-race-hint' : undefined}
          >
            {races.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {selectedRace && <p id="identity-race-hint" className={styles.hint}>{selectedRace.description}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="identity-age">Age Category</label>
          <select
            id="identity-age"
            value={character.ageCategory}
            onChange={e => onUpdate({ ageCategory: e.target.value })}
          >
            {AGE_CATEGORIES.map(a => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label htmlFor="identity-archetype">Archetype</label>
          <select
            id="identity-archetype"
            value={character.archetype}
            onChange={e => handleArchetypeChange(e.target.value)}
            aria-describedby={selectedArchetype ? 'identity-archetype-hint' : undefined}
          >
            {archetypes.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {selectedArchetype && <p id="identity-archetype-hint" className={styles.hint}>{selectedArchetype.description}</p>}
        </div>

        {character.archetype === 'custom' && (
          <div className={`${styles.fullWidth} ${styles.customPanel}`}>
            <p className={styles.customPanelTitle}>Custom Archetype</p>
            <div className={styles.customPanelGrid}>
              <div className={styles.field}>
                <label htmlFor="identity-custom-name">Archetype Name</label>
                <input
                  id="identity-custom-name"
                  type="text"
                  value={character.customArchetypeName || ''}
                  onChange={e => onUpdate({ customArchetypeName: e.target.value })}
                  placeholder="e.g. Bard, Witch Hunter, Merchant…"
                />
              </div>
              <div className={styles.customToggles}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={character.hasPowers}
                    onChange={e => onUpdate({ hasPowers: e.target.checked })}
                  />
                  Has Powers
                </label>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={character.hasMagic}
                    onChange={e => {
                      const hasMagic = e.target.checked
                      onUpdate({
                        hasMagic,
                        magicAttribute: hasMagic ? (character.magicAttribute || 'thaumaturgy') : null,
                      })
                    }}
                  />
                  Has Magic
                </label>
                {character.hasMagic && (
                  <div className={styles.field}>
                    <label htmlFor="identity-magic-attr">Magic Attribute</label>
                    <select
                      id="identity-magic-attr"
                      value={character.magicAttribute || 'thaumaturgy'}
                      onChange={e => onUpdate({ magicAttribute: e.target.value })}
                    >
                      <option value="thaumaturgy">Thaumaturgy (Arcane)</option>
                      <option value="enlightenment">Enlightenment (Divine/Nature)</option>
                      <option value="intelligence">Intelligence (Psychic)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label htmlFor="identity-backstory">
            Backstory <span className={styles.optional} aria-label="optional">(optional)</span>
          </label>
          <textarea
            id="identity-backstory"
            value={character.backstory}
            onChange={e => onUpdate({ backstory: e.target.value })}
            placeholder="Write your character's backstory…"
            rows={5}
          />
        </div>
      </div>
    </div>
  )
}
