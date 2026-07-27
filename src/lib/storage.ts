import { defaultState } from '../data/defaults'
import type { AppState } from '../types'

/**
 * Compatibility module retained so older repository copies do not fail the
 * TypeScript build. Core application data is loaded from Supabase.
 */
export function loadState(): AppState {
  return structuredClone(defaultState)
}

/**
 * Core application data is saved to Supabase, not browser storage.
 */
export function saveState(_state: AppState): void {
  // Intentionally empty.
}

/**
 * Supabase manages the authenticated session.
 */
export function loadSessionUserId(): string | null {
  return null
}

/**
 * Supabase manages the authenticated session.
 */
export function saveSessionUserId(_userId: string, _rememberMe: boolean): void {
  // Intentionally empty.
}

/**
 * Supabase manages the authenticated session.
 */
export function clearSession(): void {
  // Intentionally empty.
}
