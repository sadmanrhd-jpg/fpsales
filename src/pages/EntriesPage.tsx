import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { AppUser, FinancialEntry } from '../types'
import { entryLabel, sortNewest } from '../lib/utils'
import { EntryTable } from '../components/EntryTable'

interface EntriesPageProps {
  kind: 'sale' | 'cost'
  entries: FinancialEntry[]
  users: AppUser[]
  currency: string
  limitedTo24Hours: boolean
  canCreate: boolean
  canEdit: (entry: FinancialEntry) => boolean
  canDelete?: (entry: FinancialEntry) => boolean
  onCreate: () => void
  onEdit: (entry: FinancialEntry) => void
  onView: (entry: FinancialEntry) => void
  onDelete?: (entry: FinancialEntry) => void
}

export function EntriesPage({ kind, entries, users, currency, limitedTo24Hours, canCreate, canEdit, canDelete, onCreate, onEdit, onView, onDelete }: EntriesPageProps) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => sortNewest(entries).filter((entry) => `${entryLabel(entry)} ${entry.kind === 'sale' ? entry.note : entry.description}`.toLowerCase().includes(query.toLowerCase())), [entries, query])
  const title = kind === 'sale' ? 'Sales entries' : 'Cost entries'
  return (
    <div className="page-stack">
      <section className="page-heading compact-heading">
        <div><span className="eyebrow">{kind === 'sale' ? 'Revenue records' : 'Expense records'}</span><h1>{title}</h1><p>{limitedTo24Hours ? 'Reception access shows entries from the last 24 hours.' : 'Review and correct all recorded transactions.'}</p></div>
        {canCreate && <button className="button primary" type="button" onClick={onCreate}><Plus size={18} /> Add {kind}</button>}
      </section>
      <section className="content-card">
        <div className="table-toolbar">
          <div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${kind} entries`} /></div>
          <span className="section-count">{filtered.length} entries</span>
        </div>
        <EntryTable entries={filtered} users={users} currency={currency} canEdit={canEdit} canDelete={canDelete} onEdit={onEdit} onView={onView} onDelete={onDelete} emptyTitle={`No ${kind} entries found`} />
      </section>
      {canCreate && <button className={`floating-add ${kind}`} type="button" onClick={onCreate} aria-label={`Add ${kind}`}><Plus size={26} /></button>}
    </div>
  )
}
