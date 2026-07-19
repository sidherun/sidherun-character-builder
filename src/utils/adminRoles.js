export function filterUsers(users, query = '', role = 'all') {
  const needle = query.trim().toLocaleLowerCase()
  return users.filter(u => {
    if (role !== 'all' && u.role !== role) return false
    if (!needle) return true
    return [u.display_name, u.email].some(value =>
      value?.toLocaleLowerCase().includes(needle)
    )
  })
}
