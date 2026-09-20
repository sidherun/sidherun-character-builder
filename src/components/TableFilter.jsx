import { tableMemberCount } from '../utils/tables.js'
import styles from './TableFilter.module.css'

export default function TableFilter({ id, tables, characters, value, onChange }) {
  return (
    <div className={styles.filter}>
      <label htmlFor={id}>Table Filter</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">All characters ({characters.length})</option>
        {tables.map(table => (
          <option key={table.id} value={table.id}>
            {table.name} ({tableMemberCount(characters, table.id)})
          </option>
        ))}
      </select>
    </div>
  )
}
