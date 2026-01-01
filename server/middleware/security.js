/**
 * Security middleware utilities
 * Aligned with ISO 27001 controls
 * 
 * This module provides core security middleware functions.
 * For comprehensive security features, see ../security/index.js
 */

import { logSecurityEvent } from '../security/auditLogger.js'

/**
 * In-memory rate limiter (A.12.1 - Operational procedures)
 * Note: For production, use Redis or similar distributed store
 */
const rateLimitStore = new Map()

const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const DEFAULT_RATE_LIMIT = parseInt(process.env.RATE_LIMIT_RPM, 10) || 100

export function checkRateLimit(clientId, limit = DEFAULT_RATE_LIMIT) {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS

  // Clean old entries
  const entry = rateLimitStore.get(clientId) || { requests: [], blocked: false }
  entry.requests = entry.requests.filter((ts) => ts > windowStart)

  if (entry.requests.length >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.min(...entry.requests) + RATE_LIMIT_WINDOW_MS,
    }
  }

  entry.requests.push(now)
  rateLimitStore.set(clientId, entry)

  return {
    allowed: true,
    remaining: limit - entry.requests.length,
    resetAt: now + RATE_LIMIT_WINDOW_MS,
  }
}

/**
 * Extract client identifier for rate limiting (A.12.4 - Logging)
 */
export function getClientId(event) {
  const headers = event.headers || {}
  // Prefer forwarded IP for proxied requests
  const ip =
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['x-real-ip'] ||
    headers['client-ip'] ||
    'unknown'
  return ip
}

/**
 * Sanitize string input (A.14.2.5 - Secure system engineering)
 * Removes potential injection characters
 */
export function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') return ''
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/\x00/g, '') // Remove null bytes
    .trim()
}

/**
 * Validate API key format (A.9.4 - System and application access control)
 */
export function isValidApiKeyFormat(key) {
  if (!key || typeof key !== 'string') return false
  // Minimum 16 characters, alphanumeric with hyphens/underscores
  return key.length >= 16 && /^[a-zA-Z0-9_-]+$/.test(key)
}

/**
 * Mask sensitive data for logging (A.12.4 - Logging and monitoring)
 */
export function maskSensitiveData(data) {
  if (!data) return data
  const masked = { ...data }

  const sensitiveKeys = ['apiKey', 'api_key', 'password', 'secret', 'token', 'authorization']

  for (const key of Object.keys(masked)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      masked[key] = '***MASKED***'
    }
  }

  return masked
}

/**
 * Generate security audit entry (A.12.4 - Logging and monitoring)
 */
export function createSecurityAuditEntry(event, action, details = {}) {
  return {
    ts: new Date().toISOString(),
    action,
    clientId: getClientId(event),
    path: event.path || '',
    method: event.httpMethod || '',
    orgId: event.headers?.['x-org-id'] || null,
    ...maskSensitiveData(details),
  }
}

/**
 * Validate Content-Type header (A.14.2.5 - Secure system engineering)
 */
export function validateContentType(event, expected = 'application/json') {
  const contentType = event.headers?.['content-type'] || ''
  return contentType.toLowerCase().includes(expected.toLowerCase())
}

/**
 * Check for common attack patterns (A.12.2 - Protection from malware)
 */
export function detectSuspiciousPayload(body) {
  if (!body || typeof body !== 'string') return { suspicious: false }

  const patterns = [
    { name: 'sql_injection', regex: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b.*=)/i },
    { name: 'script_injection', regex: /<script[\s\S]*?>[\s\S]*?<\/script>/i },
    { name: 'path_traversal', regex: /\.\.[\/\\]/g },
    { name: 'null_byte', regex: /\x00/g },
  ]

  for (const pattern of patterns) {
    if (pattern.regex.test(body)) {
      return { suspicious: true, pattern: pattern.name }
    }
  }

  return { suspicious: false }
}

/**
 * Generate secure random ID (A.10.1 - Cryptographic controls)
 */
export function generateSecureId(length = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const array = new Uint8Array(length)
  
  // Use crypto if available, fallback to Math.random
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length]
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
  }
  
  return result
}

/**
 * Log rate limit violation (A.12.4)
 */
export async function logRateLimitViolation(clientId, context = {}) {
  try {
    await logSecurityEvent('rate_limit', {
      clientId,
      message: 'Rate limit exceeded',
    }, context)
  } catch (err) {
    console.error('[Security] Failed to log rate limit violation:', err)
  }
}

/**
 * Log suspicious activity (A.12.4)
 */
export async function logSuspiciousActivity(type, details, context = {}) {
  try {
    await logSecurityEvent('suspicious', {
      type,
      ...details,
    }, context)
  } catch (err) {
    console.error('[Security] Failed to log suspicious activity:', err)
  }
}

/**
 * Security response headers (A.13.1 - Network security)
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(headers = {}) {
  return { ...SECURITY_HEADERS, ...headers }
}
