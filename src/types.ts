export type Role = 'reception' | 'manager' | 'admin' | 'superadmin'
export type PageKey = 'dashboard' | 'sales' | 'orders' | 'costs' | 'menu' | 'history' | 'reports' | 'users' | 'settings'
export type PeriodFilter = 'daily' | 'weekly' | 'monthly'
export type EntryKind = 'sale' | 'cost'
export type PaymentMethod = 'Cash' | 'Card' | 'Mobile Banking' | 'Other'
export type CostCategory =
  | 'Electricity bill'
  | 'Gas bill'
  | 'Water bill'
  | 'Food purchase'
  | 'Staff expense'
  | 'Maintenance'
  | 'Delivery expense'
  | 'Other expense'

export type PermissionKey =
  | 'dashboard.today'
  | 'dashboard.history'
  | 'dashboard.export'
  | 'sales.view24h'
  | 'sales.viewAll'
  | 'sales.create'
  | 'sales.edit'
  | 'sales.printKot'
  | 'sales.printBill'
  | 'orders.view'
  | 'orders.edit'
  | 'costs.view24h'
  | 'costs.viewAll'
  | 'costs.create'
  | 'costs.edit'
  | 'costs.remove'
  | 'audit.view'
  | 'reports.view'
  | 'reports.export'
  | 'menu.view'
  | 'menu.categories.create'
  | 'menu.categories.remove'
  | 'menu.items.create'
  | 'menu.items.edit'
  | 'menu.items.availability'
  | 'menu.items.remove'
  | 'settings.manage'

export type UserPermissions = Record<PermissionKey, boolean>

export interface AppUser {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  permissions: UserPermissions
  hasDeletionPin: boolean
  createdAt: string
}

export interface SalesEntry {
  id: string
  kind: 'sale'
  amount: number
  paymentMethod: PaymentMethod
  note: string
  occurredAt: string
  createdAt: string
  createdBy: string
  editCount: number
  attachmentName?: string
  attachmentDataUrl?: string
}

export interface CostEntry {
  id: string
  kind: 'cost'
  category: CostCategory
  amount: number
  description: string
  occurredAt: string
  createdAt: string
  createdBy: string
  editCount: number
  attachmentName?: string
  attachmentDataUrl?: string
}

export type FinancialEntry = SalesEntry | CostEntry

export interface AuditRecord {
  id: string
  entryId: string
  entryKind: EntryKind
  originalData: FinancialEntry
  updatedData: FinancialEntry
  reason: string
  editedBy: string
  editedAt: string
  editNumber: number
}

export interface MenuCategory {
  id: string
  name: string
  active: boolean
  createdAt: string
  createdBy: string
}

export interface MenuItem {
  id: string
  name: string
  categoryId: string
  description: string
  price: number
  available: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface OrderLine {
  itemId: string
  name: string
  price: number
  quantity: number
}

export interface OngoingOrder {
  id: string
  orderNumber: number
  tableNumber: string
  lines: OrderLine[]
  discount: number
  paymentMethod: PaymentMethod
  subtotal: number
  total: number
  status: 'KOT sent'
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface AppSettings {
  restaurantName: string
  branchName: string
  currencyCode: string
  timezone: string
  address: string
}

export interface AppState {
  users: AppUser[]
  sales: SalesEntry[]
  costs: CostEntry[]
  auditRecords: AuditRecord[]
  menuCategories: MenuCategory[]
  menuItems: MenuItem[]
  orders: OngoingOrder[]
  nextOrderNumber: number
  settings: AppSettings
}
