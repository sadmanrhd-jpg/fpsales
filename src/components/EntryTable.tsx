import { Eye, FileImage, Pencil, ReceiptText } from 'lucide-react'
import type { AppUser, FinancialEntry } from '../types'
import { entryLabel, formatCurrency, formatDateTime } from '../lib/utils'
import { EmptyState } from './EmptyState'

interface EntryTableProps {
  entries: FinancialEntry[]
  users: AppUser[]
  currency: string
  canEdit: (entry: FinancialEntry) => boolean
  onEdit: (entry: FinancialEntry) => void
  onView: (entry: FinancialEntry) => void
  emptyTitle?: string
}

export function EntryTable({ entries, users, currency, canEdit, onEdit, onView, emptyTitle = 'No entries found' }: EntryTableProps) {
  const getUser = (id: string) => users.find((user) => user.id === id)?.name ?? 'Unknown user'
  if (!entries.length) return <EmptyState title={emptyTitle} description="Entries added in this period will appear here." />
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Entry</th>
            <th>Date and time</th>
            <th>Created by</th>
            <th>Edits</th>
            <th className="amount-cell">Amount</th>
            <th className="actions-cell">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>
                <div className="entry-title-cell">
                  <span className={`entry-kind-icon ${entry.kind}`}><ReceiptText size={17} /></span>
                  <div>
                    <strong>{entryLabel(entry)}</strong>
                    <span>{entry.kind === 'sale' ? entry.note || 'No note' : entry.description}</span>
                  </div>
                  {entry.attachmentName && <FileImage size={15} className="attachment-indicator" aria-label="Has attachment" />}
                </div>
              </td>
              <td>{formatDateTime(entry.occurredAt)}</td>
              <td>{getUser(entry.createdBy)}</td>
              <td><span className="edit-count">{entry.editCount}</span></td>
              <td className={`amount-cell ${entry.kind}`}>{entry.kind === 'cost' ? '−' : '+'}{formatCurrency(entry.amount, currency)}</td>
              <td className="actions-cell">
                <button className="icon-button subtle" type="button" onClick={() => onView(entry)} aria-label="View entry"><Eye size={17} /></button>
                <button className="icon-button subtle" type="button" onClick={() => onEdit(entry)} disabled={!canEdit(entry)} aria-label="Edit entry"><Pencil size={17} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
