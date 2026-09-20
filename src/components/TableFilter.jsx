import { tableMemberCount } from '../utils/tables.js'
import styles from './TableFilter.module.css'

function FilterIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 3.5h2m2.5 0h6.5M2.5 8h2m2.5 0h6.5M2.5 12.5h2m2.5 0h6.5" />
    </svg>
  )
}

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
          <FilterIcon />
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
            <FilterIcon />
            {table.name} ({tableMemberCount(characters, table.id)})
          </button>
        ))}
      </div>
    </div>
  )
}
