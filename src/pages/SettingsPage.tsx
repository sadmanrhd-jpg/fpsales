import { RotateCcw, Save } from 'lucide-react'
import { useState } from 'react'
import type { AppSettings } from '../types'

export function SettingsPage({ settings, onSave, onReset }: { settings: AppSettings; onSave: (settings: AppSettings) => void; onReset: () => void }) {
  const [form, setForm] = useState(settings)
  const update = (key: keyof AppSettings, value: string) => setForm((current) => ({ ...current, [key]: value }))
  return (
    <div className="page-stack">
      <section className="page-heading compact-heading"><div><span className="eyebrow">Application setup</span><h1>Settings</h1><p>Update restaurant details and demo data.</p></div></section>
      <section className="content-card settings-card">
        <div className="settings-brand-preview"><img src="/food-pavilion-logo.png" alt="Food Pavilion logo" /><span>Brand logo in the application header and sign in experience</span></div>
        <div className="form-grid settings-grid">
          <label className="field"><span>Restaurant name</span><input value={form.restaurantName} onChange={(event) => update('restaurantName', event.target.value)} /></label>
          <label className="field"><span>Branch name</span><input value={form.branchName} onChange={(event) => update('branchName', event.target.value)} /></label>
          <label className="field"><span>Currency code</span><input value={form.currencyCode} onChange={(event) => update('currencyCode', event.target.value.toUpperCase())} /></label>
          <label className="field"><span>Timezone</span><input value={form.timezone} onChange={(event) => update('timezone', event.target.value)} /></label>
          <label className="field field-full"><span>Address</span><textarea rows={3} value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
        </div>
        <div className="form-actions settings-actions">
          <button className="button secondary danger-text" type="button" onClick={onReset}><RotateCcw size={17} /> Reset demo data</button>
          <button className="button primary" type="button" onClick={() => onSave(form)}><Save size={17} /> Save settings</button>
        </div>
      </section>
      <section className="future-note">
        <strong>Future module readiness</strong>
        <p>The included database migration already defines branches, menu items, tables, orders, kitchen tokens, inventory, employees, customers, payments and discounts. These unfinished modules are intentionally hidden from the interface.</p>
      </section>
    </div>
  )
}
