import type { AppUser } from '../types'

const ITERATIONS = 210000
const HASH_BYTES = 32

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')

async function deriveSecretHash(secret: string, salt: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
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

async function createSecretCredential(secret: string): Promise<{ salt: string; hash: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(18))
  const salt = bytesToHex(saltBytes)
  const hash = await deriveSecretHash(secret, salt)
  return { salt, hash }
}

export async function derivePasswordHash(password: string, salt: string): Promise<string> {
  return deriveSecretHash(password, salt)
}

export async function createPasswordCredential(password: string): Promise<{ passwordSalt: string; passwordHash: string }> {
  const credential = await createSecretCredential(password)
  return { passwordSalt: credential.salt, passwordHash: credential.hash }
}

export async function verifyPassword(user: AppUser, password: string): Promise<boolean> {
  const candidate = await deriveSecretHash(password, user.passwordSalt)
  return candidate === user.passwordHash
}

export async function createDeletionPinCredential(pin: string): Promise<{ deletionPinSalt: string; deletionPinHash: string }> {
  const credential = await createSecretCredential(pin)
  return { deletionPinSalt: credential.salt, deletionPinHash: credential.hash }
}

export async function verifyDeletionPin(user: AppUser, pin: string): Promise<boolean> {
  if (!user.deletionPinSalt || !user.deletionPinHash) return false
  const candidate = await deriveSecretHash(pin, user.deletionPinSalt)
  return candidate === user.deletionPinHash
}
