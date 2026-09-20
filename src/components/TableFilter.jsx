import { tableMemberCount } from '../utils/tables.js'
import styles from './TableFilter.module.css'

export default function TableFilter({ id, tables, characters, value, onChange }) {
  return (
    <div className={styles.filter}>
      <span id={`${id}-label`} className={styles.label}>Table Filter</span>
      <div className={styles.options} role="group" aria-labelledby={`${id}-label`}>
        <button
          type="button"
          className={styles.option}
          aria-pressed={!value}
          onClick={() => onChange('')}
        >
          All characters ({characters.length})
        </button>
        {tables.map(table => (
          <button
            key={table.id}
            type="button"
            className={styles.option}
            aria-pressed={value === table.id}
            onClick={() => onChange(table.id)}
          >
            {table.name} ({tableMemberCount(characters, table.id)})
          </button>
        ))}
      </div>
    </div>
  )
}
