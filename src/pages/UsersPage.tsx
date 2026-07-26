import { Plus, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { useState } from 'react'
import { permissionLabels } from '../data/defaults'
import type { AppUser, PermissionKey, Role, RolePermissions } from '../types'
import { randomId } from '../lib/utils'

const roles: Role[] = ['reception', 'manager', 'admin']
const permissionKeys = Object.keys(permissionLabels) as PermissionKey[]
const roleName = (role: Role) => role[0].toUpperCase() + role.slice(1)

interface UsersPageProps {
  users: AppUser[]
  permissions: RolePermissions
  onUsersChange: (users: AppUser[]) => void
  onPermissionsChange: (permissions: RolePermissions) => void
  onNotify: (message: string) => void
}

export function UsersPage({ users, permissions, onUsersChange, onPermissionsChange, onNotify }: UsersPageProps) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('reception')
  const addUser = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !email.trim()) return
    onUsersChange([...users, { id: randomId('user'), name: name.trim(), email: email.trim(), role, active: true }])
    setName(''); setEmail(''); setRole('reception'); setShowForm(false); onNotify('User added successfully.')
  }
  const updateUser = (id: string, changes: Partial<AppUser>) => onUsersChange(users.map((user) => user.id === id ? { ...user, ...changes } : user))
  const togglePermission = (roleKey: Role, permission: PermissionKey) => {
    if (roleKey === 'admin') return
    onPermissionsChange({ ...permissions, [roleKey]: { ...permissions[roleKey], [permission]: !permissions[roleKey][permission] } })
  }
  return (
    <div className="page-stack">
      <section className="page-heading compact-heading"><div><span className="eyebrow">Access control</span><h1>Users and roles</h1><p>Manage active users and review role permissions.</p></div><button className="button primary" onClick={() => setShowForm((value) => !value)} type="button"><Plus size={18} /> Add user</button></section>
      {showForm && (
        <section className="content-card inline-form-card">
          <form className="inline-user-form" onSubmit={addUser}>
            <label className="field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" /></label>
            <label className="field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
            <label className="field"><span>Role</span><select value={role} onChange={(event) => setRole(event.target.value as Role)}>{roles.map((item) => <option value={item} key={item}>{roleName(item)}</option>)}</select></label>
            <button className="button primary" type="submit">Create user</button>
          </form>
        </section>
      )}
      <section className="content-card">
        <div className="section-heading"><div><span className="eyebrow">Team</span><h2>Application users</h2></div><span className="section-count">{users.length} users</span></div>
        <div className="user-list">
          {users.map((user) => (
            <article className="user-row" key={user.id}>
              <span className="avatar large">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
              <div className="user-main"><strong>{user.name}</strong><span>{user.email}</span></div>
              <select value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value as Role })}>{roles.map((item) => <option value={item} key={item}>{roleName(item)}</option>)}</select>
              <label className="switch-label"><input type="checkbox" checked={user.active} onChange={(event) => updateUser(user.id, { active: event.target.checked })} /><span className="switch" /><em>{user.active ? 'Active' : 'Inactive'}</em></label>
            </article>
          ))}
        </div>
      </section>
      <section className="content-card">
        <div className="section-heading"><div><span className="eyebrow">Role based access</span><h2>Permission matrix</h2></div><ShieldCheck size={22} /></div>
        <div className="permission-table-shell">
          <table className="permission-table">
            <thead><tr><th>Permission</th>{roles.map((item) => <th key={item}>{roleName(item)}</th>)}</tr></thead>
            <tbody>
              {permissionKeys.map((permission) => (
                <tr key={permission}>
                  <td>{permissionLabels[permission]}</td>
                  {roles.map((item) => (
                    <td key={item}>
                      <button type="button" className={`permission-toggle ${permissions[item][permission] ? 'on' : ''}`} disabled={item === 'admin'} onClick={() => togglePermission(item, permission)} aria-label={`Toggle ${permissionLabels[permission]} for ${item}`}><span /></button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="permission-note"><UserRoundCheck size={16} /> Admin permissions remain locked to preserve full system access.</p>
      </section>
    </div>
  )
}
