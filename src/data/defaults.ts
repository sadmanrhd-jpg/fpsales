import type { AppState, PermissionKey, UserPermissions } from '../types'

export const permissionLabels: Record<PermissionKey, string> = {
  'dashboard.today': 'View today dashboard',
  'dashboard.history': 'Use daily, weekly and monthly dashboard filters',
  'sales.create': 'Add sales entries',
  'costs.create': 'Add cost entries',
  'entries.last24h': 'View entries from the last 24 hours',
  'entries.all': 'View all financial entries',
  'entries.editLimited': 'Edit entries up to two times',
  'entries.editUnlimited': 'Correct records without the Reception edit limit',
  'audit.view': 'View edit history',
  'reports.view': 'View reports',
  'reports.export': 'Export CSV and PDF reports',
  'menu.view': 'View the restaurant menu',
  'menu.manage': 'Add and update menu categories and items',
  'settings.manage': 'Manage restaurant settings',
}

export const permissionKeys = Object.keys(permissionLabels) as PermissionKey[]

export const emptyPermissions = (): UserPermissions => Object.fromEntries(
  permissionKeys.map((key) => [key, false]),
) as UserPermissions

export const allPermissions = (): UserPermissions => Object.fromEntries(
  permissionKeys.map((key) => [key, true]),
) as UserPermissions

export const defaultState: AppState = {
  users: [
    {
      id: 'user-superadmin',
      name: 'Super Admin',
      email: 'sadmanrhd@gmail.com',
      role: 'superadmin',
      active: true,
      permissions: allPermissions(),
      passwordSalt: 'fp-superadmin-2026-07-26-a9f3',
      passwordHash: 'sbFAuVEwYODtK/+I+8UksA/i/ukcyQf0MtquxxK7sbI=',
      createdAt: '2026-07-26T00:00:00.000Z',
    },
  ],
  sales: [],
  costs: [],
  auditRecords: [],
  menuCategories: [],
  menuItems: [],
  settings: {
    restaurantName: 'Food Pavilion',
    branchName: 'Main Branch',
    currencyCode: 'BDT',
    timezone: 'Asia/Dhaka',
    address: 'Bangladesh',
  },
}
