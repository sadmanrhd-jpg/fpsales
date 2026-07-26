import type { AppUser } from '../types'

const ITERATIONS = 210000
const HASH_BYTES = 32

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')

export async function derivePasswordHash(password: string, salt: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(salt),
      iterations: ITERATIONS,
    },
    keyMaterial,
    HASH_BYTES * 8,
  )
  return bytesToBase64(new Uint8Array(bits))
}

export async function createPasswordCredential(password: string): Promise<{ passwordSalt: string; passwordHash: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(18))
  const passwordSalt = bytesToHex(saltBytes)
  const passwordHash = await derivePasswordHash(password, passwordSalt)
  return { passwordSalt, passwordHash }
}

export async function verifyPassword(user: AppUser, password: string): Promise<boolean> {
  const candidate = await derivePasswordHash(password, user.passwordSalt)
  return candidate === user.passwordHash
}
