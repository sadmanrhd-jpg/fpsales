export type Role = 'reception' | 'manager' | 'admin'
export type PageKey = 'dashboard' | 'sales' | 'costs' | 'history' | 'reports' | 'users' | 'settings'
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

export interface AppUser {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
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

export type PermissionKey =
  | 'dashboard.today'
  | 'dashboard.history'
  | 'sales.create'
  | 'costs.create'
  | 'entries.last24h'
  | 'entries.all'
  | 'entries.editLimited'
  | 'entries.editUnlimited'
  | 'audit.view'
  | 'reports.view'
  | 'reports.export'
  | 'users.manage'
  | 'settings.manage'

export type RolePermissions = Record<Role, Record<PermissionKey, boolean>>

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
  rolePermissions: RolePermissions
  settings: AppSettings
}
