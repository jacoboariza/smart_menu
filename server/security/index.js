/**
 * Security Module - ISO 27001 Compliance
 * Central export for all security utilities
 */

// A.10 - Cryptography
export {
  hashSHA256,
  hashSHA512,
  getRandomBytes,
  generateSecureToken,
  generateUUID,
  secureCompare,
  deriveKey,
  encryptAES,
  decryptAES,
  hashApiKey,
  verifyApiKey,
} from './crypto.js'

// A.9 - Access Control
export {
  ROLES,
  PERMISSIONS,
  IdentitySchema,
  getPermissionsForRoles,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  parseIdentityFromHeaders,
  createAccessDecision,
  enforcePermission,
  isResourceOwner,
  canAccessClassification,
} from './accessControl.js'

// A.12.4 - Logging and Monitoring
export {
  AUDIT_ACTIONS,
  SEVERITY,
  SecurityAuditEventSchema,
  auditLogger,
  logAuth,
  logAccess,
  logDataOperation,
  logSecurityEvent,
  logSystemEvent,
} from './auditLogger.js'

// A.14.2.5 - Input Validation
export {
  ValidationSchemas,
  checkDangerousPatterns,
  checkObjectForDangerousPatterns,
  sanitizeString,
  sanitizeObject,
  validateRequestBody,
  validateQueryParams,
  validateHeaders,
  validateFileUpload,
  isValidUUID,
  isValidEmail,
  isValidISODate,
  isValidApiKey,
  isValidOrgId,
  isValidSpaceName,
} from './inputValidation.js'

// A.9.4 - Session Management
export {
  createSession,
  validateSession,
  invalidateSession,
  invalidateUserSessions,
  getUserSessions,
  refreshSession,
  cleanupExpiredSessions,
  getSessionStats,
} from './sessionManager.js'

// ─────────────────────────────────────────────────────────────────────────────
// Security Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const SECURITY_CONFIG = {
  // API Security
  apiKeyMinLength: 32,
  apiKeyRotationDays: 90,
  
  // Rate Limiting
  rateLimitRpm: parseInt(process.env.RATE_LIMIT_RPM, 10) || 100,
  rateLimitBurstSize: parseInt(process.env.RATE_LIMIT_BURST, 10) || 20,
  
  // Session Security
  sessionTimeoutMs: parseInt(process.env.SESSION_TIMEOUT_MS, 10) || 30 * 60 * 1000,
  sessionAbsoluteTimeoutMs: parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT_MS, 10) || 8 * 60 * 60 * 1000,
  maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS, 10) || 5,
  
  // Input Validation
  maxRequestBodySize: parseInt(process.env.MAX_REQUEST_BODY_SIZE, 10) || 1024 * 1024, // 1MB
  maxStringLength: parseInt(process.env.MAX_STRING_LENGTH, 10) || 10000,
  
  // Audit
  auditEnabled: process.env.AUDIT_ENABLED !== 'false',
  auditRetentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS, 10) || 365,
  
  // Security Headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Middleware Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create security context from request
 * @param {object} event - Request event
 * @param {object} context - Request context
 * @returns {object} Security context
 */
export function createSecurityContext(event, context = {}) {
  const headers = event.headers || {}
  
  return {
    clientIp: headers['x-forwarded-for']?.split(',')[0]?.trim() || 
              headers['x-real-ip'] || 
              'unknown',
    userAgent: headers['user-agent'] || 'unknown',
    requestId: context.awsRequestId || context.requestId || generateUUID(),
    timestamp: new Date().toISOString(),
    path: event.path || '',
    method: event.httpMethod || '',
  }
}

/**
 * Validate API key authentication
 * @param {object} event - Request event
 * @returns {{ authenticated: boolean, error?: string }}
 */
export function validateApiKeyAuth(event) {
  const headers = event.headers || {}
  const providedKey = headers['x-api-key'] || headers['X-Api-Key']
  const configuredKey = process.env.API_KEY || process.env.INGEST_API_KEY

  if (!configuredKey) {
    return { authenticated: false, error: 'API key not configured on server' }
  }

  if (!providedKey) {
    return { authenticated: false, error: 'API key not provided' }
  }

  if (!secureCompare(providedKey, configuredKey)) {
    return { authenticated: false, error: 'Invalid API key' }
  }

  return { authenticated: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// ISO 27001 Compliance Checklist
// ─────────────────────────────────────────────────────────────────────────────

export const ISO27001_CONTROLS = {
  'A.9.1': { name: 'Business requirements of access control', implemented: true },
  'A.9.2': { name: 'User access management', implemented: true },
  'A.9.3': { name: 'User responsibilities', implemented: true },
  'A.9.4': { name: 'System and application access control', implemented: true },
  'A.10.1': { name: 'Cryptographic controls', implemented: true },
  'A.12.1': { name: 'Operational procedures', implemented: true },
  'A.12.2': { name: 'Protection from malware', implemented: true },
  'A.12.4': { name: 'Logging and monitoring', implemented: true },
  'A.13.1': { name: 'Network security management', implemented: true },
  'A.13.2': { name: 'Information transfer', implemented: true },
  'A.14.1': { name: 'Security requirements', implemented: true },
  'A.14.2': { name: 'Security in development', implemented: true },
}
