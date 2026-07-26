import { Eye, EyeOff, KeyRound, LockKeyhole, Plus, Save, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { emptyPermissions, permissionGroups, permissionLabels } from '../data/defaults'
import { createPasswordCredential } from '../lib/auth'
import { randomId } from '../lib/utils'
import type { AppUser, PermissionKey, Role, UserPermissions } from '../types'

const assignableRoles: Role[] = ['reception', 'manager', 'admin']
const roleName = (role: Role) => role === 'superadmin' ? 'Superadmin' : role[0].toUpperCase() + role.slice(1)

interface UsersPageProps {
  users: AppUser[]
  currentUserId: string
  onUsersChange: (users: AppUser[]) => void
  onNotify: (message: string) => void
}


interface PermissionSelectorProps {
  permissions: UserPermissions
  onToggle: (permission: PermissionKey) => void
}

const superadminOnlyFunctions = [
  'Create user accounts',
  'Assign roles and permissions',
  'Activate or deactivate user accounts',
  'Reset any user password',
  'Change the Superadmin password',
]

function PermissionSelector({ permissions, onToggle }: PermissionSelectorProps) {
  return (
    <div className="permission-group-list">
      {permissionGroups.map((group) => (
        <section className="permission-group" key={group.id}>
          <div className="permission-group-heading"><strong>{group.label}</strong><span>{group.description}</span></div>
          <div className="permission-checkbox-grid">
            {group.permissions.map((permission) => <label className="permission-check" key={permission}><input type="checkbox" checked={permissions[permission]} onChange={() => onToggle(permission)} /><span>{permissionLabels[permission]}</span></label>)}
          </div>
        </section>
      ))}
      <section className="permission-group fixed-permission-group">
        <div className="permission-group-heading"><strong><LockKeyhole size={16} /> Superadmin only controls</strong><span>These security functions are permanently restricted to the Superadmin and cannot be assigned.</span></div>
        <div className="fixed-permission-list">{superadminOnlyFunctions.map((item) => <span key={item}><LockKeyhole size={14} /> {item}</span>)}</div>
      </section>
      <section className="permission-group personal-permission-group">
        <div className="permission-group-heading"><strong>Personal account security</strong><span>Every active signed in user can create or change their own 4 digit deletion PIN from Settings.</span></div>
      </section>
    </div>
  )
}

interface PasswordFieldsProps {
  password: string
  confirmPassword: string
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
}

function PasswordFields({ password, confirmPassword, onPasswordChange, onConfirmPasswordChange }: PasswordFieldsProps) {
  const [showPassword, setShowPassword] = useState(false)
  return (
    <>
      <label className="field"><span>Password</span><div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => onPasswordChange(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" /><button className="password-visibility" type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
      <label className="field"><span>Confirm password</span><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => onConfirmPasswordChange(event.target.value)} autoComplete="new-password" placeholder="Repeat the password" /></label>
    </>
  )
}

export function UsersPage({ users, currentUserId, onUsersChange, onNotify }: UsersPageProps) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('reception')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<UserPermissions>(() => emptyPermissions())
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const editingUser = useMemo(() => users.find((user) => user.id === editingUserId) ?? null, [users, editingUserId])
  const passwordUser = useMemo(() => users.find((user) => user.id === resetPasswordUserId) ?? null, [users, resetPasswordUserId])

  const resetCreateForm = () => {
    setName('')
    setEmail('')
    setRole('reception')
    setPassword('')
    setConfirmPassword('')
    setSelectedPermissions(emptyPermissions())
    setError('')
  }

  const addUser = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    const cleanEmail = email.trim().toLowerCase()
    if (!name.trim() || !cleanEmail) return setError('Name and email are required.')
    if (users.some((user) => user.email.toLowerCase() === cleanEmail)) return setError('A user with this email already exists.')
    if (password.length < 8) return setError('Password must contain at least 8 characters.')
    if (password !== confirmPassword) return setError('The passwords do not match.')
    setSaving(true)
    const credential = await createPasswordCredential(password)
    const user: AppUser = {
      id: randomId('user'),
      name: name.trim(),
      email: cleanEmail,
      role,
      active: true,
      permissions: selectedPermissions,
      ...credential,
      createdAt: new Date().toISOString(),
    }
    onUsersChange([...users, user])
    setSaving(false)
    resetCreateForm()
    setShowForm(false)
    onNotify('User account created.')
  }

  const updateUser = (id: string, changes: Partial<AppUser>) => {
    onUsersChange(users.map((user) => user.id === id ? { ...user, ...changes } : user))
  }

  const toggleCreatePermission = (permission: PermissionKey) => {
    setSelectedPermissions((current) => ({ ...current, [permission]: !current[permission] }))
  }

  const toggleExistingPermission = (permission: PermissionKey) => {
    if (!editingUser || editingUser.role === 'superadmin') return
    updateUser(editingUser.id, { permissions: { ...editingUser.permissions, [permission]: !editingUser.permissions[permission] } })
  }

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!passwordUser) return
    setError('')
    if (newPassword.length < 8) return setError('Password must contain at least 8 characters.')
    if (newPassword !== confirmNewPassword) return setError('The passwords do not match.')
    setSaving(true)
    const credential = await createPasswordCredential(newPassword)
    updateUser(passwordUser.id, credential)
    setSaving(false)
    setResetPasswordUserId(null)
    setNewPassword('')
    setConfirmNewPassword('')
    setError('')
    onNotify('Password changed by the superadmin.')
  }

  const closeAccessModal = () => {
    setEditingUserId(null)
    setError('')
  }

  return (
    <div className="page-stack">
      <section className="page-heading compact-heading"><div><span className="eyebrow">Superadmin control</span><h1>Users and permissions</h1><p>Create login accounts and grant permissions to each user manually.</p></div><button className="button primary" onClick={() => { setShowForm((value) => !value); setError('') }} type="button"><Plus size={18} /> Add user</button></section>

      {showForm && (
        <section className="content-card user-create-card">
          <div className="section-heading"><div><span className="eyebrow">New account</span><h2>Create a user login</h2></div></div>
          <form onSubmit={addUser}>
            <div className="form-grid user-create-grid">
              <label className="field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" autoFocus /></label>
              <label className="field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="off" /></label>
              <label className="field"><span>Role label</span><select value={role} onChange={(event) => setRole(event.target.value as Role)}>{assignableRoles.map((item) => <option value={item} key={item}>{roleName(item)}</option>)}</select></label>
              <div />
              <PasswordFields password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} />
            </div>
            <div className="permission-selector">
              <div><strong>Permissions</strong><span>Nothing is granted automatically. Select only what this user needs.</span></div>
              <PermissionSelector permissions={selectedPermissions} onToggle={toggleCreatePermission} />
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions"><button className="button secondary" type="button" onClick={() => { setShowForm(false); resetCreateForm() }}>Cancel</button><button className="button primary" type="submit" disabled={saving}><Save size={17} /> {saving ? 'Creating...' : 'Create user'}</button></div>
          </form>
        </section>
      )}

      <section className="content-card">
        <div className="section-heading"><div><span className="eyebrow">Accounts</span><h2>Application users</h2></div><span className="section-count">{users.length} users</span></div>
        <div className="user-list">
          {users.map((user) => {
            const isSuperadmin = user.role === 'superadmin'
            return (
              <article className="user-row expanded-user-row" key={user.id}>
                <span className="avatar large">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                <div className="user-main"><strong>{user.name}{user.id === currentUserId ? ' · You' : ''}</strong><span>{user.email}</span><small>{roleName(user.role)}</small></div>
                <label className="switch-label"><input type="checkbox" checked={user.active} disabled={isSuperadmin} onChange={(event) => updateUser(user.id, { active: event.target.checked })} /><span className="switch" /><em>{user.active ? 'Active' : 'Inactive'}</em></label>
                <div className="user-row-actions"><button className="button secondary" type="button" onClick={() => setEditingUserId(user.id)}><ShieldCheck size={16} /> Access</button><button className="button secondary" type="button" onClick={() => { setResetPasswordUserId(user.id); setError('') }}><KeyRound size={16} /> Password</button></div>
              </article>
            )
          })}
        </div>
        <p className="permission-note"><UserRoundCheck size={16} /> Only the superadmin can create accounts, assign permissions, deactivate users, or change passwords.</p>
      </section>

      {editingUser && <Modal title={`Access for ${editingUser.name}`} onClose={closeAccessModal} wide><div className="access-modal-content">
        {editingUser.role === 'superadmin' ? <p className="locked-access-note">The superadmin always has complete system access and cannot be restricted.</p> : <>
          <label className="field"><span>Role label</span><select value={editingUser.role} onChange={(event) => updateUser(editingUser.id, { role: event.target.value as Role })}>{assignableRoles.map((item) => <option value={item} key={item}>{roleName(item)}</option>)}</select></label>
          <div className="modal-permissions"><PermissionSelector permissions={editingUser.permissions} onToggle={toggleExistingPermission} /></div>
        </>}
        <div className="form-actions"><button className="button primary" type="button" onClick={closeAccessModal}>Done</button></div>
      </div></Modal>}

      {passwordUser && <Modal title={`Change password for ${passwordUser.name}`} onClose={() => { setResetPasswordUserId(null); setNewPassword(''); setConfirmNewPassword(''); setError('') }}><form className="entry-form" onSubmit={resetPassword}><div className="form-grid"><PasswordFields password={newPassword} confirmPassword={confirmNewPassword} onPasswordChange={setNewPassword} onConfirmPasswordChange={setConfirmNewPassword} /></div>{error && <p className="form-error">{error}</p>}<p className="password-admin-note">The user cannot change this password. Only the superadmin can replace it.</p><div className="form-actions"><button className="button secondary" type="button" onClick={() => setResetPasswordUserId(null)}>Cancel</button><button className="button primary" type="submit" disabled={saving}><KeyRound size={17} /> {saving ? 'Changing...' : 'Change password'}</button></div></form></Modal>}
    </div>
  )
}
