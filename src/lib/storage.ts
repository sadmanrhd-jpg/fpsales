import { allPermissions, defaultState, emptyPermissions, sampleMenuCategories, sampleMenuItems } from '../data/defaults'
import type { AppState, AppUser, OngoingOrder } from '../types'

const STORAGE_KEY = 'food-pavilion-sales-manager-v2'
const SESSION_KEY = 'food-pavilion-session-v2'

const normalizeUser = (user: AppUser): AppUser => ({
  ...user,
  email: user.email.trim().toLowerCase(),
  permissions: user.role === 'superadmin'
    ? allPermissions()
    : { ...emptyPermissions(), ...(user.permissions ?? {}) },
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
  return localStorage.getItem(SESSION_KEY)
}

export function saveSessionUserId(userId: string): void {
  localStorage.setItem(SESSION_KEY, userId)
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
