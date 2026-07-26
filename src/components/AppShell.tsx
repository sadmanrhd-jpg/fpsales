import { BarChart3, ClipboardList, FileClock, LayoutDashboard, ListOrdered, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Receipt, Settings, SlidersHorizontal, Users, UtensilsCrossed, WalletCards, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { AppUser, PageKey, Role } from '../types'

interface AppShellProps {
  children: ReactNode
  activePage: PageKey
  onPageChange: (page: PageKey) => void
  currentUser: AppUser
  onLogout: () => void
  visiblePages: PageKey[]
}

const navItems: Array<{ key: PageKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'sales', label: 'Sales', icon: WalletCards },
  { key: 'orders', label: 'Orders', icon: ListOrdered },
  { key: 'costs', label: 'Costs', icon: Receipt },
  { key: 'menu', label: 'Food menu', icon: UtensilsCrossed },
  { key: 'history', label: 'Edit history', icon: FileClock },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'users', label: 'Users and permissions', icon: Users },
  { key: 'settings', label: 'Settings', icon: Settings },
]

const roleLabel: Record<Role, string> = { reception: 'Reception', manager: 'Manager', admin: 'Admin', superadmin: 'Superadmin' }

export function AppShell({ children, activePage, onPageChange, currentUser, onLogout, visiblePages }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.localStorage.getItem('food-pavilion-sidebar-collapsed') === 'true')

  useEffect(() => {
    window.localStorage.setItem('food-pavilion-sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  const navigate = (page: PageKey) => {
    onPageChange(page)
    setMobileOpen(false)
  }
  const renderNav = (allowCollapse: boolean) => (
    <>
      <div className="brand-block">
        <div className="brand-row">
          <img className="brand-logo" src="/food-pavilion-logo.png" alt="Food Pavilion" />
          <span className="brand-mark" aria-hidden="true">FP</span>
          {allowCollapse && <button type="button" className="sidebar-collapse-button icon-button" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}>{sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button>}
        </div>
        <p>Sales, cost and menu manager</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.filter((item) => visiblePages.includes(item.key)).map((item) => {
          const Icon = item.icon
          return <button type="button" key={item.key} className={activePage === item.key ? 'active' : ''} onClick={() => navigate(item.key)} title={sidebarCollapsed && allowCollapse ? item.label : undefined}><Icon size={19} /><span>{item.label}</span></button>
        })}
      </nav>
      <div className="sidebar-footer"><span className="secure-note"><ClipboardList size={16} /> Every financial change is recorded</span></div>
    </>
  )
  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar desktop-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>{renderNav(true)}</aside>
      {mobileOpen && <div className="mobile-drawer-backdrop" onMouseDown={() => setMobileOpen(false)}><aside className="sidebar mobile-drawer" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="drawer-close icon-button" onClick={() => setMobileOpen(false)}><X size={20} /></button>{renderNav(false)}</aside></div>}
      <div className="main-column">
        <header className="topbar">
          <button type="button" className="mobile-menu icon-button" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="topbar-spacer" />
          <div className="signed-user"><div className="avatar">{currentUser.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="user-copy"><strong>{currentUser.name}</strong><span>{roleLabel[currentUser.role]}</span></div><button className="icon-button logout-button" type="button" onClick={onLogout} aria-label="Sign out" title="Sign out"><LogOut size={18} /></button></div>
        </header>
        <main className={`main-content ${activePage === 'sales' || activePage === 'orders' ? 'sales-main-content' : ''}`}>{children}</main>
      </div>
      <div className="mobile-bottom-nav">
        {navItems.filter((item) => visiblePages.includes(item.key)).slice(0, 4).map((item) => { const Icon = item.icon; return <button type="button" key={item.key} className={activePage === item.key ? 'active' : ''} onClick={() => navigate(item.key)}><Icon size={19} /><span>{item.label === 'Food menu' ? 'Menu' : item.label}</span></button> })}
        <button type="button" onClick={() => setMobileOpen(true)}><SlidersHorizontal size={19} /><span>More</span></button>
      </div>
    </div>
  )
}
