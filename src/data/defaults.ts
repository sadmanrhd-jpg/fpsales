import type { AppState, MenuCategory, MenuItem, PermissionKey, UserPermissions } from '../types'

export interface PermissionGroup {
  id: string
  label: string
  description: string
  permissions: PermissionKey[]
}

export const permissionLabels: Record<PermissionKey, string> = {
  'dashboard.today': 'View today dashboard',
  'dashboard.history': 'Use daily, weekly and monthly dashboard filters',
  'dashboard.export': 'Download dashboard PDF',
  'sales.view24h': 'View completed sales from the last 24 hours',
  'sales.viewAll': 'View all completed sales',
  'sales.create': 'Create a new sales order',
  'sales.edit': 'Edit a completed sale entry',
  'sales.printKot': 'Print KOT and send an order to the kitchen',
  'sales.printBill': 'Print a bill and record the completed sale',
  'orders.view': 'View ongoing unpaid orders',
  'orders.edit': 'Edit ongoing orders, tables, items and discounts',
  'costs.view24h': 'View cost entries from the last 24 hours',
  'costs.viewAll': 'View all cost entries',
  'costs.create': 'Add Cost',
  'costs.edit': 'Edit Cost',
  'costs.remove': 'Remove Cost',
  'audit.view': 'View edit history',
  'reports.view': 'View financial reports',
  'reports.export': 'Export report CSV and PDF files',
  'menu.view': 'View the food menu management page',
  'menu.categories.create': 'Add menu category',
  'menu.categories.remove': 'Remove menu category',
  'menu.items.create': 'Add menu item',
  'menu.items.edit': 'Edit menu item details and prices',
  'menu.items.availability': 'Change menu item availability',
  'menu.items.remove': 'Remove menu item',
  'settings.manage': 'Manage restaurant settings',
}

export const permissionGroups: PermissionGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Dashboard visibility, period controls and dashboard export.',
    permissions: ['dashboard.today', 'dashboard.history', 'dashboard.export'],
  },
  {
    id: 'sales',
    label: 'Sales and orders',
    description: 'Sales history, point of sale actions, KOT, bills and ongoing orders.',
    permissions: [
      'sales.view24h',
      'sales.viewAll',
      'sales.create',
      'sales.edit',
      'sales.printKot',
      'sales.printBill',
      'orders.view',
      'orders.edit',
    ],
  },
  {
    id: 'costs',
    label: 'Costs',
    description: 'Cost visibility and cost entry controls.',
    permissions: ['costs.view24h', 'costs.viewAll', 'costs.create', 'costs.edit', 'costs.remove'],
  },
  {
    id: 'menu',
    label: 'Food menu',
    description: 'Separate controls for categories, menu items and availability.',
    permissions: [
      'menu.view',
      'menu.categories.create',
      'menu.categories.remove',
      'menu.items.create',
      'menu.items.edit',
      'menu.items.availability',
      'menu.items.remove',
    ],
  },
  {
    id: 'records',
    label: 'History and reports',
    description: 'Audit history, financial reports and report exports.',
    permissions: ['audit.view', 'reports.view', 'reports.export'],
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Restaurant profile and branch settings.',
    permissions: ['settings.manage'],
  },
]

export const permissionKeys = permissionGroups.flatMap((group) => group.permissions)

export const emptyPermissions = (): UserPermissions => Object.fromEntries(
  permissionKeys.map((key) => [key, false]),
) as UserPermissions

export const allPermissions = (): UserPermissions => Object.fromEntries(
  permissionKeys.map((key) => [key, true]),
) as UserPermissions

const sampleCreatedAt = '2026-07-26T00:00:00.000Z'
const sampleCreatedBy = 'user-superadmin'

export const sampleMenuCategories: MenuCategory[] = [
  { id: 'category-burger', name: 'Burger', active: true, createdAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'category-pizza', name: 'Pizza', active: true, createdAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'category-chicken', name: 'Chicken', active: true, createdAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'category-drinks', name: 'Drinks', active: true, createdAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'category-dessert', name: 'Dessert', active: true, createdAt: sampleCreatedAt, createdBy: sampleCreatedBy },
]

export const sampleMenuItems: MenuItem[] = [
  { id: 'menu-burger-1', name: 'Burger 1', categoryId: 'category-burger', description: 'Classic sample burger.', price: 180, available: true, createdAt: sampleCreatedAt, updatedAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'menu-burger-2', name: 'Burger 2', categoryId: 'category-burger', description: 'Cheese sample burger.', price: 220, available: true, createdAt: sampleCreatedAt, updatedAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'menu-burger-3', name: 'Burger 3', categoryId: 'category-burger', description: 'Double sample burger.', price: 280, available: true, createdAt: sampleCreatedAt, updatedAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'menu-pizza-1', name: 'Pizza 1', categoryId: 'category-pizza', description: 'Small sample pizza.', price: 350, available: true, createdAt: sampleCreatedAt, updatedAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'menu-pizza-2', name: 'Pizza 2', categoryId: 'category-pizza', description: 'Medium sample pizza.', price: 520, available: true, createdAt: sampleCreatedAt, updatedAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'menu-pizza-3', name: 'Pizza 3', categoryId: 'category-pizza', description: 'Large sample pizza.', price: 720, available: true, createdAt: sampleCreatedAt, updatedAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'menu-chicken-1', name: 'Chicken 1', categoryId: 'category-chicken', description: 'Two piece sample chicken.', price: 240, available: true, createdAt: sampleCreatedAt, updatedAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'menu-chicken-2', name: 'Chicken 2', categoryId: 'category-chicken', description: 'Four piece sample chicken.', price: 420, available: true, createdAt: sampleCreatedAt, updatedAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'menu-drink-1', name: 'Drink 1', categoryId: 'category-drinks', description: 'Cold sample drink.', price: 60, available: true, createdAt: sampleCreatedAt, updatedAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'menu-drink-2', name: 'Drink 2', categoryId: 'category-drinks', description: 'Fresh sample drink.', price: 100, available: true, createdAt: sampleCreatedAt, updatedAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'menu-dessert-1', name: 'Dessert 1', categoryId: 'category-dessert', description: 'Sweet sample dessert.', price: 140, available: true, createdAt: sampleCreatedAt, updatedAt: sampleCreatedAt, createdBy: sampleCreatedBy },
  { id: 'menu-dessert-2', name: 'Dessert 2', categoryId: 'category-dessert', description: 'Special sample dessert.', price: 180, available: true, createdAt: sampleCreatedAt, updatedAt: sampleCreatedAt, createdBy: sampleCreatedBy },
]

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
  menuCategories: sampleMenuCategories,
  menuItems: sampleMenuItems,
  orders: [],
  nextOrderNumber: 1,
  settings: {
    restaurantName: 'Food Pavilion',
    branchName: 'Main Branch',
    currencyCode: 'BDT',
    timezone: 'Asia/Dhaka',
    address: 'Bangladesh',
  },
}
