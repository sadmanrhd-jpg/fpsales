import { useMemo, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import type { CostCategory, CostEntry, FinancialEntry, PaymentMethod, SalesEntry } from '../types'
import { toDateTimeLocal } from '../lib/utils'

const paymentMethods: PaymentMethod[] = ['Cash', 'Card', 'Mobile Banking', 'Other']
const costCategories: CostCategory[] = ['Electricity bill', 'Gas bill', 'Water bill', 'Food purchase', 'Staff expense', 'Maintenance', 'Delivery expense', 'Other expense']

interface EntryFormProps {
  kind: 'sale' | 'cost'
  entry?: FinancialEntry
  requireReason?: boolean
  onSubmit: (payload: Omit<SalesEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'> | Omit<CostEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'>, reason?: string) => void | Promise<void>
  onCancel: () => void
}

export function EntryForm({ kind, entry, requireReason = false, onSubmit, onCancel }: EntryFormProps) {
  const isSale = kind === 'sale'
  const current = useMemo(() => entry?.occurredAt ?? new Date().toISOString(), [entry])
  const [amount, setAmount] = useState(entry?.amount ? String(entry.amount) : '')
  const [occurredAt, setOccurredAt] = useState(toDateTimeLocal(current))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(entry?.kind === 'sale' ? entry.paymentMethod : 'Cash')
  const [note, setNote] = useState(entry?.kind === 'sale' ? entry.note : '')
  const [category, setCategory] = useState<CostCategory>(entry?.kind === 'cost' ? entry.category : 'Food purchase')
  const [description, setDescription] = useState(entry?.kind === 'cost' ? entry.description : '')
  const [reason, setReason] = useState('')
  const [attachmentName, setAttachmentName] = useState(entry?.attachmentName ?? '')
  const [attachmentDataUrl, setAttachmentDataUrl] = useState(entry?.attachmentDataUrl ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleFile = (file?: File) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Attachment must be 2 MB or smaller in this demo.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setAttachmentName(file.name)
      setAttachmentDataUrl(String(reader.result))
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (requireReason && !reason.trim()) {
      setError('Write a reason before saving this edit.')
      return
    }
    if (!isSale && !description.trim()) {
      setError('Add a short cost description.')
      return
    }
    const base = {
      amount: numericAmount,
      occurredAt: new Date(occurredAt).toISOString(),
      attachmentName: attachmentName || undefined,
      attachmentDataUrl: attachmentDataUrl || undefined,
    }
    setSaving(true)
    try {
      if (isSale) {
        await onSubmit({ ...base, paymentMethod, note: note.trim() }, reason.trim() || undefined)
      } else {
        await onSubmit({ ...base, category, description: description.trim() }, reason.trim() || undefined)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="entry-form" onSubmit={submit}>
      <div className="form-grid">
        <label className="field">
          <span>Amount</span>
          <input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" autoFocus />
        </label>
        {isSale ? (
          <label className="field">
            <span>Payment method</span>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
              {paymentMethods.map((method) => <option key={method}>{method}</option>)}
            </select>
          </label>
        ) : (
          <label className="field">
            <span>Cost category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as CostCategory)}>
              {costCategories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        )}
        <label className="field field-full">
          <span>Date and time</span>
          <input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} />
        </label>
        {isSale ? (
          <label className="field field-full">
            <span>Optional note</span>
            <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add context for this sale" />
          </label>
        ) : (
          <label className="field field-full">
            <span>Description</span>
            <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What was this cost for?" />
          </label>
        )}
        {!isSale && (
          <label className="upload-field field-full">
            <ImagePlus size={20} />
            <span>{attachmentName || 'Attach a photo or bill, optional'}</span>
            <input type="file" accept="image/*,.pdf" onChange={(event) => handleFile(event.target.files?.[0])} />
          </label>
        )}
        {requireReason && (
          <label className="field field-full reason-field">
            <span>Reason for editing</span>
            <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this record must be changed" />
          </label>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="button primary" disabled={saving}>{saving ? 'Saving...' : entry ? 'Save changes' : `Add ${kind}`}</button>
      </div>
    </form>
  )
}
