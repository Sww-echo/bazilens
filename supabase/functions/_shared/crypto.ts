// AES-256-GCM PII encryption with key versioning.
// Used by reading/charts/report-generate Edge Functions to encrypt birth_time,
// birth_place, and reading.question. See ../../../.trellis/spec/guides/privacy-pii.md.
//
// Storage format: `v{version}:{base64(iv|ciphertext|authtag)}`.
// Web Crypto's AES-GCM appends the 16-byte auth tag after the ciphertext, so
// we don't need to manage it separately.

const KEY_VERSION = parseInt(Deno.env.get('PII_KEY_VERSION') ?? '1', 10)

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function encodeBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

async function importKeyFromEnv(envName: string): Promise<CryptoKey> {
  const raw = Deno.env.get(envName)
  if (!raw) throw new Error(`missing_env:${envName}`)
  const keyBytes = decodeBase64(raw)
  if (keyBytes.length !== 32) {
    throw new Error(`pii_key_must_be_32_bytes:${envName} got ${keyBytes.length}`)
  }
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

const keyCache = new Map<number, Promise<CryptoKey>>()

function getKeyForVersion(version: number): Promise<CryptoKey> {
  let cached = keyCache.get(version)
  if (cached) return cached

  const envName =
    version === KEY_VERSION ? 'PII_ENCRYPTION_KEY' : `PII_ENCRYPTION_KEY_V${version}`
  cached = importKeyFromEnv(envName)
  keyCache.set(version, cached)
  return cached
}

/**
 * Encrypt plaintext with the current key version. Returns
 * `v{version}:base64(iv|ciphertext|authtag)`. Output is opaque to the
 * application — no inspection / parsing inside business code.
 */
export async function encryptPII(plain: string): Promise<string> {
  const key = await getKeyForVersion(KEY_VERSION)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(plain)
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data),
  )
  const combined = new Uint8Array(iv.length + ct.length)
  combined.set(iv, 0)
  combined.set(ct, iv.length)
  return `v${KEY_VERSION}:${encodeBase64(combined)}`
}

/**
 * Decrypt ciphertext produced by encryptPII. Throws on tampering or unknown
 * key version. Callers should never display the raw error to clients.
 */
export async function decryptPII(payload: string): Promise<string> {
  const m = payload.match(/^v(\d+):(.+)$/)
  if (!m) throw new Error('invalid_pii_format')
  const version = parseInt(m[1], 10)
  const key = await getKeyForVersion(version)
  const buf = decodeBase64(m[2])
  if (buf.length < 13) throw new Error('invalid_pii_format')
  const iv = buf.slice(0, 12)
  const ct = buf.slice(12)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(plain)
}

/**
 * Helper for nullable fields. Encrypts only when value is non-empty string.
 */
export async function encryptPIIOrNull(plain: string | null | undefined): Promise<string | null> {
  if (plain == null || plain === '') return null
  return await encryptPII(plain)
}

export async function decryptPIIOrNull(payload: string | null | undefined): Promise<string | null> {
  if (!payload) return null
  return await decryptPII(payload)
}
