import { ArrowRight, FileClock } from 'lucide-react'
import type { AppUser, AuditRecord } from '../types'
import { entryLabel, formatCurrency, formatDateTime } from '../lib/utils'
import { EmptyState } from '../components/EmptyState'

export function HistoryPage({ records, users, currency }: { records: AuditRecord[]; users: AppUser[]; currency: string }) {
  const getUser = (id: string) => users.find((user) => user.id === id)?.name ?? 'Unknown user'
  const sorted = [...records].sort((a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime())
  return (
    <div className="page-stack">
      <section className="page-heading compact-heading"><div><span className="eyebrow">Audit trail</span><h1>Edit history</h1><p>Original and updated information remains available for review.</p></div></section>
      <section className="content-card">
        {!sorted.length ? <EmptyState title="No edits recorded" description="Every future correction will appear here with its reason and editor." /> : (
          <div className="history-list">
            {sorted.map((record) => (
              <article className="history-card" key={record.id}>
                <div className="history-header">
                  <span className="history-icon"><FileClock size={19} /></span>
                  <div><strong>{entryLabel(record.updatedData)}</strong><span>{formatDateTime(record.editedAt)} by {getUser(record.editedBy)}</span></div>
                  <span className="edit-badge">Edit {record.editNumber}</span>
                </div>
                <div className="history-change-grid">
                  <div><small>Original amount</small><strong>{formatCurrency(record.originalData.amount, currency)}</strong></div>
                  <ArrowRight size={18} />
                  <div><small>Updated amount</small><strong>{formatCurrency(record.updatedData.amount, currency)}</strong></div>
                </div>
                <div className="history-reason"><small>Reason</small><p>{record.reason}</p></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
