import { useEffect, useMemo, useState } from 'react'
import { AppShell } from './components/AppShell'
import { EntryDetails } from './components/EntryDetails'
import { EntryForm } from './components/EntryForm'
import { Modal } from './components/Modal'
import { Toast } from './components/Toast'
import { DashboardPage } from './pages/DashboardPage'
import { EntriesPage } from './pages/EntriesPage'
import { HistoryPage } from './pages/HistoryPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { UsersPage } from './pages/UsersPage'
import { downloadFinancialReport } from './lib/pdf'
import { isWithinLast24Hours, randomId } from './lib/utils'
import { loadState, resetState, saveState } from './lib/storage'
import type { AppSettings, AppState, AuditRecord, CostEntry, FinancialEntry, PageKey, PeriodFilter, RolePermissions, SalesEntry } from './types'

function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [currentUserId, setCurrentUserId] = useState(() => loadState().users.find((user) => user.role === 'reception')?.id ?? loadState().users[0].id)
  const [page, setPage] = useState<PageKey>('dashboard')
  const [period, setPeriod] = useState<PeriodFilter>('daily')
  const [modal, setModal] = useState<{ mode: 'add' | 'edit' | 'view'; kind?: 'sale' | 'cost'; entry?: FinancialEntry } | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => saveState(state), [state])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const currentUser = state.users.find((user) => user.id === currentUserId) ?? state.users[0]
  const permissions = state.rolePermissions[currentUser.role]
  const receptionMode = currentUser.role === 'reception'

  const visibleSales = useMemo(() => receptionMode ? state.sales.filter((entry) => isWithinLast24Hours(entry.occurredAt)) : state.sales, [state.sales, receptionMode])
  const visibleCosts = useMemo(() => receptionMode ? state.costs.filter((entry) => isWithinLast24Hours(entry.occurredAt)) : state.costs, [state.costs, receptionMode])

  useEffect(() => {
    if (receptionMode && period !== 'daily') setPeriod('daily')
  }, [receptionMode, period])

  const visiblePages: PageKey[] = ['dashboard', 'sales', 'costs']
  if (permissions['audit.view']) visiblePages.push('history')
  if (permissions['reports.view']) visiblePages.push('reports')
  if (permissions['users.manage']) visiblePages.push('users')
  if (permissions['settings.manage']) visiblePages.push('settings')

  useEffect(() => {
    if (!visiblePages.includes(page)) setPage('dashboard')
  }, [currentUserId])

  const canEdit = (entry: FinancialEntry) => {
    if (permissions['entries.editUnlimited']) return true
    if (permissions['entries.editLimited']) return entry.editCount < 2 && isWithinLast24Hours(entry.occurredAt)
    return false
  }

  const openAdd = (kind: 'sale' | 'cost') => setModal({ mode: 'add', kind })
  const openEdit = (entry: FinancialEntry) => {
    if (!canEdit(entry)) return
    setModal({ mode: 'edit', kind: entry.kind, entry })
  }
  const openView = (entry: FinancialEntry) => setModal({ mode: 'view', entry })

  const createEntry = (payload: Omit<SalesEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'> | Omit<CostEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'>) => {
    const now = new Date().toISOString()
    if (modal?.kind === 'sale') {
      const entry: SalesEntry = { ...(payload as Omit<SalesEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'>), id: randomId('sale'), kind: 'sale', createdAt: now, createdBy: currentUser.id, editCount: 0 }
      setState((current) => ({ ...current, sales: [entry, ...current.sales] }))
    } else {
      const entry: CostEntry = { ...(payload as Omit<CostEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'>), id: randomId('cost'), kind: 'cost', createdAt: now, createdBy: currentUser.id, editCount: 0 }
      setState((current) => ({ ...current, costs: [entry, ...current.costs] }))
    }
    setModal(null)
    setToast(`${modal?.kind === 'sale' ? 'Sale' : 'Cost'} entry added.`)
  }

  const editEntry = (payload: Omit<SalesEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'> | Omit<CostEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'>, reason?: string) => {
    const original = modal?.entry
    if (!original || !reason) return
    const updated = { ...original, ...payload, editCount: original.editCount + 1 } as FinancialEntry
    const audit: AuditRecord = {
      id: randomId('audit'), entryId: original.id, entryKind: original.kind,
      originalData: structuredClone(original), updatedData: structuredClone(updated),
      reason, editedBy: currentUser.id, editedAt: new Date().toISOString(), editNumber: updated.editCount,
    }
    setState((current) => ({
      ...current,
      sales: original.kind === 'sale' ? current.sales.map((entry) => entry.id === original.id ? updated as SalesEntry : entry) : current.sales,
      costs: original.kind === 'cost' ? current.costs.map((entry) => entry.id === original.id ? updated as CostEntry : entry) : current.costs,
      auditRecords: [audit, ...current.auditRecords],
    }))
    setModal(null)
    setToast('Entry updated and added to the audit history.')
  }

  const exportCurrentPeriod = () => {
    const labels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }
    const getStart = () => {
      const date = new Date()
      if (period === 'daily') date.setHours(0, 0, 0, 0)
      if (period === 'weekly') { const day = date.getDay(); date.setDate(date.getDate() - (day === 0 ? 6 : day - 1)); date.setHours(0, 0, 0, 0) }
      if (period === 'monthly') { date.setDate(1); date.setHours(0, 0, 0, 0) }
      return date
    }
    const start = getStart().getTime()
    downloadFinancialReport({
      title: `${labels[period]} report`, subtitle: `Generated ${new Date().toLocaleString('en-GB')}`,
      sales: state.sales.filter((entry) => new Date(entry.occurredAt).getTime() >= start),
      costs: state.costs.filter((entry) => new Date(entry.occurredAt).getTime() >= start),
      settings: state.settings,
    })
  }

  const saveSettings = (settings: AppSettings) => { setState((current) => ({ ...current, settings })); setToast('Settings saved.') }
  const updateUsers = (users: AppState['users']) => setState((current) => ({ ...current, users }))
  const updatePermissions = (rolePermissions: RolePermissions) => setState((current) => ({ ...current, rolePermissions }))
  const handleReset = () => {
    const next = resetState()
    setState(next)
    setCurrentUserId(next.users[0].id)
    setPage('dashboard')
    setToast('Demo data reset.')
  }

  const pageContent = (() => {
    if (page === 'sales') return <EntriesPage kind="sale" entries={visibleSales} users={state.users} currency={state.settings.currencyCode} limitedTo24Hours={receptionMode} canCreate={permissions['sales.create']} canEdit={canEdit} onCreate={() => openAdd('sale')} onEdit={openEdit} onView={openView} />
    if (page === 'costs') return <EntriesPage kind="cost" entries={visibleCosts} users={state.users} currency={state.settings.currencyCode} limitedTo24Hours={receptionMode} canCreate={permissions['costs.create']} canEdit={canEdit} onCreate={() => openAdd('cost')} onEdit={openEdit} onView={openView} />
    if (page === 'history') return <HistoryPage records={state.auditRecords} users={state.users} currency={state.settings.currencyCode} />
    if (page === 'reports') return <ReportsPage sales={state.sales} costs={state.costs} settings={state.settings} canExport={permissions['reports.export']} />
    if (page === 'users') return <UsersPage users={state.users} permissions={state.rolePermissions} onUsersChange={updateUsers} onPermissionsChange={updatePermissions} onNotify={setToast} />
    if (page === 'settings') return <SettingsPage settings={state.settings} onSave={saveSettings} onReset={handleReset} />
    return <DashboardPage period={period} onPeriodChange={setPeriod} sales={visibleSales} costs={visibleCosts} users={state.users} currency={state.settings.currencyCode} receptionMode={receptionMode} canExport={permissions['reports.export']} canEdit={canEdit} onAddSale={() => openAdd('sale')} onAddCost={() => openAdd('cost')} onEdit={openEdit} onView={openView} onExport={exportCurrentPeriod} />
  })()

  return (
    <>
      <AppShell activePage={page} onPageChange={setPage} currentUser={currentUser} users={state.users} onUserChange={setCurrentUserId} visiblePages={visiblePages}>{pageContent}</AppShell>
      {modal?.mode === 'add' && modal.kind && <Modal title={`Add ${modal.kind} entry`} onClose={() => setModal(null)}><EntryForm kind={modal.kind} onSubmit={createEntry} onCancel={() => setModal(null)} /></Modal>}
      {modal?.mode === 'edit' && modal.kind && modal.entry && <Modal title={`Edit ${modal.kind} entry`} onClose={() => setModal(null)}><EntryForm kind={modal.kind} entry={modal.entry} requireReason onSubmit={editEntry} onCancel={() => setModal(null)} /></Modal>}
      {modal?.mode === 'view' && modal.entry && <Modal title="Entry details" onClose={() => setModal(null)}><EntryDetails entry={modal.entry} users={state.users} currency={state.settings.currencyCode} /></Modal>}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  )
}

export default App
