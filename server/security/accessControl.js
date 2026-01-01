/**
 * Access Control Module - ISO 27001 A.9
 * Implements role-based access control (RBAC) and permission management
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Role Definitions (A.9.2 - User access management)
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN: 'admin',
  DATA_STEWARD: 'data_steward',
  DATA_CONSUMER: 'data_consumer',
  DATA_PRODUCER: 'data_producer',
  AUDITOR: 'auditor',
  VIEWER: 'viewer',
}

export const PERMISSIONS = {
  // Data operations
  DATA_READ: 'data:read',
  DATA_WRITE: 'data:write',
  DATA_DELETE: 'data:delete',
  DATA_PUBLISH: 'data:publish',
  DATA_CONSUME: 'data:consume',
  
  // Admin operations
  ADMIN_USERS: 'admin:users',
  ADMIN_ROLES: 'admin:roles',
  ADMIN_CONFIG: 'admin:config',
  
  // Audit operations
  AUDIT_READ: 'audit:read',
  AUDIT_EXPORT: 'audit:export',
  
  // System operations
  SYSTEM_DEBUG: 'system:debug',
  SYSTEM_NORMALIZE: 'system:normalize',
}

// Role to permissions mapping (A.9.2.3 - Management of privileged access rights)
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.DATA_STEWARD]: [
    PERMISSIONS.DATA_READ,
    PERMISSIONS.DATA_WRITE,
    PERMISSIONS.DATA_DELETE,
    PERMISSIONS.DATA_PUBLISH,
    PERMISSIONS.SYSTEM_NORMALIZE,
    PERMISSIONS.AUDIT_READ,
  ],
  [ROLES.DATA_CONSUMER]: [
    PERMISSIONS.DATA_READ,
    PERMISSIONS.DATA_CONSUME,
  ],
  [ROLES.DATA_PRODUCER]: [
    PERMISSIONS.DATA_READ,
    PERMISSIONS.DATA_WRITE,
    PERMISSIONS.DATA_PUBLISH,
  ],
  [ROLES.AUDITOR]: [
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.AUDIT_EXPORT,
    PERMISSIONS.DATA_READ,
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.DATA_READ,
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Identity Schema (A.9.2.1 - User registration and de-registration)
// ─────────────────────────────────────────────────────────────────────────────

export const IdentitySchema = z.object({
  orgId: z.string().min(1),
  userId: z.string().min(1).optional(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()).optional(),
  sessionId: z.string().optional(),
  authenticatedAt: z.string().datetime().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Access Control Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all permissions for a set of roles (A.9.2)
 * @param {string[]} roles - Array of role names
 * @returns {string[]} Array of permissions
 */
export function getPermissionsForRoles(roles) {
  const permissions = new Set()
  
  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS[role] || []
    rolePerms.forEach(p => permissions.add(p))
  }
  
  return Array.from(permissions)
}

/**
 * Check if identity has required permission (A.9.4)
 * @param {object} identity - Identity object with roles
 * @param {string} requiredPermission - Permission to check
 * @returns {boolean}
 */
export function hasPermission(identity, requiredPermission) {
  if (!identity || !identity.roles) return false
  
  // Check explicit permissions first
  if (identity.permissions?.includes(requiredPermission)) {
    return true
  }
  
  // Check role-based permissions
  const permissions = getPermissionsForRoles(identity.roles)
  return permissions.includes(requiredPermission)
}

/**
 * Check if identity has ALL required permissions (A.9.4)
 * @param {object} identity - Identity object with roles
 * @param {string[]} requiredPermissions - Permissions to check
 * @returns {boolean}
 */
export function hasAllPermissions(identity, requiredPermissions) {
  return requiredPermissions.every(p => hasPermission(identity, p))
}

/**
 * Check if identity has ANY of the required permissions (A.9.4)
 * @param {object} identity - Identity object with roles
 * @param {string[]} requiredPermissions - Permissions to check
 * @returns {boolean}
 */
