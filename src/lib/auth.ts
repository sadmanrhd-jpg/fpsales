import type { AppUser } from '../types'
import { supabase } from './supabase'

/**
 * Compatibility wrapper retained so older repository copies do not fail the
 * TypeScript build. Authentication is handled by Supabase Auth.
 */
export async function verifyPassword(user: AppUser, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })
  return !error
}

/**
 * Password credentials are managed by Supabase Auth and must not be generated
 * or stored in the browser.
 */
export async function createPasswordCredential(_password: string): Promise<never> {
  throw new Error('Password credentials are managed by Supabase Auth.')
}

/**
 * Password hashes are not available to the browser when Supabase Auth is used.
 */
export async function derivePasswordHash(_password: string, _salt: string): Promise<never> {
  throw new Error('Password hashes are managed by Supabase Auth.')
}

/**
 * Deletion PIN credentials are managed through the secure server API.
 */
export async function createDeletionPinCredential(_pin: string): Promise<never> {
  throw new Error('Deletion PIN credentials are managed by the secure server API.')
}

/**
 * Deletion PIN verification is handled by the secure server API.
 */
export async function verifyDeletionPin(_user: AppUser, _pin: string): Promise<boolean> {
  return false
}
