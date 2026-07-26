import { allPermissions, defaultState, emptyPermissions } from '../data/defaults'
import type { AppState, AppUser } from '../types'

const STORAGE_KEY = 'food-pavilion-sales-manager-v2'
const SESSION_KEY = 'food-pavilion-session-v2'

const normalizeUser = (user: AppUser): AppUser => ({
  ...user,
  email: user.email.trim().toLowerCase(),
  permissions: user.role === 'superadmin'
    ? allPermissions()
    : { ...emptyPermissions(), ...(user.permissions ?? {}) },
})

export function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return structuredClone(defaultState)
    const parsed = JSON.parse(stored) as Partial<AppState>
    const users = Array.isArray(parsed.users) && parsed.users.length
      ? parsed.users.map(normalizeUser)
      : structuredClone(defaultState.users)
    return {
      users,
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      costs: Array.isArray(parsed.costs) ? parsed.costs : [],
      auditRecords: Array.isArray(parsed.auditRecords) ? parsed.auditRecords : [],
      menuCategories: Array.isArray(parsed.menuCategories) ? parsed.menuCategories : [],
      menuItems: Array.isArray(parsed.menuItems) ? parsed.menuItems : [],
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
