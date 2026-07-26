import { defaultState } from '../data/defaults'
import type { AppState } from '../types'

const STORAGE_KEY = 'food-pavilion-sales-manager-v1'

export function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return structuredClone(defaultState)
    const parsed = JSON.parse(stored) as AppState
    return {
      ...structuredClone(defaultState),
      ...parsed,
      rolePermissions: parsed.rolePermissions ?? structuredClone(defaultState.rolePermissions),
      settings: { ...defaultState.settings, ...(parsed.settings ?? {}) },
    }
  } catch {
    return structuredClone(defaultState)
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetState(): AppState {
  const next = structuredClone(defaultState)
  saveState(next)
  return next
}
