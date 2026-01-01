/**
 * Security Module Tests - ISO 27001 Compliance
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  // Crypto
  hashSHA256,
  generateSecureToken,
  generateUUID,
  secureCompare,
  
  // Access Control
  ROLES,
  PERMISSIONS,
  getPermissionsForRoles,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  parseIdentityFromHeaders,
  enforcePermission,
  canAccessClassification,
  
  // Input Validation
  checkDangerousPatterns,
  checkObjectForDangerousPatterns,
  sanitizeString,
  sanitizeObject,
  validateRequestBody,
  isValidUUID,
  isValidApiKey,
  ValidationSchemas,
  
  // Session Management
  createSession,
  validateSession,
  invalidateSession,
  getUserSessions,
} from '../security/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// A.10 - Cryptography Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Cryptography (A.10)', () => {
  describe('hashSHA256', () => {
    it('should produce consistent hashes', async () => {
      const hash1 = await hashSHA256('test-data')
      const hash2 = await hashSHA256('test-data')
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different inputs', async () => {
      const hash1 = await hashSHA256('test-data-1')
      const hash2 = await hashSHA256('test-data-2')
      expect(hash1).not.toBe(hash2)
    })

    it('should produce 64 character hex string', async () => {
      const hash = await hashSHA256('test')
      expect(hash).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true)
    })
  })

  describe('generateSecureToken', () => {
    it('should generate token of specified length', () => {
      const token = generateSecureToken(32)
      expect(token).toHaveLength(32)
    })

    it('should generate unique tokens', () => {
      const tokens = new Set()
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken(32))
      }
      expect(tokens.size).toBe(100)
    })
  })

  describe('generateUUID', () => {
    it('should generate valid UUID v4 format', () => {
      const uuid = generateUUID()
      expect(isValidUUID(uuid)).toBe(true)
    })

    it('should generate unique UUIDs', () => {
      const uuids = new Set()
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID())
      }
      expect(uuids.size).toBe(100)
    })
  })

  describe('secureCompare', () => {
    it('should return true for equal strings', () => {
      expect(secureCompare('test123', 'test123')).toBe(true)
    })

    it('should return false for different strings', () => {
      expect(secureCompare('test123', 'test456')).toBe(false)
    })

    it('should return false for different length strings', () => {
      expect(secureCompare('short', 'longer-string')).toBe(false)
    })

    it('should return false for non-strings', () => {
      expect(secureCompare(null, 'test')).toBe(false)
      expect(secureCompare('test', undefined)).toBe(false)
      expect(secureCompare(123, 123)).toBe(false)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// A.9 - Access Control Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Access Control (A.9)', () => {
  describe('getPermissionsForRoles', () => {
    it('should return all permissions for admin', () => {
      const perms = getPermissionsForRoles([ROLES.ADMIN])
      expect(perms).toContain(PERMISSIONS.DATA_READ)
      expect(perms).toContain(PERMISSIONS.ADMIN_USERS)
      expect(perms).toContain(PERMISSIONS.AUDIT_READ)
    })

    it('should return limited permissions for viewer', () => {
      const perms = getPermissionsForRoles([ROLES.VIEWER])
      expect(perms).toContain(PERMISSIONS.DATA_READ)
      expect(perms).not.toContain(PERMISSIONS.DATA_WRITE)
      expect(perms).not.toContain(PERMISSIONS.ADMIN_USERS)
    })

    it('should merge permissions from multiple roles', () => {
      const perms = getPermissionsForRoles([ROLES.DATA_CONSUMER, ROLES.AUDITOR])
      expect(perms).toContain(PERMISSIONS.DATA_CONSUME)
      expect(perms).toContain(PERMISSIONS.AUDIT_EXPORT)
    })
  })

  describe('hasPermission', () => {
    it('should return true if identity has permission via role', () => {
      const identity = { orgId: 'org1', roles: [ROLES.ADMIN] }
      expect(hasPermission(identity, PERMISSIONS.DATA_READ)).toBe(true)
    })

    it('should return false if identity lacks permission', () => {
      const identity = { orgId: 'org1', roles: [ROLES.VIEWER] }
      expect(hasPermission(identity, PERMISSIONS.DATA_WRITE)).toBe(false)
    })

    it('should return false for null identity', () => {
      expect(hasPermission(null, PERMISSIONS.DATA_READ)).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('should return true if all permissions are present', () => {
      const identity = { orgId: 'org1', roles: [ROLES.DATA_STEWARD] }
      expect(hasAllPermissions(identity, [PERMISSIONS.DATA_READ, PERMISSIONS.DATA_WRITE])).toBe(true)
    })

    it('should return false if any permission is missing', () => {
      const identity = { orgId: 'org1', roles: [ROLES.VIEWER] }
      expect(hasAllPermissions(identity, [PERMISSIONS.DATA_READ, PERMISSIONS.DATA_WRITE])).toBe(false)
    })
  })

  describe('parseIdentityFromHeaders', () => {
    it('should parse valid headers', () => {
      const headers = {
        'x-org-id': 'org123',
        'x-user-id': 'user456',
        'x-roles': 'admin,data_steward',
      }
      const result = parseIdentityFromHeaders(headers)
      expect(result.valid).toBe(true)
      expect(result.identity.orgId).toBe('org123')
      expect(result.identity.roles).toContain('admin')
    })

    it('should reject missing org ID', () => {
      const headers = { 'x-roles': 'admin' }
      const result = parseIdentityFromHeaders(headers)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('organization')
    })

    it('should reject invalid roles', () => {
      const headers = {
        'x-org-id': 'org123',
        'x-roles': 'invalid_role',
      }
      const result = parseIdentityFromHeaders(headers)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid roles')
    })
  })

  describe('enforcePermission', () => {
    it('should allow access with valid permission', () => {
      const identity = { orgId: 'org1', roles: [ROLES.ADMIN] }
      const result = enforcePermission(identity, PERMISSIONS.DATA_READ, '/data')
      expect(result.allowed).toBe(true)
      expect(result.decision.allow).toBe(true)
    })

    it('should deny access without permission', () => {
      const identity = { orgId: 'org1', roles: [ROLES.VIEWER] }
      const result = enforcePermission(identity, PERMISSIONS.ADMIN_USERS, '/admin')
      expect(result.allowed).toBe(false)
      expect(result.decision.reason).toContain('Missing permission')
    })
  })

  describe('canAccessClassification', () => {
    it('should allow admin to access restricted data', () => {
      const identity = { orgId: 'org1', roles: [ROLES.ADMIN] }
      expect(canAccessClassification(identity, 'restricted')).toBe(true)
    })

    it('should deny viewer access to confidential data', () => {
      const identity = { orgId: 'org1', roles: [ROLES.VIEWER] }
      expect(canAccessClassification(identity, 'confidential')).toBe(false)
    })

    it('should allow viewer to access public data', () => {
      const identity = { orgId: 'org1', roles: [ROLES.VIEWER] }
      expect(canAccessClassification(identity, 'public')).toBe(true)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// A.14.2.5 - Input Validation Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Input Validation (A.14.2.5)', () => {
  describe('checkDangerousPatterns', () => {
    it('should detect SQL injection', () => {
      const result = checkDangerousPatterns("SELECT * FROM users WHERE id = 1")
      expect(result.safe).toBe(false)
      expect(result.pattern).toBe('sql_injection')
    })

    it('should detect script injection', () => {
      const result = checkDangerousPatterns('<script>alert("xss")</script>')
      expect(result.safe).toBe(false)
      expect(result.pattern).toBe('script_tag')
    })

    it('should detect path traversal', () => {
      const result = checkDangerousPatterns('../../../etc/passwd')
      expect(result.safe).toBe(false)
      expect(result.pattern).toBe('path_traversal')
    })

    it('should allow safe input', () => {
      const result = checkDangerousPatterns('This is a normal menu item description')
      expect(result.safe).toBe(true)
    })
  })

  describe('checkObjectForDangerousPatterns', () => {
    it('should detect dangerous patterns in nested objects', () => {
      const obj = {
        name: 'safe',
        nested: {
          value: '<script>alert(1)</script>',
        },
      }
      const result = checkObjectForDangerousPatterns(obj)
      expect(result.safe).toBe(false)
      expect(result.violations[0].path).toBe('nested.value')
    })

    it('should detect dangerous patterns in arrays', () => {
      const obj = {
        items: ['safe', 'SELECT * FROM users'],
      }
      const result = checkObjectForDangerousPatterns(obj)
      expect(result.safe).toBe(false)
    })
  })

  describe('sanitizeString', () => {
    it('should truncate long strings', () => {
      const input = 'a'.repeat(2000)
      const result = sanitizeString(input, { maxLength: 100 })
      expect(result.length).toBe(100)
    })

    it('should remove null bytes', () => {
      const input = 'test\x00value'
      const result = sanitizeString(input)
      expect(result).toBe('testvalue')
    })

    it('should escape HTML by default', () => {
      const input = '<script>alert(1)</script>'
      const result = sanitizeString(input)
      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;script&gt;')
    })

    it('should trim whitespace', () => {
      const input = '  test  '
      const result = sanitizeString(input)
      expect(result).toBe('test')
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize all string values in object', () => {
      const obj = {
        name: '<b>test</b>',
        items: ['<script>x</script>'],
      }
      const result = sanitizeObject(obj)
      expect(result.name).not.toContain('<b>')
      expect(result.items[0]).not.toContain('<script>')
    })
  })

  describe('validateRequestBody', () => {
    it('should validate valid JSON against schema', () => {
      const body = JSON.stringify({ type: 'menu', restaurantId: 'rest123' })
      const result = validateRequestBody(body, ValidationSchemas.dataProductBuild)
      expect(result.valid).toBe(true)
      expect(result.data.type).toBe('menu')
    })

    it('should reject invalid JSON', () => {
      const result = validateRequestBody('not json', ValidationSchemas.dataProductBuild)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid JSON')
    })

    it('should reject schema violations', () => {
      const body = JSON.stringify({ type: 'invalid' })
      const result = validateRequestBody(body, ValidationSchemas.dataProductBuild)
      expect(result.valid).toBe(false)
    })

    it('should reject dangerous patterns', () => {
      const body = JSON.stringify({ type: 'menu', restaurantId: '<script>x</script>' })
      const result = validateRequestBody(body, ValidationSchemas.dataProductBuild)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Dangerous pattern')
    })
  })

  describe('isValidUUID', () => {
    it('should validate correct UUID v4', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    })

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false)
      expect(isValidUUID('550e8400-e29b-51d4-a716-446655440000')).toBe(false) // v5 not v4
    })
  })

  describe('isValidApiKey', () => {
    it('should validate correct API key format', () => {
      expect(isValidApiKey('abcd1234efgh5678ijkl')).toBe(true)
    })

    it('should reject short API keys', () => {
      expect(isValidApiKey('short')).toBe(false)
    })

    it('should reject keys with invalid characters', () => {
      expect(isValidApiKey('key-with-$pecial-chars!')).toBe(false)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// A.9.4 - Session Management Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Session Management (A.9.4)', () => {
  beforeEach(() => {
    // Clean up sessions between tests
  })

  describe('createSession', () => {
    it('should create a valid session', () => {
      const identity = { orgId: 'org1', userId: 'user1', roles: ['admin'] }
      const result = createSession(identity, { clientIp: '127.0.0.1' })
      
      expect(result.session).toBeDefined()
      expect(result.token).toBeDefined()
      expect(result.session.orgId).toBe('org1')
      expect(result.session.active).toBe(true)
    })

    it('should generate unique tokens', () => {
      const identity = { orgId: 'org1', userId: 'user1', roles: [] }
      const result1 = createSession(identity)
      const result2 = createSession(identity)
      
      expect(result1.token).not.toBe(result2.token)
    })
  })

  describe('validateSession', () => {
    it('should validate a valid session', () => {
      const identity = { orgId: 'org1', userId: 'user1', roles: ['viewer'] }
      const { token } = createSession(identity)
      
      const result = validateSession(token)
      expect(result.valid).toBe(true)
      expect(result.session.orgId).toBe('org1')
    })

    it('should reject invalid token format', () => {
      const result = validateSession('invalid-token')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('format')
    })

    it('should reject non-existent session', () => {
      const result = validateSession('nonexistent.token123456')
      expect(result.valid).toBe(false)
    })
  })

  describe('invalidateSession', () => {
    it('should invalidate an active session', () => {
      const identity = { orgId: 'org1', userId: 'user1', roles: [] }
      const { session, token } = createSession(identity)
      
      invalidateSession(session.id)
      
      const result = validateSession(token)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('invalidated')
    })
  })

  describe('getUserSessions', () => {
    it('should return all active sessions for user', () => {
      const identity = { orgId: 'org1', userId: 'user1', roles: [] }
      createSession(identity)
      createSession(identity)
      
      const sessions = getUserSessions('org1', 'user1')
      expect(sessions.length).toBeGreaterThanOrEqual(2)
    })
  })
})
