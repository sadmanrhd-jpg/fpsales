import { KeyRound, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AppSettings } from '../types'

interface SettingsPageProps {
  settings: AppSettings
  canManageSettings: boolean
  isSuperadmin: boolean
  onSave: (settings: AppSettings) => void
  onChangeOwnPassword: (currentPassword: string, newPassword: string) => Promise<string | null>
}

export function SettingsPage({ settings, canManageSettings, isSuperadmin, onSave, onChangeOwnPassword }: SettingsPageProps) {
  const [form, setForm] = useState(settings)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => setForm(settings), [settings])
  const update = (key: keyof AppSettings, value: string) => setForm((current) => ({ ...current, [key]: value }))

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordMessage('')
    if (newPassword.length < 8) return setPasswordError('The new password must contain at least 8 characters.')
    if (newPassword !== confirmPassword) return setPasswordError('The new passwords do not match.')
    setSavingPassword(true)
    const error = await onChangeOwnPassword(currentPassword, newPassword)
    setSavingPassword(false)
    if (error) return setPasswordError(error)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordMessage('Password changed successfully.')
  }

  return (
    <div className="page-stack">
      <section className="page-heading compact-heading"><div><span className="eyebrow">Application setup</span><h1>Settings</h1><p>Update restaurant details and superadmin security.</p></div></section>

      {canManageSettings && <section className="content-card settings-card">
        <div className="settings-brand-preview"><img src="/food-pavilion-logo.png" alt="Food Pavilion logo" /><span>Brand logo used in the application and sign in page</span></div>
        <div className="form-grid settings-grid">
          <label className="field"><span>Restaurant name</span><input value={form.restaurantName} onChange={(event) => update('restaurantName', event.target.value)} /></label>
          <label className="field"><span>Branch name</span><input value={form.branchName} onChange={(event) => update('branchName', event.target.value)} /></label>
          <label className="field"><span>Currency code</span><input value={form.currencyCode} onChange={(event) => update('currencyCode', event.target.value.toUpperCase())} /></label>
          <label className="field"><span>Timezone</span><input value={form.timezone} onChange={(event) => update('timezone', event.target.value)} /></label>
          <label className="field field-full"><span>Address</span><textarea rows={3} value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
        </div>
        <div className="form-actions settings-actions"><span /><button className="button primary" type="button" onClick={() => onSave(form)}><Save size={17} /> Save settings</button></div>
      </section>}

      {isSuperadmin && <section className="content-card settings-card security-card">
        <div className="section-heading"><div><span className="eyebrow">Superadmin security</span><h2>Change your password</h2></div><KeyRound size={22} /></div>
        <form className="password-change-form" onSubmit={changePassword}>
          <div className="form-grid settings-grid">
            <label className="field field-full"><span>Current password</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label>
            <label className="field"><span>New password</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" /></label>
            <label className="field"><span>Confirm new password</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /></label>
          </div>
          {passwordError && <p className="form-error">{passwordError}</p>}
          {passwordMessage && <p className="form-success">{passwordMessage}</p>}
          <div className="form-actions"><button className="button primary" type="submit" disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}><KeyRound size={17} /> {savingPassword ? 'Changing...' : 'Change password'}</button></div>
        </form>
      </section>}

      <section className="future-note"><strong>Modular structure</strong><p>The active interface includes sales, costs, reports, users, permissions, and food menu management. The database migration remains ready for orders, kitchen tokens, tables, inventory, employees, customers, payments, discounts, and multiple branches.</p></section>
    </div>
  )
}
