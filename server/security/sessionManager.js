/**
 * Session Management Module - ISO 27001 A.9.4
 * Secure session handling and management
 */

import { generateSecureToken, secureCompare } from './crypto.js'

// ─────────────────────────────────────────────────────────────────────────────
// Session Configuration (A.9.4.2 - Secure log-on procedures)
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_CONFIG = {
  // Session timeout in milliseconds (30 minutes)
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_MS, 10) || 30 * 60 * 1000,
  // Absolute session timeout (8 hours)
  absoluteTimeout: parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT_MS, 10) || 8 * 60 * 60 * 1000,
  // Token length
  tokenLength: 64,
  // Maximum concurrent sessions per user
  maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS, 10) || 5,
  // Enable session binding to IP
  bindToIp: process.env.SESSION_BIND_IP === 'true',
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory session store (for production, use Redis or similar)
// ─────────────────────────────────────────────────────────────────────────────

const sessions = new Map()

// ─────────────────────────────────────────────────────────────────────────────
// Session Schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Session
 * @property {string} id - Session ID
 * @property {string} token - Session token (hashed)
 * @property {string} orgId - Organization ID
 * @property {string} userId - User ID
 * @property {string[]} roles - User roles
 * @property {string} clientIp - Client IP address
 * @property {string} userAgent - User agent string
 * @property {string} createdAt - Creation timestamp
 * @property {string} lastAccessedAt - Last access timestamp
 * @property {string} expiresAt - Expiration timestamp
 * @property {boolean} active - Whether session is active
 */

// ─────────────────────────────────────────────────────────────────────────────
// Session Management Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new session (A.9.4.2)
 * @param {object} identity - User identity
 * @param {object} context - Request context
 * @returns {{ session: Session, token: string }}
 */
export function createSession(identity, context = {}) {
  const { orgId, userId, roles = [] } = identity
  const { clientIp, userAgent } = context

  // Check for maximum concurrent sessions
  const userSessions = getUserSessions(orgId, userId)
  if (userSessions.length >= SESSION_CONFIG.maxConcurrentSessions) {
    // Invalidate oldest session
    const oldest = userSessions.sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    )[0]
    invalidateSession(oldest.id)
  }

  const now = new Date()
  const sessionId = generateSecureToken(32)
  const sessionToken = generateSecureToken(SESSION_CONFIG.tokenLength)

  const session = {
    id: sessionId,
    tokenHash: sessionToken, // In production, hash this
    orgId,
    userId,
    roles,
    clientIp,
    userAgent,
    createdAt: now.toISOString(),
    lastAccessedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_CONFIG.sessionTimeout).toISOString(),
    absoluteExpiresAt: new Date(now.getTime() + SESSION_CONFIG.absoluteTimeout).toISOString(),
    active: true,
  }

  sessions.set(sessionId, session)

  return {
    session: { ...session, tokenHash: undefined },
    token: `${sessionId}.${sessionToken}`,
  }
}

/**
 * Validate session token (A.9.4.3)
 * @param {string} sessionToken - Full session token (id.token)
 * @param {object} context - Request context
 * @returns {{ valid: boolean, session?: Session, error?: string }}
 */
export function validateSession(sessionToken, context = {}) {
  if (!sessionToken || typeof sessionToken !== 'string') {
    return { valid: false, error: 'No session token provided' }
  }

  const parts = sessionToken.split('.')
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid session token format' }
  }

  const [sessionId, token] = parts
  const session = sessions.get(sessionId)

  if (!session) {
    return { valid: false, error: 'Session not found' }
  }

  if (!session.active) {
    return { valid: false, error: 'Session has been invalidated' }
  }

  // Verify token
  if (!secureCompare(token, session.tokenHash)) {
    return { valid: false, error: 'Invalid session token' }
  }

  const now = new Date()

  // Check expiration
  if (new Date(session.expiresAt) < now) {
    invalidateSession(sessionId)
    return { valid: false, error: 'Session expired' }
  }

  // Check absolute expiration
  if (new Date(session.absoluteExpiresAt) < now) {
    invalidateSession(sessionId)
    return { valid: false, error: 'Session absolute timeout exceeded' }
  }

  // Check IP binding if enabled
  if (SESSION_CONFIG.bindToIp && context.clientIp) {
    if (session.clientIp !== context.clientIp) {
      invalidateSession(sessionId)
      return { valid: false, error: 'Session IP mismatch - possible hijacking attempt' }
    }
  }

  // Update last accessed time
  session.lastAccessedAt = now.toISOString()
  session.expiresAt = new Date(now.getTime() + SESSION_CONFIG.sessionTimeout).toISOString()
  sessions.set(sessionId, session)

  return { 
    valid: true, 
    session: { ...session, tokenHash: undefined },
  }
}

/**
 * Invalidate a session (A.9.4.3)
 * @param {string} sessionId - Session ID
 */
export function invalidateSession(sessionId) {
  const session = sessions.get(sessionId)
  if (session) {
    session.active = false
    sessions.set(sessionId, session)
  }
}

/**
 * Invalidate all sessions for a user (A.9.4.3)
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 */
export function invalidateUserSessions(orgId, userId) {
  for (const [id, session] of sessions.entries()) {
    if (session.orgId === orgId && session.userId === userId) {
      session.active = false
      sessions.set(id, session)
    }
  }
}

/**
 * Get all sessions for a user
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 * @returns {Session[]}
 */
export function getUserSessions(orgId, userId) {
  const result = []
  for (const session of sessions.values()) {
    if (session.orgId === orgId && session.userId === userId && session.active) {
      result.push({ ...session, tokenHash: undefined })
    }
  }
  return result
}

/**
 * Refresh session token (A.9.4.3)
 * @param {string} sessionToken - Current session token
 * @param {object} context - Request context
 * @returns {{ success: boolean, newToken?: string, error?: string }}
 */
export function refreshSession(sessionToken, context = {}) {
  const validation = validateSession(sessionToken, context)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const session = sessions.get(validation.session.id)
  if (!session) {
    return { success: false, error: 'Session not found' }
  }

  // Generate new token
  const newToken = generateSecureToken(SESSION_CONFIG.tokenLength)
  session.tokenHash = newToken
  session.lastAccessedAt = new Date().toISOString()
  sessions.set(session.id, session)

  return {
    success: true,
    newToken: `${session.id}.${newToken}`,
  }
}

/**
 * Cleanup expired sessions (A.9.4.3)
 */
export function cleanupExpiredSessions() {
  const now = new Date()
  let cleaned = 0

  for (const [id, session] of sessions.entries()) {
    if (
      !session.active ||
      new Date(session.expiresAt) < now ||
      new Date(session.absoluteExpiresAt) < now
    ) {
      sessions.delete(id)
      cleaned++
    }
  }

  return { cleaned }
}

/**
 * Get session statistics
 * @returns {object}
 */
export function getSessionStats() {
  let active = 0
  let expired = 0
  const now = new Date()

  for (const session of sessions.values()) {
    if (session.active && new Date(session.expiresAt) > now) {
      active++
    } else {
      expired++
    }
  }

  return {
    total: sessions.size,
    active,
    expired,
    config: {
      sessionTimeoutMs: SESSION_CONFIG.sessionTimeout,
      absoluteTimeoutMs: SESSION_CONFIG.absoluteTimeout,
      maxConcurrentSessions: SESSION_CONFIG.maxConcurrentSessions,
      bindToIp: SESSION_CONFIG.bindToIp,
    },
  }
}

// Periodic cleanup (every 5 minutes)
setInterval(() => {
  cleanupExpiredSessions()
}, 5 * 60 * 1000)
