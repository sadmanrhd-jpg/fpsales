import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ShieldCheck, Trash2 } from 'lucide-react'
import { AppShell } from './components/AppShell'
import { EntryDetails } from './components/EntryDetails'
import { EntryForm } from './components/EntryForm'
import { Modal } from './components/Modal'
import { Toast } from './components/Toast'
import { allPermissions, defaultState, emptyPermissions } from './data/defaults'
import { loadAppData, runAppAction } from './lib/api'
import { downloadFinancialReport } from './lib/pdf'
import { setRememberSession, supabase } from './lib/supabase'
import { isWithinLast24Hours } from './lib/utils'
import { DashboardPage } from './pages/DashboardPage'
import { EntriesPage } from './pages/EntriesPage'
import { HistoryPage } from './pages/HistoryPage'
import { LoginPage } from './pages/LoginPage'
import { MenuPage } from './pages/MenuPage'
import { OrdersPage } from './pages/OrdersPage'
import { ReportsPage } from './pages/ReportsPage'
import { SalesOrderPage } from './pages/SalesOrderPage'
import { SettingsPage } from './pages/SettingsPage'
import { UsersPage } from './pages/UsersPage'
import type { AppSettings, AppState, CostEntry, FinancialEntry, MenuItem, OngoingOrder, PageKey, PeriodFilter, Role, SalesEntry, UserPermissions } from './types'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The request could not be completed.'
}

