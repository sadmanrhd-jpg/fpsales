import type { AppState, PermissionKey, RolePermissions } from '../types'

const now = new Date()
const isoAt = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString()

export const permissionLabels: Record<PermissionKey, string> = {
  'dashboard.today': 'View today dashboard',
  'dashboard.history': 'View daily, weekly and monthly dashboard',
  'sales.create': 'Add sales entries',
  'costs.create': 'Add cost entries',
  'entries.last24h': 'View entries from the last 24 hours',
  'entries.all': 'View all entries',
  'entries.editLimited': 'Edit entries up to two times',
  'entries.editUnlimited': 'Correct records without the Reception limit',
  'audit.view': 'View edit history',
  'reports.view': 'View reports',
  'reports.export': 'Export records and PDF reports',
  'users.manage': 'Manage users and roles',
  'settings.manage': 'Manage application settings',
}

export const defaultRolePermissions: RolePermissions = {
  reception: {
    'dashboard.today': true,
    'dashboard.history': false,
    'sales.create': true,
    'costs.create': true,
    'entries.last24h': true,
    'entries.all': false,
    'entries.editLimited': true,
    'entries.editUnlimited': false,
    'audit.view': false,
    'reports.view': false,
    'reports.export': false,
    'users.manage': false,
    'settings.manage': false,
  },
  manager: {
    'dashboard.today': true,
    'dashboard.history': true,
    'sales.create': true,
    'costs.create': true,
    'entries.last24h': true,
    'entries.all': true,
    'entries.editLimited': false,
    'entries.editUnlimited': true,
    'audit.view': true,
    'reports.view': true,
    'reports.export': false,
    'users.manage': false,
    'settings.manage': false,
  },
  admin: {
    'dashboard.today': true,
    'dashboard.history': true,
    'sales.create': true,
    'costs.create': true,
    'entries.last24h': true,
    'entries.all': true,
    'entries.editLimited': false,
    'entries.editUnlimited': true,
    'audit.view': true,
    'reports.view': true,
    'reports.export': true,
    'users.manage': true,
    'settings.manage': true,
  },
}

export const defaultState: AppState = {
  users: [
    { id: 'user-reception', name: 'Nadia Rahman', email: 'reception@foodpavilion.test', role: 'reception', active: true },
    { id: 'user-manager', name: 'Arif Hossain', email: 'manager@foodpavilion.test', role: 'manager', active: true },
    { id: 'user-admin', name: 'System Admin', email: 'admin@foodpavilion.test', role: 'admin', active: true },
  ],
  sales: [
    { id: 'sale-1', kind: 'sale', amount: 12850, paymentMethod: 'Cash', note: 'Lunch counter sales', occurredAt: isoAt(1), createdAt: isoAt(1), createdBy: 'user-reception', editCount: 0 },
    { id: 'sale-2', kind: 'sale', amount: 8750, paymentMethod: 'Mobile Banking', note: 'Online and takeaway orders', occurredAt: isoAt(4), createdAt: isoAt(4), createdBy: 'user-reception', editCount: 0 },
    { id: 'sale-3', kind: 'sale', amount: 15200, paymentMethod: 'Card', note: 'Dinner service', occurredAt: isoAt(21), createdAt: isoAt(21), createdBy: 'user-manager', editCount: 1 },
    { id: 'sale-4', kind: 'sale', amount: 22400, paymentMethod: 'Cash', note: 'Previous day sales', occurredAt: isoAt(31), createdAt: isoAt(31), createdBy: 'user-reception', editCount: 0 },
    { id: 'sale-5', kind: 'sale', amount: 31600, paymentMethod: 'Cash', note: 'Weekend service', occurredAt: isoAt(74), createdAt: isoAt(74), createdBy: 'user-manager', editCount: 0 },
  ],
  costs: [
    { id: 'cost-1', kind: 'cost', category: 'Food purchase', amount: 6350, description: 'Fresh produce and meat', occurredAt: isoAt(2), createdAt: isoAt(2), createdBy: 'user-reception', editCount: 0 },
    { id: 'cost-2', kind: 'cost', category: 'Delivery expense', amount: 920, description: 'Delivery rider payments', occurredAt: isoAt(6), createdAt: isoAt(6), createdBy: 'user-reception', editCount: 0 },
    { id: 'cost-3', kind: 'cost', category: 'Maintenance', amount: 1850, description: 'Kitchen exhaust servicing', occurredAt: isoAt(27), createdAt: isoAt(27), createdBy: 'user-manager', editCount: 0 },
    { id: 'cost-4', kind: 'cost', category: 'Staff expense', amount: 2800, description: 'Temporary event staff', occurredAt: isoAt(52), createdAt: isoAt(52), createdBy: 'user-manager', editCount: 0 },
  ],
  auditRecords: [],
  rolePermissions: defaultRolePermissions,
  settings: {
    restaurantName: 'Food Pavilion',
    branchName: 'Main Branch',
    currencyCode: 'BDT',
    timezone: 'Asia/Dhaka',
    address: 'Bangladesh',
  },
}
