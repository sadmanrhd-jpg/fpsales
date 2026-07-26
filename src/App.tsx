import { useEffect, useMemo, useState } from 'react'
import { AppShell } from './components/AppShell'
import { EntryDetails } from './components/EntryDetails'
import { EntryForm } from './components/EntryForm'
import { Modal } from './components/Modal'
import { Toast } from './components/Toast'
import { allPermissions, emptyPermissions } from './data/defaults'
import { createPasswordCredential, verifyPassword } from './lib/auth'
import { downloadFinancialReport } from './lib/pdf'
import { clearSession, loadSessionUserId, loadState, saveSessionUserId, saveState } from './lib/storage'
import { isWithinLast24Hours, randomId } from './lib/utils'
import { DashboardPage } from './pages/DashboardPage'
import { EntriesPage } from './pages/EntriesPage'
import { HistoryPage } from './pages/HistoryPage'
import { LoginPage } from './pages/LoginPage'
import { MenuPage } from './pages/MenuPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { UsersPage } from './pages/UsersPage'
import type { AppSettings, AppState, AuditRecord, CostEntry, FinancialEntry, PageKey, PeriodFilter, SalesEntry } from './types'

function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => loadSessionUserId())
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

  const currentUser = currentUserId ? state.users.find((user) => user.id === currentUserId && user.active) : undefined
  const permissions = currentUser?.role === 'superadmin' ? allPermissions() : currentUser?.permissions ?? emptyPermissions()
  const isSuperadmin = currentUser?.role === 'superadmin'

  useEffect(() => {
    if (currentUserId && !currentUser) {
      clearSession()
      setCurrentUserId(null)
    }
  }, [currentUserId, currentUser])

  const visiblePages = useMemo(() => {
    if (!currentUser) return [] as PageKey[]
    const pages: PageKey[] = []
    if (permissions['dashboard.today'] || permissions['dashboard.history']) pages.push('dashboard')
    if (permissions['sales.create'] || permissions['entries.last24h'] || permissions['entries.all']) pages.push('sales')
    if (permissions['costs.create'] || permissions['entries.last24h'] || permissions['entries.all']) pages.push('costs')
    if (permissions['menu.view'] || permissions['menu.manage']) pages.push('menu')
    if (permissions['audit.view']) pages.push('history')
    if (permissions['reports.view']) pages.push('reports')
    if (isSuperadmin) pages.push('users')
    if (isSuperadmin || permissions['settings.manage']) pages.push('settings')
    return pages
  }, [currentUser, permissions, isSuperadmin])

  useEffect(() => {
    if (!currentUser || !visiblePages.length) return
    if (!visiblePages.includes(page)) setPage(visiblePages[0])
  }, [currentUser, page, visiblePages])

  useEffect(() => {
    if (!permissions['dashboard.history'] && period !== 'daily') setPeriod('daily')
  }, [permissions, period])

  const canViewAllEntries = permissions['entries.all']
  const canViewRecentEntries = permissions['entries.last24h']
  const visibleSales = useMemo(() => canViewAllEntries ? state.sales : canViewRecentEntries ? state.sales.filter((entry) => isWithinLast24Hours(entry.occurredAt)) : [], [state.sales, canViewAllEntries, canViewRecentEntries])
  const visibleCosts = useMemo(() => canViewAllEntries ? state.costs : canViewRecentEntries ? state.costs.filter((entry) => isWithinLast24Hours(entry.occurredAt)) : [], [state.costs, canViewAllEntries, canViewRecentEntries])

  const login = async (email: string, password: string): Promise<string | null> => {
    const user = state.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase())
    if (!user || !user.active) return 'Invalid email or password.'
    const valid = await verifyPassword(user, password)
    if (!valid) return 'Invalid email or password.'
    saveSessionUserId(user.id)
    setCurrentUserId(user.id)
    setPage('dashboard')
    return null
  }

  const logout = () => {
    clearSession()
    setCurrentUserId(null)
    setModal(null)
    setPage('dashboard')
    setPeriod('daily')
  }

  if (!currentUser) return <LoginPage onLogin={login} />

  const canEdit = (entry: FinancialEntry) => {
    if (isSuperadmin) return true
    if (currentUser.role === 'reception') return permissions['entries.editLimited'] && entry.editCount < 2 && isWithinLast24Hours(entry.occurredAt)
    if (permissions['entries.editUnlimited']) return true
    if (permissions['entries.editLimited']) return entry.editCount < 2 && isWithinLast24Hours(entry.occurredAt)
    return false
  }

  const openAdd = (kind: 'sale' | 'cost') => {
    if (kind === 'sale' && !permissions['sales.create']) return
    if (kind === 'cost' && !permissions['costs.create']) return
    setModal({ mode: 'add', kind })
  }
  const openEdit = (entry: FinancialEntry) => { if (canEdit(entry)) setModal({ mode: 'edit', kind: entry.kind, entry }) }
  const openView = (entry: FinancialEntry) => setModal({ mode: 'view', entry })

  const createEntry = (payload: Omit<SalesEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'> | Omit<CostEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'>) => {
    const now = new Date().toISOString()
    if (modal?.kind === 'sale' && permissions['sales.create']) {
      const entry: SalesEntry = { ...(payload as Omit<SalesEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'>), id: randomId('sale'), kind: 'sale', createdAt: now, createdBy: currentUser.id, editCount: 0 }
      setState((current) => ({ ...current, sales: [entry, ...current.sales] }))
    } else if (modal?.kind === 'cost' && permissions['costs.create']) {
      const entry: CostEntry = { ...(payload as Omit<CostEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'>), id: randomId('cost'), kind: 'cost', createdAt: now, createdBy: currentUser.id, editCount: 0 }
      setState((current) => ({ ...current, costs: [entry, ...current.costs] }))
    } else return
    setModal(null)
    setToast(`${modal?.kind === 'sale' ? 'Sale' : 'Cost'} entry added.`)
  }

  const editEntry = (payload: Omit<SalesEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'> | Omit<CostEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'>, reason?: string) => {
    const original = modal?.entry
    if (!original || !reason || !canEdit(original)) return
    const updated = { ...original, ...payload, editCount: original.editCount + 1 } as FinancialEntry
    const audit: AuditRecord = {
      id: randomId('audit'),
      entryId: original.id,
      entryKind: original.kind,
      originalData: structuredClone(original),
      updatedData: structuredClone(updated),
      reason,
      editedBy: currentUser.id,
      editedAt: new Date().toISOString(),
      editNumber: updated.editCount,
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
    if (!permissions['reports.export']) return
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
      title: `${labels[period]} report`,
      subtitle: `Generated ${new Date().toLocaleString('en-GB')}`,
      sales: state.sales.filter((entry) => new Date(entry.occurredAt).getTime() >= start),
      costs: state.costs.filter((entry) => new Date(entry.occurredAt).getTime() >= start),
      settings: state.settings,
    })
  }

  const saveSettings = (settings: AppSettings) => { setState((current) => ({ ...current, settings })); setToast('Settings saved.') }
  const updateUsers = (users: AppState['users']) => setState((current) => ({ ...current, users }))
  const updateMenuCategories = (menuCategories: AppState['menuCategories']) => setState((current) => ({ ...current, menuCategories }))
  const updateMenuItems = (menuItems: AppState['menuItems']) => setState((current) => ({ ...current, menuItems }))

  const changeOwnPassword = async (currentPassword: string, newPassword: string): Promise<string | null> => {
    if (!isSuperadmin) return 'Only the superadmin can change passwords.'
    const valid = await verifyPassword(currentUser, currentPassword)
    if (!valid) return 'The current password is incorrect.'
    const credential = await createPasswordCredential(newPassword)
    setState((current) => ({ ...current, users: current.users.map((user) => user.id === currentUser.id ? { ...user, ...credential } : user) }))
    return null
  }

  const noAccess = !visiblePages.length
  const effectivePage = visiblePages.includes(page) ? page : visiblePages[0] ?? 'dashboard'
  const pageContent = (() => {
    if (noAccess) return <section className="content-card no-access-card"><h1>No permissions assigned</h1><p>Ask the superadmin to grant access to the required modules.</p></section>
    if (effectivePage === 'sales') return <EntriesPage kind="sale" entries={visibleSales} users={state.users} currency={state.settings.currencyCode} limitedTo24Hours={!canViewAllEntries} canCreate={permissions['sales.create']} canEdit={canEdit} onCreate={() => openAdd('sale')} onEdit={openEdit} onView={openView} />
    if (effectivePage === 'costs') return <EntriesPage kind="cost" entries={visibleCosts} users={state.users} currency={state.settings.currencyCode} limitedTo24Hours={!canViewAllEntries} canCreate={permissions['costs.create']} canEdit={canEdit} onCreate={() => openAdd('cost')} onEdit={openEdit} onView={openView} />
    if (effectivePage === 'menu') return <MenuPage categories={state.menuCategories} items={state.menuItems} currency={state.settings.currencyCode} canManage={permissions['menu.manage']} currentUserId={currentUser.id} onCategoriesChange={updateMenuCategories} onItemsChange={updateMenuItems} onNotify={setToast} />
    if (effectivePage === 'history') return <HistoryPage records={state.auditRecords} users={state.users} currency={state.settings.currencyCode} />
    if (effectivePage === 'reports') return <ReportsPage sales={state.sales} costs={state.costs} settings={state.settings} canExport={permissions['reports.export']} />
    if (effectivePage === 'users' && isSuperadmin) return <UsersPage users={state.users} currentUserId={currentUser.id} onUsersChange={updateUsers} onNotify={setToast} />
    if (effectivePage === 'settings') return <SettingsPage settings={state.settings} canManageSettings={isSuperadmin || permissions['settings.manage']} isSuperadmin={isSuperadmin} onSave={saveSettings} onChangeOwnPassword={changeOwnPassword} />
    return <DashboardPage period={period} onPeriodChange={setPeriod} sales={visibleSales} costs={visibleCosts} users={state.users} currency={state.settings.currencyCode} receptionMode={!permissions['dashboard.history']} canExport={permissions['reports.export']} canAddSale={permissions['sales.create']} canAddCost={permissions['costs.create']} canEdit={canEdit} onAddSale={() => openAdd('sale')} onAddCost={() => openAdd('cost')} onEdit={openEdit} onView={openView} onExport={exportCurrentPeriod} />
  })()

  return (
    <>
      <AppShell activePage={effectivePage} onPageChange={setPage} currentUser={currentUser} onLogout={logout} visiblePages={visiblePages}>{pageContent}</AppShell>
      {modal?.mode === 'add' && modal.kind && <Modal title={`Add ${modal.kind}`} onClose={() => setModal(null)}><EntryForm kind={modal.kind} onSubmit={createEntry} onCancel={() => setModal(null)} /></Modal>}
      {modal?.mode === 'edit' && modal.kind && modal.entry && <Modal title={`Edit ${modal.kind}`} onClose={() => setModal(null)}><EntryForm kind={modal.kind} entry={modal.entry} requireReason onSubmit={editEntry} onCancel={() => setModal(null)} /></Modal>}
      {modal?.mode === 'view' && modal.entry && <Modal title="Entry details" onClose={() => setModal(null)}><EntryDetails entry={modal.entry} users={state.users} currency={state.settings.currencyCode} /></Modal>}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  )
}

export default App