function App() {
  const [state, setState] = useState<AppState>(() => structuredClone(defaultState))
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<PageKey>('dashboard')
  const [period, setPeriod] = useState<PeriodFilter>('daily')
  const [modal, setModal] = useState<{ mode: 'add' | 'edit' | 'view'; kind?: 'sale' | 'cost'; entry?: FinancialEntry } | null>(null)
  const [toast, setToast] = useState('')
  const [pendingCostDelete, setPendingCostDelete] = useState<CostEntry | null>(null)
  const [costDeletionPin, setCostDeletionPin] = useState('')
  const [costDeletionError, setCostDeletionError] = useState('')
  const [checkingCostDeletionPin, setCheckingCostDeletionPin] = useState(false)

  const refreshData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true)
    try {
      const result = await loadAppData()
      setState(result.state)
      setCurrentUserId(result.currentUserId)
    } finally {
      if (showLoader) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const initialise = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        try {
          await refreshData(false)
        } catch {
          await supabase.auth.signOut()
        }
      }
      if (mounted) setLoading(false)
    }
    void initialise()
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setState(structuredClone(defaultState))
        setCurrentUserId(null)
      }
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [refreshData])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const currentUser = currentUserId ? state.users.find((user) => user.id === currentUserId && user.active) : undefined
  const permissions = currentUser?.role === 'superadmin' ? allPermissions() : currentUser?.permissions ?? emptyPermissions()
  const isSuperadmin = currentUser?.role === 'superadmin'

  const visiblePages = useMemo(() => {
    if (!currentUser) return [] as PageKey[]
    const pages: PageKey[] = []
    if (permissions['dashboard.today'] || permissions['dashboard.history'] || permissions['dashboard.export']) pages.push('dashboard')
    if (permissions['sales.view24h'] || permissions['sales.viewAll'] || permissions['sales.create'] || permissions['sales.edit'] || permissions['sales.printKot'] || permissions['sales.printBill']) pages.push('sales')
    if (permissions['orders.view']) pages.push('orders')
    if (permissions['costs.view24h'] || permissions['costs.viewAll'] || permissions['costs.create'] || permissions['costs.edit'] || permissions['costs.remove']) pages.push('costs')
    if (permissions['menu.view'] || permissions['menu.categories.create'] || permissions['menu.categories.remove'] || permissions['menu.items.create'] || permissions['menu.items.edit'] || permissions['menu.items.availability'] || permissions['menu.items.remove']) pages.push('menu')
    if (permissions['audit.view']) pages.push('history')
    if (permissions['reports.view']) pages.push('reports')
    if (isSuperadmin) pages.push('users')
    pages.push('settings')
    return pages
  }, [currentUser, permissions, isSuperadmin])

  useEffect(() => {
    if (!currentUser || !visiblePages.length) return
    if (!visiblePages.includes(page)) setPage(visiblePages[0])
  }, [currentUser, page, visiblePages])

  useEffect(() => {
    if (!permissions['dashboard.history'] && period !== 'daily') setPeriod('daily')
  }, [permissions, period])

  const visibleSales = useMemo(() => {
    if (permissions['sales.viewAll']) return state.sales
    if (permissions['sales.view24h']) return state.sales.filter((entry) => isWithinLast24Hours(entry.occurredAt))
    return []
  }, [state.sales, permissions])

  const visibleCosts = useMemo(() => {
    if (permissions['costs.viewAll']) return state.costs
    if (permissions['costs.view24h']) return state.costs.filter((entry) => isWithinLast24Hours(entry.occurredAt))
    return []
  }, [state.costs, permissions])

  const login = async (email: string, password: string, rememberMe: boolean): Promise<string | null> => {
    try {
      setRememberSession(rememberMe)
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (error) return 'Invalid email or password.'
      await refreshData(true)
      setPage('dashboard')
      return null
    } catch (error) {
      await supabase.auth.signOut()
      return errorMessage(error)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setModal(null)
    setPendingCostDelete(null)
    setCostDeletionPin('')
    setCostDeletionError('')
    setPage('dashboard')
    setPeriod('daily')
  }

  if (loading) return <main className="login-page"><section className="login-card"><div className="login-brand"><img src="/food-pavilion-logo.png" alt="Food Pavilion" /><span>Connecting securely to Supabase</span></div><div className="login-copy"><h1>Loading your restaurant data</h1><p>Please keep this page open.</p></div></section></main>
  if (!currentUser) return <LoginPage onLogin={login} />

  const canEdit = (entry: FinancialEntry) => {
    const hasEditPermission = entry.kind === 'sale' ? permissions['sales.edit'] : permissions['costs.edit']
    if (!hasEditPermission) return false
    if (isSuperadmin) return true
    if (currentUser.role === 'reception') return entry.editCount < 2 && isWithinLast24Hours(entry.occurredAt)
    return true
  }

  const openAdd = (kind: 'sale' | 'cost') => {
    if (kind === 'sale' && !permissions['sales.create']) return
    if (kind === 'cost' && !permissions['costs.create']) return
    setModal({ mode: 'add', kind })
  }

  const openEdit = (entry: FinancialEntry) => {
    if (canEdit(entry)) setModal({ mode: 'edit', kind: entry.kind, entry })
  }

  const openView = (entry: FinancialEntry) => setModal({ mode: 'view', entry })

  const requestDeleteCost = (entry: FinancialEntry) => {
    if (!permissions['costs.remove'] || entry.kind !== 'cost') return
    if (!currentUser.hasDeletionPin) {
      setToast('Create your 4 digit deletion PIN in Settings before deleting cost entries.')
      return
    }
    setPendingCostDelete(entry)
    setCostDeletionPin('')
    setCostDeletionError('')
  }

  const closeCostDeleteModal = () => {
    setPendingCostDelete(null)
    setCostDeletionPin('')
    setCostDeletionError('')
    setCheckingCostDeletionPin(false)
  }

  const confirmCostDeletion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!pendingCostDelete || !permissions['costs.remove']) return
    if (!/^\d{4}$/.test(costDeletionPin)) {
      setCostDeletionError('Enter your 4 digit deletion PIN.')
      return
    }
    setCheckingCostDeletionPin(true)
    try {
      await runAppAction('delete_cost', { id: pendingCostDelete.id, pin: costDeletionPin })
      await refreshData()
      closeCostDeleteModal()
      setToast('Cost entry deleted.')
    } catch (error) {
      setCostDeletionError(errorMessage(error))
    } finally {
      setCheckingCostDeletionPin(false)
    }
  }

  const createEntry = async (payload: Omit<SalesEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'> | Omit<CostEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'>) => {
    if (!modal?.kind) return
    try {
      await runAppAction('create_entry', { ...payload, kind: modal.kind })
      await refreshData()
      setModal(null)
      setToast(`${modal.kind === 'sale' ? 'Sale' : 'Cost'} entry added.`)
    } catch (error) {
      setToast(errorMessage(error))
    }
  }

  const editEntry = async (payload: Omit<SalesEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'> | Omit<CostEntry, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'editCount'>, reason?: string) => {
    const original = modal?.entry
    if (!original || !reason || !canEdit(original)) return
    try {
      await runAppAction('update_entry', { id: original.id, ...payload, reason })
      await refreshData()
      setModal(null)
      setToast('Entry updated and added to the audit history.')
    } catch (error) {
      setToast(errorMessage(error))
    }
  }

  const exportCurrentPeriod = () => {
    if (!permissions['dashboard.export']) return
    const labels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }
    const getStart = () => {
      const date = new Date()
      if (period === 'daily') date.setHours(0, 0, 0, 0)
      if (period === 'weekly') {
        const day = date.getDay()
        date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
        date.setHours(0, 0, 0, 0)
      }
      if (period === 'monthly') {
        date.setDate(1)
        date.setHours(0, 0, 0, 0)
      }
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

  const saveSettings = async (settings: AppSettings): Promise<string | null> => {
    try {
      await runAppAction('save_settings', { settings })
      await refreshData()
      setToast('Settings saved.')
      return null
    } catch (error) {
      return errorMessage(error)
    }
  }

  const createOngoingOrder = async (draft: Omit<OngoingOrder, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status'>) => {
    try {
      const order = await runAppAction<OngoingOrder>('create_order', draft)
      await refreshData()
      return { order }
    } catch (error) {
      return { error: errorMessage(error) }
    }
  }

  const updateOngoingOrder = async (order: OngoingOrder): Promise<string | null> => {
    try {
      await runAppAction('update_order', order)
      await refreshData()
      return null
    } catch (error) {
      return errorMessage(error)
    }
  }

  const completeOrderSale = async (sale: Pick<SalesEntry, 'amount' | 'paymentMethod' | 'note' | 'occurredAt'>): Promise<string | null> => {
    try {
      await runAppAction('complete_sale', sale)
      await refreshData()
      setToast('Bill printed and sale recorded.')
      return null
    } catch (error) {
      return errorMessage(error)
    }
  }

  const completeOngoingOrder = async (orderId: string, sale: Pick<SalesEntry, 'amount' | 'paymentMethod' | 'note' | 'occurredAt'>): Promise<string | null> => {
    try {
      await runAppAction('complete_order', { orderId, sale })
      await refreshData()
      setToast('Bill printed, sale recorded, and order completed.')
      return null
    } catch (error) {
      return errorMessage(error)
    }
  }

  const changeOwnPassword = async (currentPassword: string, newPassword: string): Promise<string | null> => {
    if (!isSuperadmin) return 'Only the superadmin can change passwords.'
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: currentUser.email, password: currentPassword })
    if (signInError) return 'The current password is incorrect.'
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return error ? error.message : null
  }

  const saveOwnDeletionPin = async (currentPin: string, newPin: string): Promise<string | null> => {
    try {
      await runAppAction('save_deletion_pin', { currentPin, newPin })
      await refreshData()
      return null
    } catch (error) {
      return errorMessage(error)
    }
  }

  const createUser = async (input: { name: string; email: string; role: Role; password: string; permissions: UserPermissions }): Promise<string | null> => {
    try {
      await runAppAction('create_user', input)
      await refreshData()
      return null
    } catch (error) {
      return errorMessage(error)
    }
  }

  const updateUser = async (id: string, changes: { role?: Role; active?: boolean; permissions?: UserPermissions }): Promise<string | null> => {
    try {
      await runAppAction('update_user', { id, ...changes })
      await refreshData()
      return null
    } catch (error) {
      return errorMessage(error)
    }
  }

  const resetUserPassword = async (id: string, password: string): Promise<string | null> => {
    try {
      await runAppAction('reset_user_password', { id, password })
      return null
    } catch (error) {
      return errorMessage(error)
    }
  }

  const menuAction = async (action: string, payload: unknown): Promise<string | null> => {
    try {
      await runAppAction(action, payload)
      await refreshData()
      return null
    } catch (error) {
      return errorMessage(error)
    }
  }

  const noAccess = !visiblePages.length
  const effectivePage = visiblePages.includes(page) ? page : visiblePages[0] ?? 'settings'
  const pageContent = (() => {
    if (noAccess) return <section className="content-card no-access-card"><h1>No permissions assigned</h1><p>Ask the superadmin to grant access to the required modules.</p></section>
    if (effectivePage === 'sales') return <SalesOrderPage categories={state.menuCategories} items={state.menuItems} currency={state.settings.currencyCode} restaurantName={state.settings.restaurantName} branchName={state.settings.branchName} recentSales={visibleSales} nextOrderNumber={state.nextOrderNumber} canCreateOrder={permissions['sales.create']} canPrintKot={permissions['sales.printKot']} canPrintBill={permissions['sales.printBill']} onCreateOrder={createOngoingOrder} onCompleteSale={completeOrderSale} onNotify={setToast} />
    if (effectivePage === 'orders') return <OrdersPage orders={state.orders} currency={state.settings.currencyCode} restaurantName={state.settings.restaurantName} branchName={state.settings.branchName} canEdit={permissions['orders.edit']} canPrintKot={permissions['sales.printKot']} canPrintBill={permissions['sales.printBill'] && permissions['sales.create']} onUpdateOrder={updateOngoingOrder} onCompleteOrder={completeOngoingOrder} onNotify={setToast} />
    if (effectivePage === 'costs') return <EntriesPage kind="cost" entries={visibleCosts} users={state.users} currency={state.settings.currencyCode} limitedTo24Hours={permissions['costs.view24h'] && !permissions['costs.viewAll']} canCreate={permissions['costs.create']} canEdit={canEdit} canDelete={(entry) => permissions['costs.remove'] && entry.kind === 'cost'} onCreate={() => openAdd('cost')} onEdit={openEdit} onView={openView} onDelete={requestDeleteCost} />
    if (effectivePage === 'menu') return <MenuPage categories={state.menuCategories} items={state.menuItems} currency={state.settings.currencyCode} canCreateCategory={permissions['menu.categories.create']} canDeleteCategory={permissions['menu.categories.remove']} canCreateItem={permissions['menu.items.create']} canEditItem={permissions['menu.items.edit']} canChangeAvailability={permissions['menu.items.availability']} canDeleteItem={permissions['menu.items.remove']} hasDeletionPin={currentUser.hasDeletionPin} onCreateCategory={(name) => menuAction('create_menu_category', { name })} onDeleteCategory={(id, pin) => menuAction('delete_menu_category', { id, pin })} onSaveItem={(id, data) => menuAction(id ? 'update_menu_item' : 'create_menu_item', { id, ...data })} onToggleAvailability={(item: MenuItem) => menuAction('toggle_menu_item', { id: item.id, available: !item.available })} onDeleteItem={(id, pin) => menuAction('delete_menu_item', { id, pin })} onNotify={setToast} />
    if (effectivePage === 'history') return <HistoryPage records={state.auditRecords} users={state.users} currency={state.settings.currencyCode} />
    if (effectivePage === 'reports') return <ReportsPage sales={state.sales} costs={state.costs} settings={state.settings} canExport={permissions['reports.export']} />
    if (effectivePage === 'users' && isSuperadmin) return <UsersPage users={state.users} currentUserId={currentUser.id} onCreateUser={createUser} onUpdateUser={updateUser} onResetPassword={resetUserPassword} onNotify={setToast} />
    if (effectivePage === 'settings') return <SettingsPage settings={state.settings} canManageSettings={permissions['settings.manage']} isSuperadmin={isSuperadmin} hasDeletionPin={currentUser.hasDeletionPin} onSave={saveSettings} onChangeOwnPassword={changeOwnPassword} onSaveDeletionPin={saveOwnDeletionPin} />
    return <DashboardPage period={period} onPeriodChange={setPeriod} sales={visibleSales} costs={visibleCosts} users={state.users} currency={state.settings.currencyCode} receptionMode={!permissions['dashboard.history']} canExport={permissions['dashboard.export']} canAddSale={permissions['sales.create']} canAddCost={permissions['costs.create']} canEdit={canEdit} canDelete={(entry) => permissions['costs.remove'] && entry.kind === 'cost'} onAddSale={() => setPage('sales')} onAddCost={() => setPage('costs')} onEdit={openEdit} onView={openView} onDelete={requestDeleteCost} onExport={exportCurrentPeriod} />
  })()

  return (
    <>
      <AppShell activePage={effectivePage} onPageChange={setPage} currentUser={currentUser} onLogout={() => void logout()} visiblePages={visiblePages}>{pageContent}</AppShell>
      {modal?.mode === 'add' && modal.kind && <Modal title={`Add ${modal.kind}`} onClose={() => setModal(null)}><EntryForm kind={modal.kind} onSubmit={createEntry} onCancel={() => setModal(null)} /></Modal>}
      {modal?.mode === 'edit' && modal.kind && modal.entry && <Modal title={`Edit ${modal.kind}`} onClose={() => setModal(null)}><EntryForm kind={modal.kind} entry={modal.entry} requireReason onSubmit={editEntry} onCancel={() => setModal(null)} /></Modal>}
      {modal?.mode === 'view' && modal.entry && <Modal title="Entry details" onClose={() => setModal(null)}><EntryDetails entry={modal.entry} users={state.users} currency={state.settings.currencyCode} /></Modal>}
      {pendingCostDelete && <Modal title="Confirm cost deletion" onClose={closeCostDeleteModal}><form className="entry-form deletion-confirm-form" onSubmit={confirmCostDeletion}>
        <div className="deletion-warning"><ShieldCheck size={24} /><div><strong>Delete this cost entry?</strong><p>{pendingCostDelete.category}: {pendingCostDelete.description}. This action requires your deletion PIN.</p></div></div>
        <label className="field"><span>Deletion PIN</span><input type="password" inputMode="numeric" maxLength={4} value={costDeletionPin} onChange={(event) => { setCostDeletionPin(event.target.value.replace(/\D/g, '').slice(0, 4)); setCostDeletionError('') }} autoComplete="off" placeholder="Enter 4 digits" autoFocus /></label>
        {costDeletionError && <p className="form-error">{costDeletionError}</p>}
        <div className="form-actions"><button className="button secondary" type="button" onClick={closeCostDeleteModal}>Cancel</button><button className="button deletion-button" type="submit" disabled={checkingCostDeletionPin || costDeletionPin.length !== 4}><Trash2 size={17} /> {checkingCostDeletionPin ? 'Checking...' : 'Delete cost'}</button></div>
      </form></Modal>}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  )
}

export default App
