import { attrTotal } from '../../utils/characterDerived.js'
import styles from './Step5Powers.module.css'

const ATTR_OPTIONS = [
  { value: 'strength',      label: 'Strength'      },
  { value: 'agility',       label: 'Agility'       },
  { value: 'dexterity',     label: 'Dexterity'     },
  { value: 'endurance',     label: 'Endurance'     },
  { value: 'constitution',  label: 'Constitution'  },
  { value: 'intelligence',  label: 'Intelligence'  },
  { value: 'wisdom',        label: 'Wisdom'        },
  { value: 'thaumaturgy',   label: 'Thaumaturgy'   },
  { value: 'enlightenment', label: 'Enlightenment' },
  { value: 'charisma',      label: 'Charisma'      },
  { value: 'comeliness',    label: 'Comeliness'    },
  { value: 'fame',          label: 'Fame'          },
]

export default function Step5Powers({ character, onUpdate }) {
  const { powers } = character

  function addPower() {
    onUpdate({
      powers: [...powers, {
        id: crypto.randomUUID(),
        name: '', attributeType: '', powerBonus: 0, description: '',
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
        const attrVal = p.attributeType ? attrTotal(character.attributes[p.attributeType] || {}) : 0
        const total   = attrVal + (p.powerBonus || 0)
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
              <label className={styles.selectField}>
                <span>Attribute Type</span>
                <select
                  value={p.attributeType || ''}
                  onChange={e => updatePower(p.id, { attributeType: e.target.value })}
                  aria-label={`Attribute type for ${powerName}`}
                >
                  <option value="">— select —</option>
                  {ATTR_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <div className={styles.numField}>
                <span>Attr Value</span>
                <div className={styles.attrValue}>{attrVal}</div>
              </div>

              <label className={styles.numField}>
                <span>Power Bonus</span>
                <input
                  type="number"
                  value={p.powerBonus ?? ''}
                  onChange={e => updatePower(p.id, { powerBonus: parseInt(e.target.value) || 0 })}
                  aria-label={`Power bonus for ${powerName}`}
                />
              </label>

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
