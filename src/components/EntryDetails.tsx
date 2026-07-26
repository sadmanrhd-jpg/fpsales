import type { AppUser, FinancialEntry } from '../types'
import { formatCurrency, formatDateTime } from '../lib/utils'

export function EntryDetails({ entry, users, currency }: { entry: FinancialEntry; users: AppUser[]; currency: string }) {
  const creator = users.find((user) => user.id === entry.createdBy)?.name ?? 'Unknown user'
  return (
    <div className="details-list">
      <div><span>Type</span><strong>{entry.kind === 'sale' ? 'Sales entry' : 'Cost entry'}</strong></div>
      <div><span>Amount</span><strong>{formatCurrency(entry.amount, currency)}</strong></div>
      {entry.kind === 'sale' ? (
        <>
          <div><span>Payment method</span><strong>{entry.paymentMethod}</strong></div>
          <div><span>Note</span><strong>{entry.note || 'None'}</strong></div>
        </>
      ) : (
        <>
          <div><span>Cost category</span><strong>{entry.category}</strong></div>
          <div><span>Description</span><strong>{entry.description}</strong></div>
        </>
      )}
      <div><span>Date and time</span><strong>{formatDateTime(entry.occurredAt)}</strong></div>
      <div><span>Created by</span><strong>{creator}</strong></div>
      <div><span>Number of edits</span><strong>{entry.editCount}</strong></div>
      {entry.attachmentName && (
        <div className="details-attachment">
          <span>Attachment</span>
          {entry.attachmentDataUrl ? <a href={entry.attachmentDataUrl} target="_blank" rel="noreferrer">Open {entry.attachmentName}</a> : <strong>{entry.attachmentName}</strong>}
        </div>
      )}
    </div>
  )
}
