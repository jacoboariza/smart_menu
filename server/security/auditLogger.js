/**
 * Audit Logger - ISO 27001 A.12.4
 * Comprehensive audit logging for security events
 */

import { z } from 'zod'
import { append as appendAudit } from '../storage/auditRepo.js'
import { maskSensitiveData } from '../middleware/security.js'

// ─────────────────────────────────────────────────────────────────────────────
// Audit Event Types (A.12.4.1 - Event logging)
// ─────────────────────────────────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  // Authentication events
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  AUTH_LOGIN_FAILURE: 'auth.login.failure',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_TOKEN_REFRESH: 'auth.token.refresh',
  AUTH_API_KEY_USED: 'auth.apikey.used',
  
  // Access control events
  ACCESS_GRANTED: 'access.granted',
  ACCESS_DENIED: 'access.denied',
  ACCESS_PERMISSION_CHECK: 'access.permission.check',
  
  // Data events
  DATA_READ: 'data.read',
  DATA_CREATE: 'data.create',
  DATA_UPDATE: 'data.update',
  DATA_DELETE: 'data.delete',
  DATA_EXPORT: 'data.export',
  DATA_PUBLISH: 'data.publish',
  DATA_CONSUME: 'data.consume',
  
  // System events
  SYSTEM_CONFIG_CHANGE: 'system.config.change',
  SYSTEM_ERROR: 'system.error',
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown',
  
  // Security events
  SECURITY_RATE_LIMIT: 'security.rate_limit',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious',
  SECURITY_INVALID_INPUT: 'security.invalid_input',
  SECURITY_BREACH_ATTEMPT: 'security.breach_attempt',
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Event Schema (A.12.4.1)
// ─────────────────────────────────────────────────────────────────────────────

