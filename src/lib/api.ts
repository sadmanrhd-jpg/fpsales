import { supabase } from './supabase'
import type { AppState } from '../types'

interface ApiResponse<T> {
  data?: T
  error?: string
}

async function authorisedFetch<T>(init?: RequestInit): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Your session has expired. Sign in again.')

  const response = await fetch('/api/app', {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })
  const result = await response.json() as ApiResponse<T>
  if (!response.ok || result.error) throw new Error(result.error || 'The server request failed.')
  if (result.data === undefined) throw new Error('The server returned no data.')
  return result.data
}

export interface BootstrapData {
  state: AppState
  currentUserId: string
}

export function loadAppData() {
  return authorisedFetch<BootstrapData>({ method: 'GET' })
}

export function runAppAction<T = { success: true }>(action: string, payload: unknown = {}) {
  return authorisedFetch<T>({
    method: 'POST',
    body: JSON.stringify({ action, payload }),
  })
}
