import { BarChart3, ChevronDown, ClipboardList, FileClock, LayoutDashboard, Menu, Receipt, Settings, SlidersHorizontal, Users, WalletCards, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { AppUser, PageKey, Role } from '../types'

interface AppShellProps {
  children: ReactNode
  activePage: PageKey
  onPageChange: (page: PageKey) => void
  currentUser: AppUser
  users: AppUser[]
  onUserChange: (userId: string) => void
  visiblePages: PageKey[]
}

const navItems: Array<{ key: PageKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'sales', label: 'Sales', icon: WalletCards },
  { key: 'costs', label: 'Costs', icon: Receipt },
  { key: 'history', label: 'Edit history', icon: FileClock },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'users', label: 'Users and roles', icon: Users },
  { key: 'settings', label: 'Settings', icon: Settings },
]

const roleLabel: Record<Role, string> = { reception: 'Reception', manager: 'Manager', admin: 'Admin' }

export function AppShell({ children, activePage, onPageChange, currentUser, users, onUserChange, visiblePages }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = (page: PageKey) => {
    onPageChange(page)
    setMobileOpen(false)
  }
  const nav = (
    <>
      <div className="brand-block">
        <img src="/food-pavilion-logo.png" alt="Food Pavilion" />
        <p>Sales and cost manager</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.filter((item) => visiblePages.includes(item.key)).map((item) => {
          const Icon = item.icon
          return (
            <button type="button" key={item.key} className={activePage === item.key ? 'active' : ''} onClick={() => navigate(item.key)}>
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="sidebar-footer">
        <span className="secure-note"><ClipboardList size={16} /> Every change is recorded</span>
      </div>
    </>
  )
  return (
    <div className="app-layout">
      <aside className="sidebar desktop-sidebar">{nav}</aside>
      {mobileOpen && (
        <div className="mobile-drawer-backdrop" onMouseDown={() => setMobileOpen(false)}>
          <aside className="sidebar mobile-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="drawer-close icon-button" onClick={() => setMobileOpen(false)}><X size={20} /></button>
            {nav}
          </aside>
        </div>
      )}
      <div className="main-column">
        <header className="topbar">
          <button type="button" className="mobile-menu icon-button" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="topbar-spacer" />
          <div className="demo-user-select">
            <div className="avatar">{currentUser.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
            <div className="user-copy">
              <strong>{currentUser.name}</strong>
              <span>{roleLabel[currentUser.role]}</span>
            </div>
            <select aria-label="Preview as user" value={currentUser.id} onChange={(event) => onUserChange(event.target.value)}>
              {users.filter((user) => user.active).map((user) => <option value={user.id} key={user.id}>{user.name} · {roleLabel[user.role]}</option>)}
            </select>
            <ChevronDown size={15} />
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
      <div className="mobile-bottom-nav">
        {navItems.filter((item) => visiblePages.includes(item.key)).slice(0, 4).map((item) => {
          const Icon = item.icon
          return <button type="button" key={item.key} className={activePage === item.key ? 'active' : ''} onClick={() => navigate(item.key)}><Icon size={19} /><span>{item.label === 'Edit history' ? 'History' : item.label}</span></button>
        })}
        <button type="button" onClick={() => setMobileOpen(true)}><SlidersHorizontal size={19} /><span>More</span></button>
      </div>
    </div>
  )
}