export function hasAnyPermission(identity, requiredPermissions) {
  return requiredPermissions.some(p => hasPermission(identity, p))
}

/**
 * Validate and parse identity from request headers (A.9.4.1)
 * @param {object} headers - Request headers
 * @returns {{ identity: object, valid: boolean, error?: string }}
 */
export function parseIdentityFromHeaders(headers) {
  const orgId = headers['x-org-id'] || headers['X-Org-Id']
  const userId = headers['x-user-id'] || headers['X-User-Id']
  const rolesHeader = headers['x-roles'] || headers['X-Roles'] || ''
  const sessionId = headers['x-session-id'] || headers['X-Session-Id']
  
  if (!orgId) {
    return { valid: false, error: 'Missing organization ID', identity: null }
  }
  
  const roles = rolesHeader
    .split(',')
    .map(r => r.trim().toLowerCase())
    .filter(r => r.length > 0)
  
  // Validate roles against known roles
  const validRoles = Object.values(ROLES)
  const invalidRoles = roles.filter(r => !validRoles.includes(r))
  
  if (invalidRoles.length > 0) {
    return { 
      valid: false, 
      error: `Invalid roles: ${invalidRoles.join(', ')}`,
      identity: null,
    }
  }
  
  return {
    valid: true,
    identity: {
      orgId,
      userId: userId || null,
      roles,
      sessionId: sessionId || null,
      authenticatedAt: new Date().toISOString(),
    },
  }
}

/**
 * Create access decision result (A.9.4)
 * @param {boolean} allow - Whether access is allowed
 * @param {string} reason - Reason for decision
 * @param {object} context - Additional context
 * @returns {object}
 */
export function createAccessDecision(allow, reason, context = {}) {
  return {
    allow,
    reason,
    timestamp: new Date().toISOString(),
    ...context,
  }
}

/**
 * Enforce permission on endpoint (A.9.4.1)
 * @param {object} identity - Identity object
 * @param {string} requiredPermission - Permission required
 * @param {string} resource - Resource being accessed
 * @returns {{ allowed: boolean, decision: object }}
 */
export function enforcePermission(identity, requiredPermission, resource) {
  if (!identity) {
    return {
      allowed: false,
      decision: createAccessDecision(false, 'No identity provided', { resource }),
    }
  }
  
  const allowed = hasPermission(identity, requiredPermission)
  
  return {
    allowed,
    decision: createAccessDecision(
      allowed,
      allowed ? 'Permission granted' : `Missing permission: ${requiredPermission}`,
      { 
        resource, 
        requiredPermission,
        identityRoles: identity.roles,
      }
    ),
  }
}

/**
 * Check resource ownership (A.9.4.1)
 * @param {object} identity - Identity object
 * @param {object} resource - Resource with ownership info
 * @returns {boolean}
 */
export function isResourceOwner(identity, resource) {
  if (!identity || !resource) return false
  
  // Check organization ownership
  if (resource.orgId && resource.orgId === identity.orgId) {
    return true
  }
  
  // Check user ownership
  if (resource.ownerId && resource.ownerId === identity.userId) {
    return true
  }
  
  return false
}

/**
 * Apply data classification access rules (A.8.2)
 * @param {object} identity - Identity object
 * @param {string} classification - Data classification level
 * @returns {boolean}
 */
export function canAccessClassification(identity, classification) {
  const classificationAccess = {
    public: [ROLES.VIEWER, ROLES.DATA_CONSUMER, ROLES.DATA_PRODUCER, ROLES.DATA_STEWARD, ROLES.AUDITOR, ROLES.ADMIN],
    internal: [ROLES.DATA_CONSUMER, ROLES.DATA_PRODUCER, ROLES.DATA_STEWARD, ROLES.AUDITOR, ROLES.ADMIN],
    confidential: [ROLES.DATA_STEWARD, ROLES.ADMIN],
    restricted: [ROLES.ADMIN],
  }
  
  const allowedRoles = classificationAccess[classification] || []
  return identity.roles.some(r => allowedRoles.includes(r))
}
