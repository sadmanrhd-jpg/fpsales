import { KeyRound, Save, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AppSettings } from '../types'

interface SettingsPageProps {
  settings: AppSettings
  canManageSettings: boolean
  isSuperadmin: boolean
  hasDeletionPin: boolean
  onSave: (settings: AppSettings) => Promise<string | null>
  onChangeOwnPassword: (currentPassword: string, newPassword: string) => Promise<string | null>
  onSaveDeletionPin: (currentPin: string, newPin: string) => Promise<string | null>
}

export function SettingsPage({ settings, canManageSettings, isSuperadmin, hasDeletionPin, onSave, onChangeOwnPassword, onSaveDeletionPin }: SettingsPageProps) {
  const [form, setForm] = useState(settings)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinMessage, setPinMessage] = useState('')
  const [pinError, setPinError] = useState('')
  const [savingPin, setSavingPin] = useState(false)

  useEffect(() => setForm(settings), [settings])
  const update = (key: keyof AppSettings, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 4)

  const saveSettings = async () => {
    setSettingsError('')
    setSavingSettings(true)
    const error = await onSave(form)
    setSavingSettings(false)
    if (error) setSettingsError(error)
  }

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

  const saveDeletionPin = async (event: React.FormEvent) => {
    event.preventDefault()
    setPinError('')
    setPinMessage('')
    if (!/^\d{4}$/.test(newPin)) return setPinError('Enter exactly 4 digits for the new deletion PIN.')
    if (newPin !== confirmPin) return setPinError('The new PIN entries do not match.')
    if (hasDeletionPin && !/^\d{4}$/.test(currentPin)) return setPinError('Enter your current 4 digit deletion PIN.')
    setSavingPin(true)
    const error = await onSaveDeletionPin(currentPin, newPin)
    setSavingPin(false)
    if (error) return setPinError(error)
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setPinMessage(hasDeletionPin ? 'Deletion PIN changed successfully.' : 'Deletion PIN created successfully.')
  }

  return (
    <div className="page-stack">
      <section className="page-heading compact-heading"><div><span className="eyebrow">Application setup</span><h1>Settings</h1><p>Update your deletion PIN and the settings available to your account.</p></div></section>

      {canManageSettings && <section className="content-card settings-card">
        <div className="settings-brand-preview"><img src="/food-pavilion-logo.png" alt="Food Pavilion logo" /><span>Brand logo used in the application and sign in page</span></div>
        <div className="form-grid settings-grid">
          <label className="field"><span>Restaurant name</span><input value={form.restaurantName} onChange={(event) => update('restaurantName', event.target.value)} /></label>
          <label className="field"><span>Branch name</span><input value={form.branchName} onChange={(event) => update('branchName', event.target.value)} /></label>
          <label className="field"><span>Currency code</span><input value={form.currencyCode} onChange={(event) => update('currencyCode', event.target.value.toUpperCase())} /></label>
          <label className="field"><span>Timezone</span><input value={form.timezone} onChange={(event) => update('timezone', event.target.value)} /></label>
          <label className="field field-full"><span>Address</span><textarea rows={3} value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
        </div>
        {settingsError && <p className="form-error">{settingsError}</p>}
        <div className="form-actions settings-actions"><span /><button className="button primary" type="button" onClick={() => void saveSettings()} disabled={savingSettings}><Save size={17} /> {savingSettings ? 'Saving...' : 'Save settings'}</button></div>
      </section>}

      <section className="content-card settings-card security-card deletion-pin-card">
        <div className="section-heading"><div><span className="eyebrow">Deletion protection</span><h2>{hasDeletionPin ? 'Change your 4 digit PIN' : 'Create your 4 digit PIN'}</h2></div><ShieldCheck size={22} /></div>
        <p className="security-description">This PIN is required before your account can delete a saved menu item or category.</p>
        <form className="password-change-form" onSubmit={saveDeletionPin}>
          <div className="form-grid settings-grid">
            {hasDeletionPin && <label className="field field-full"><span>Current deletion PIN</span><input type="password" inputMode="numeric" maxLength={4} value={currentPin} onChange={(event) => setCurrentPin(digitsOnly(event.target.value))} autoComplete="off" placeholder="4 digits" /></label>}
            <label className="field"><span>New deletion PIN</span><input type="password" inputMode="numeric" maxLength={4} value={newPin} onChange={(event) => setNewPin(digitsOnly(event.target.value))} autoComplete="off" placeholder="4 digits" /></label>
            <label className="field"><span>Confirm new PIN</span><input type="password" inputMode="numeric" maxLength={4} value={confirmPin} onChange={(event) => setConfirmPin(digitsOnly(event.target.value))} autoComplete="off" placeholder="Repeat 4 digits" /></label>
          </div>
          {pinError && <p className="form-error">{pinError}</p>}
          {pinMessage && <p className="form-success">{pinMessage}</p>}
          <div className="form-actions"><button className="button primary" type="submit" disabled={savingPin || !newPin || !confirmPin || (hasDeletionPin && !currentPin)}><ShieldCheck size={17} /> {savingPin ? 'Saving...' : hasDeletionPin ? 'Change PIN' : 'Create PIN'}</button></div>
        </form>
      </section>

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

      <section className="future-note"><strong>Account specific security</strong><p>Every signed in user creates and verifies their own deletion PIN. Password control for other accounts remains with the superadmin.</p></section>
    </div>
  )
}
