/**
 * Cryptographic utilities for ISO 27001 compliance
 * A.10 - Cryptography controls
 */

/**
 * Hash data using SHA-256 (A.10.1 - Cryptographic controls)
 * @param {string} data - Data to hash
 * @returns {Promise<string>} Hex-encoded hash
 */
export async function hashSHA256(data) {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash data using SHA-512 for higher security requirements
 * @param {string} data - Data to hash
 * @returns {Promise<string>} Hex-encoded hash
 */
export async function hashSHA512(data) {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-512', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate cryptographically secure random bytes
 * @param {number} length - Number of bytes
 * @returns {Uint8Array}
 */
export function getRandomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Generate a secure random token (A.10.1)
 * @param {number} length - Token length in characters
 * @returns {string} Hex-encoded token
 */
export function generateSecureToken(length = 32) {
  const bytes = getRandomBytes(Math.ceil(length / 2))
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length)
}

/**
 * Generate a UUID v4 using crypto
 * @returns {string}
 */
export function generateUUID() {
  const bytes = getRandomBytes(16)
  // Set version (4) and variant (RFC4122)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Constant-time string comparison to prevent timing attacks (A.10.1)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean}
 */
export function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false
  }
  
  const encoder = new TextEncoder()
  const aBytes = encoder.encode(a)
  const bBytes = encoder.encode(b)
  
  if (aBytes.length !== bBytes.length) {
    // Compare against self to maintain constant time
    let result = 0
    for (let i = 0; i < aBytes.length; i++) {
      result |= aBytes[i] ^ aBytes[i]
    }
    return false
  }
  
  let result = 0
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i]
  }
  return result === 0
}

/**
 * Derive a key from password using PBKDF2 (A.10.1)
 * @param {string} password - Password to derive from
 * @param {Uint8Array} salt - Salt bytes
 * @param {number} iterations - Number of iterations
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(password, salt, iterations = 100000) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data using AES-GCM (A.10.1)
 * @param {string} plaintext - Data to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<{ciphertext: string, iv: string}>}
 */
export async function encryptAES(plaintext, key) {
  const encoder = new TextEncoder()
  const iv = getRandomBytes(12)
  
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )
  
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
  }
}

/**
 * Decrypt data using AES-GCM (A.10.1)
 * @param {string} ciphertext - Base64 encoded ciphertext
 * @param {string} ivBase64 - Base64 encoded IV
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<string>}
 */
export async function decryptAES(ciphertext, ivBase64, key) {
  const decoder = new TextDecoder()
  const cipherBuffer = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
  
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBuffer
  )
  
  return decoder.decode(plainBuffer)
}

/**
 * Hash API key for secure storage (A.10.1)
 * Never store plain API keys - only their hashes
 * @param {string} apiKey - API key to hash
 * @returns {Promise<string>}
 */
export async function hashApiKey(apiKey) {
  return hashSHA256(apiKey)
}

/**
 * Verify API key against stored hash
 * @param {string} providedKey - Key provided by user
 * @param {string} storedHash - Hash from storage
 * @returns {Promise<boolean>}
 */
export async function verifyApiKey(providedKey, storedHash) {
  const providedHash = await hashSHA256(providedKey)
  return secureCompare(providedHash, storedHash)
}