export const SecurityAuditEventSchema = z.object({
  ts: z.string().datetime(),
  eventId: z.string().uuid(),
  action: z.string().min(1),
  actorOrg: z.string().min(1),
  actorUser: z.string().optional(),
  actorIp: z.string().optional(),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
  outcome: z.enum(['success', 'failure', 'error']),
  reason: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  requestId: z.string().optional(),
  sessionId: z.string().optional(),
  userAgent: z.string().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Severity Levels (A.12.4.1)
// ─────────────────────────────────────────────────────────────────────────────

export const SEVERITY = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
}

const ACTION_SEVERITY = {
  [AUDIT_ACTIONS.AUTH_LOGIN_FAILURE]: SEVERITY.WARNING,
  [AUDIT_ACTIONS.ACCESS_DENIED]: SEVERITY.WARNING,
  [AUDIT_ACTIONS.SECURITY_RATE_LIMIT]: SEVERITY.WARNING,
  [AUDIT_ACTIONS.SECURITY_SUSPICIOUS_ACTIVITY]: SEVERITY.ERROR,
  [AUDIT_ACTIONS.SECURITY_BREACH_ATTEMPT]: SEVERITY.CRITICAL,
  [AUDIT_ACTIONS.SECURITY_INVALID_INPUT]: SEVERITY.WARNING,
  [AUDIT_ACTIONS.SYSTEM_ERROR]: SEVERITY.ERROR,
  [AUDIT_ACTIONS.DATA_DELETE]: SEVERITY.WARNING,
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logger Class
// ─────────────────────────────────────────────────────────────────────────────

class AuditLogger {
  constructor() {
    this.enabled = process.env.AUDIT_ENABLED !== 'false'
    this.logLevel = process.env.LOG_LEVEL || 'info'
    this.buffer = []
    this.flushInterval = 5000 // 5 seconds
    this.maxBufferSize = 100
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  /**
   * Get severity for action
   */
  getSeverity(action) {
    return ACTION_SEVERITY[action] || SEVERITY.INFO
  }

  /**
   * Should log based on severity
   */
  shouldLog(severity) {
    const levels = [SEVERITY.DEBUG, SEVERITY.INFO, SEVERITY.WARNING, SEVERITY.ERROR, SEVERITY.CRITICAL]
    const configuredLevel = levels.indexOf(this.logLevel)
    const eventLevel = levels.indexOf(severity)
    return eventLevel >= configuredLevel
  }

  /**
   * Create audit event (A.12.4.1)
   * @param {object} params - Event parameters
   * @returns {object} Audit event
   */
  createEvent({
    action,
    actorOrg,
    actorUser,
    actorIp,
    resource,
    resourceId,
    outcome,
    reason,
    metadata,
    requestId,
    sessionId,
    userAgent,
  }) {
    return {
      ts: new Date().toISOString(),
      eventId: this.generateEventId(),
      action,
      actorOrg: actorOrg || 'anonymous',
      actorUser,
      actorIp,
      resource,
      resourceId,
      outcome,
      reason,
      metadata: maskSensitiveData(metadata),
      requestId,
      sessionId,
      userAgent,
      severity: this.getSeverity(action),
    }
  }

  /**
   * Log audit event (A.12.4.1)
   * @param {object} event - Audit event
   */
  async log(event) {
    if (!this.enabled) return

    const severity = event.severity || this.getSeverity(event.action)
    if (!this.shouldLog(severity)) return

    try {
      // Console output for immediate visibility
      const logFn = severity === SEVERITY.ERROR || severity === SEVERITY.CRITICAL 
        ? console.error 
        : console.log
      
      logFn(`[AUDIT] [${severity.toUpperCase()}] ${event.action}`, {
        eventId: event.eventId,
        actor: `${event.actorOrg}/${event.actorUser || 'system'}`,
        outcome: event.outcome,
        resource: event.resource,
      })

      // Persist to audit repository
      await appendAudit({
        ts: event.ts,
        actorOrg: event.actorOrg,
        action: event.action,
        space: event.resource,
        productId: event.resourceId,
        decision: event.outcome,
        reason: event.reason,
      })
    } catch (err) {
      console.error('[AUDIT] Failed to persist audit event:', err)
    }
  }

  /**
   * Log authentication event (A.12.4.3)
   */
  async logAuth(success, identity, context = {}) {
    const action = success 
      ? AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS 
      : AUDIT_ACTIONS.AUTH_LOGIN_FAILURE

    await this.log(this.createEvent({
      action,
      actorOrg: identity?.orgId || 'unknown',
      actorUser: identity?.userId,
      actorIp: context.clientIp,
      outcome: success ? 'success' : 'failure',
      reason: context.reason,
      requestId: context.requestId,
      userAgent: context.userAgent,
      metadata: { method: context.method },
    }))
  }

  /**
   * Log access control decision (A.12.4.3)
   */
  async logAccess(allowed, identity, resource, permission, context = {}) {
    const action = allowed 
      ? AUDIT_ACTIONS.ACCESS_GRANTED 
      : AUDIT_ACTIONS.ACCESS_DENIED

    await this.log(this.createEvent({
      action,
      actorOrg: identity?.orgId || 'unknown',
      actorUser: identity?.userId,
      actorIp: context.clientIp,
      resource,
      outcome: allowed ? 'success' : 'failure',
      reason: context.reason || (allowed ? 'Permission granted' : 'Permission denied'),
      metadata: { permission, roles: identity?.roles },
      requestId: context.requestId,
    }))
  }

  /**
   * Log data operation (A.12.4.1)
   */
  async logDataOperation(operation, identity, resource, resourceId, outcome, context = {}) {
    const actionMap = {
      read: AUDIT_ACTIONS.DATA_READ,
      create: AUDIT_ACTIONS.DATA_CREATE,
      update: AUDIT_ACTIONS.DATA_UPDATE,
      delete: AUDIT_ACTIONS.DATA_DELETE,
      export: AUDIT_ACTIONS.DATA_EXPORT,
      publish: AUDIT_ACTIONS.DATA_PUBLISH,
      consume: AUDIT_ACTIONS.DATA_CONSUME,
    }

    await this.log(this.createEvent({
      action: actionMap[operation] || operation,
      actorOrg: identity?.orgId || 'unknown',
      actorUser: identity?.userId,
      actorIp: context.clientIp,
      resource,
      resourceId,
      outcome,
      reason: context.reason,
      metadata: context.metadata,
      requestId: context.requestId,
    }))
  }

  /**
   * Log security event (A.12.4.1)
   */
  async logSecurityEvent(type, details, context = {}) {
    const actionMap = {
      rate_limit: AUDIT_ACTIONS.SECURITY_RATE_LIMIT,
      suspicious: AUDIT_ACTIONS.SECURITY_SUSPICIOUS_ACTIVITY,
      invalid_input: AUDIT_ACTIONS.SECURITY_INVALID_INPUT,
      breach_attempt: AUDIT_ACTIONS.SECURITY_BREACH_ATTEMPT,
    }

    await this.log(this.createEvent({
      action: actionMap[type] || type,
      actorOrg: context.orgId || 'unknown',
      actorIp: context.clientIp,
      outcome: 'failure',
      reason: details.reason || details.message,
      metadata: maskSensitiveData(details),
      requestId: context.requestId,
    }))
  }

  /**
   * Log system event (A.12.4.1)
   */
  async logSystemEvent(action, outcome, details = {}) {
    await this.log(this.createEvent({
      action,
      actorOrg: 'system',
      outcome,
      metadata: details,
    }))
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger()

// Convenience exports
export const logAuth = (success, identity, context) => 
  auditLogger.logAuth(success, identity, context)

export const logAccess = (allowed, identity, resource, permission, context) => 
  auditLogger.logAccess(allowed, identity, resource, permission, context)

export const logDataOperation = (operation, identity, resource, resourceId, outcome, context) => 
  auditLogger.logDataOperation(operation, identity, resource, resourceId, outcome, context)

export const logSecurityEvent = (type, details, context) => 
  auditLogger.logSecurityEvent(type, details, context)

export const logSystemEvent = (action, outcome, details) => 
  auditLogger.logSystemEvent(action, outcome, details)
