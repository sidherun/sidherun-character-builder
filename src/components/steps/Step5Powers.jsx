import styles from './Step5Powers.module.css'

export default function Step5Powers({ character, onUpdate }) {
  const { powers } = character

  function addPower() {
    onUpdate({
      powers: [...powers, {
        id: crypto.randomUUID(),
        name: '', base: 0, attributeBonus: 0,
        skillBonus: 0, misc: 0, description: '',
      }]
    })
  }

  function updatePower(id, patch) {
    onUpdate({ powers: powers.map(p => p.id === id ? { ...p, ...patch } : p) })
  }

  function removePower(id) {
    onUpdate({ powers: powers.filter(p => p.id !== id) })
  }

  return (
    <div className={styles.step}>
      <h2>Powers</h2>
      <p className={styles.intro}>
        Powers are special abilities tied to your archetype, defined in collaboration with your GM.
        Each power has its own attribute-based bonus structure.
      </p>

      <div className={styles.header}>
        <button className="btn-secondary" onClick={addPower}>+ Add Power</button>
      </div>

      {powers.length === 0 && (
        <p className={styles.empty}>No powers added yet. Work with your GM to define your character&#39;s powers.</p>
      )}

      {powers.map(p => {
        const total = (p.base || 0) + (p.attributeBonus || 0) + (p.skillBonus || 0) + (p.misc || 0)
        const powerName = p.name || 'unnamed power'
        return (
          <div key={p.id} className={styles.card} role="group" aria-label={`Power: ${powerName}`}>
            <div className={styles.cardTop}>
              <input
                className={styles.powerName}
                value={p.name}
                onChange={e => updatePower(p.id, { name: e.target.value })}
                placeholder="Power name…"
                aria-label="Power name"
              />
              <button
                className="btn-danger"
                onClick={() => removePower(p.id)}
                aria-label={`Remove power: ${powerName}`}
              >
                ✕
              </button>
            </div>
            <div className={styles.numRow}>
              {[
                { field: 'base',           label: 'Base'        },
                { field: 'attributeBonus', label: 'Attr Bonus'  },
                { field: 'skillBonus',     label: 'Skill Bonus' },
                { field: 'misc',           label: 'Misc'        },
              ].map(({ field, label }) => (
                <label key={field} className={styles.numField}>
                  <span>{label}</span>
                  <input
                    type="number"
                    value={p[field] || ''}
                    onChange={e => updatePower(p.id, { [field]: parseInt(e.target.value) || 0 })}
                    aria-label={`${label} for ${powerName}`}
                  />
                </label>
              ))}
              <div className={styles.totalBadge}>
                <span>Total</span>
                <strong aria-label={`Total: ${total}`}>{total}</strong>
              </div>
            </div>
            <textarea
              className={styles.desc}
              value={p.description}
              onChange={e => updatePower(p.id, { description: e.target.value })}
              placeholder="Describe this power…"
              rows={2}
              aria-label={`Description for ${powerName}`}
            />
          </div>
        )
      })}
    </div>
  )
}
