import { allPermissions, defaultState, emptyPermissions, permissionKeys, sampleMenuCategories, sampleMenuItems } from '../data/defaults'
import type { AppState, AppUser, OngoingOrder, PermissionKey, UserPermissions } from '../types'

const STORAGE_KEY = 'food-pavilion-sales-manager-v2'
const PERSISTENT_SESSION_KEY = 'food-pavilion-session-v2'
const TEMPORARY_SESSION_KEY = 'food-pavilion-session-temporary-v2'

type StoredPermissions = Partial<UserPermissions> & Record<string, boolean | undefined>

const migratePermissions = (storedPermissions: StoredPermissions | undefined): UserPermissions => {
  const source = storedPermissions ?? {}
  const permissions = emptyPermissions()

  permissionKeys.forEach((key) => {
    if (typeof source[key] === 'boolean') permissions[key] = Boolean(source[key])
  })

  const hasGranularPermissions = [
    'dashboard.export',
    'sales.view24h',
    'sales.printKot',
    'orders.view',
    'costs.view24h',
    'costs.edit',
    'menu.categories.create',
  ].some((key) => Object.prototype.hasOwnProperty.call(source, key))

  if (!hasGranularPermissions) {
    const grant = (keys: PermissionKey[]) => keys.forEach((key) => { permissions[key] = true })

    if (source['entries.last24h']) grant(['sales.view24h', 'costs.view24h'])
    if (source['entries.all']) grant(['sales.viewAll', 'costs.viewAll'])
    if (source['entries.editLimited'] || source['entries.editUnlimited']) grant(['sales.edit', 'costs.edit'])
    if (source['sales.create']) grant(['sales.create', 'sales.printKot', 'sales.printBill', 'orders.view', 'orders.edit'])
    if (source['costs.create']) grant(['costs.create'])
    if (source['reports.export']) grant(['dashboard.export'])
    if (source['menu.manage']) grant([
      'menu.categories.create',
      'menu.categories.remove',
      'menu.items.create',
      'menu.items.edit',
      'menu.items.availability',
      'menu.items.remove',
    ])
  }

  return permissions
}

const normalizeUser = (user: AppUser): AppUser => ({
  ...user,
  email: user.email.trim().toLowerCase(),
  permissions: user.role === 'superadmin'
    ? allPermissions()
    : migratePermissions(user.permissions as StoredPermissions),
})

const normalizeOrders = (orders: unknown): OngoingOrder[] => Array.isArray(orders)
  ? orders.filter((order): order is OngoingOrder => Boolean(order && typeof order === 'object'))
  : []

export function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return structuredClone(defaultState)
    const parsed = JSON.parse(stored) as Partial<AppState>
    const users = Array.isArray(parsed.users) && parsed.users.length
      ? parsed.users.map(normalizeUser)
      : structuredClone(defaultState.users)
    const storedMenuCategories = Array.isArray(parsed.menuCategories) ? parsed.menuCategories : []
    const storedMenuItems = Array.isArray(parsed.menuItems) ? parsed.menuItems : []
    const shouldSeedSampleMenu = storedMenuCategories.length === 0 && storedMenuItems.length === 0
    const orders = normalizeOrders(parsed.orders)
    const largestOrderNumber = orders.reduce((largest, order) => Math.max(largest, Number(order.orderNumber) || 0), 0)
    const parsedNextOrderNumber = Number(parsed.nextOrderNumber)
    const nextOrderNumber = Number.isInteger(parsedNextOrderNumber) && parsedNextOrderNumber > largestOrderNumber
      ? parsedNextOrderNumber
      : largestOrderNumber + 1

    return {
      users,
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      costs: Array.isArray(parsed.costs) ? parsed.costs : [],
      auditRecords: Array.isArray(parsed.auditRecords) ? parsed.auditRecords : [],
      menuCategories: shouldSeedSampleMenu ? structuredClone(sampleMenuCategories) : storedMenuCategories,
      menuItems: shouldSeedSampleMenu ? structuredClone(sampleMenuItems) : storedMenuItems,
      orders,
      nextOrderNumber: Math.max(1, nextOrderNumber),
      settings: { ...defaultState.settings, ...(parsed.settings ?? {}) },
    }
  } catch {
    return structuredClone(defaultState)
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function loadSessionUserId(): string | null {
  return sessionStorage.getItem(TEMPORARY_SESSION_KEY) ?? localStorage.getItem(PERSISTENT_SESSION_KEY)
}

export function saveSessionUserId(userId: string, rememberMe: boolean): void {
  sessionStorage.removeItem(TEMPORARY_SESSION_KEY)
  localStorage.removeItem(PERSISTENT_SESSION_KEY)
  if (rememberMe) localStorage.setItem(PERSISTENT_SESSION_KEY, userId)
  else sessionStorage.setItem(TEMPORARY_SESSION_KEY, userId)
}

export function clearSession(): void {
  sessionStorage.removeItem(TEMPORARY_SESSION_KEY)
  localStorage.removeItem(PERSISTENT_SESSION_KEY)
}
