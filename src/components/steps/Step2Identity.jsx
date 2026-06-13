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
        archetype:      arch.id,
        hasPowers:      arch.hasPowers,
        hasMagic:       arch.hasMagic,
        magicAttribute: arch.magicAttribute,
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
          <label>Character Name</label>
          <input
            type="text"
            value={character.name}
            onChange={e => onUpdate({ name: e.target.value })}
            placeholder="Enter your character's name…"
          />
        </div>

        <div className={styles.field}>
          <label>Level</label>
          <select
            value={character.level}
            onChange={e => onUpdate({ level: parseInt(e.target.value) })}
          >
            {Array.from({ length: 20 }, (_, i) => i + 1).map(l => (
              <option key={l} value={l}>Level {l}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label>Race</label>
          <select value={character.race} onChange={e => handleRaceChange(e.target.value)}>
            {races.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {selectedRace && <p className={styles.hint}>{selectedRace.description}</p>}
        </div>

        <div className={styles.field}>
          <label>Age Category</label>
          <select value={character.ageCategory} onChange={e => onUpdate({ ageCategory: e.target.value })}>
            {AGE_CATEGORIES.map(a => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label>Archetype</label>
          <select value={character.archetype} onChange={e => handleArchetypeChange(e.target.value)}>
            {archetypes.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {selectedArchetype && <p className={styles.hint}>{selectedArchetype.description}</p>}
        </div>

        {character.archetype === 'custom' && (
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
                onChange={e => onUpdate({ hasMagic: e.target.checked })}
              />
              Has Magic
            </label>
            {character.hasMagic && (
              <div className={styles.field}>
                <label>Primary Magic Attribute</label>
                <select
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
        )}

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label>Backstory <span className={styles.optional}>(optional)</span></label>
          <textarea
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
