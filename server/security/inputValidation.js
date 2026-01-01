/**
 * Input Validation Module - ISO 27001 A.14.2.5
 * Secure input validation and sanitization
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Common Validation Patterns (A.14.2.5 - Secure system engineering)
// ─────────────────────────────────────────────────────────────────────────────

const PATTERNS = {
  // Safe string - no control characters or dangerous sequences
  safeString: /^[^<>{}|\\^`\x00-\x1f]*$/,
  // Alphanumeric with limited special chars
  alphanumericPlus: /^[a-zA-Z0-9_\-. ]+$/,
  // UUID v4 format
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  // ISO 8601 date
  isoDate: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/,
  // Email (basic validation)
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // API Key format
  apiKey: /^[a-zA-Z0-9_\-]{16,128}$/,
  // Organization ID
  orgId: /^[a-zA-Z0-9_\-]{1,64}$/,
  // Space name
  spaceName: /^[a-zA-Z0-9_\-]{1,32}$/,
}

// ─────────────────────────────────────────────────────────────────────────────
// Dangerous Patterns to Reject (A.12.2 - Protection from malware)
// ─────────────────────────────────────────────────────────────────────────────

const DANGEROUS_PATTERNS = [
  // SQL Injection
  { name: 'sql_injection', pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b\s+)/i },
  { name: 'sql_comment', pattern: /(--|\/\*|\*\/|;--)/i },
  // XSS
  { name: 'script_tag', pattern: /<script[\s\S]*?>/i },
  { name: 'event_handler', pattern: /\bon\w+\s*=/i },
  { name: 'javascript_uri', pattern: /javascript:/i },
  { name: 'data_uri', pattern: /data:text\/html/i },
  // Path Traversal
  { name: 'path_traversal', pattern: /\.\.[\/\\]/ },
  { name: 'null_byte', pattern: /\x00/ },
  // Command Injection
  { name: 'command_injection', pattern: /[;&|`$]/ },
  // LDAP Injection
  { name: 'ldap_injection', pattern: /[)(|*\\]/ },
  // XML/XXE
  { name: 'xml_entity', pattern: /<!ENTITY/i },
  { name: 'xml_doctype', pattern: /<!DOCTYPE/i },
]

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schemas (A.14.2.5)
// ─────────────────────────────────────────────────────────────────────────────

export const ValidationSchemas = {
  // Request headers
  headers: z.object({
    'x-api-key': z.string().min(16).max(128).regex(PATTERNS.apiKey).optional(),
    'x-org-id': z.string().max(64).regex(PATTERNS.orgId).optional(),
    'x-roles': z.string().max(256).optional(),
    'x-user-id': z.string().max(64).optional(),
    'content-type': z.string().max(128).optional(),
  }).passthrough(),

  // Query parameters
  queryParams: z.object({
    source: z.enum(['menu', 'occupancy']).optional(),
    type: z.enum(['menu', 'occupancy']).optional(),
    space: z.string().max(32).regex(PATTERNS.spaceName).optional(),
    restaurantId: z.string().max(64).optional(),
    productId: z.string().uuid().optional(),
    action: z.string().max(64).optional(),
    since: z.string().regex(PATTERNS.isoDate).optional(),
    limit: z.coerce.number().int().min(1).max(1000).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  }).passthrough(),

  // Data product build request
  dataProductBuild: z.object({
    type: z.enum(['menu', 'occupancy']),
    restaurantId: z.string().min(1).max(64),
    policyOverrides: z.object({
      pii: z.literal(false).optional(),
      allowedPurposes: z.array(z.string().max(64)).optional(),
      allowedRoles: z.array(z.string().max(64)).optional(),
    }).optional(),
  }),

  // Publish request
  publishRequest: z.object({
    productId: z.string().uuid(),
  }),

  // Consume request
  consumeRequest: z.object({
    purpose: z.string().min(1).max(256),
  }),

  // Ingest menu item
  menuItem: z.object({
    name: z.string().min(1).max(256),
    description: z.string().max(2000).optional(),
    price: z.number().min(0).max(100000).optional(),
    currency: z.string().length(3).optional(),
    category: z.string().max(128).optional(),
    allergens: z.array(z.string().max(64)).optional(),
    available: z.boolean().optional(),
  }).passthrough(),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Functions (A.14.2.5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check for dangerous patterns in input
 * @param {string} input - Input to check
 * @returns {{ safe: boolean, pattern?: string }}
 */
export function checkDangerousPatterns(input) {
  if (typeof input !== 'string') {
    return { safe: true }
  }

  for (const { name, pattern } of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      return { safe: false, pattern: name }
    }
  }

  return { safe: true }
}

/**
 * Recursively check object for dangerous patterns
 * @param {any} obj - Object to check
 * @param {string} path - Current path
 * @returns {{ safe: boolean, violations: Array<{path: string, pattern: string}> }}
 */
export function checkObjectForDangerousPatterns(obj, path = '') {
  const violations = []

  if (typeof obj === 'string') {
    const check = checkDangerousPatterns(obj)
    if (!check.safe) {
      violations.push({ path, pattern: check.pattern })
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const result = checkObjectForDangerousPatterns(item, `${path}[${index}]`)
      violations.push(...result.violations)
    })
  } else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const result = checkObjectForDangerousPatterns(value, path ? `${path}.${key}` : key)
      violations.push(...result.violations)
    }
  }

  return { safe: violations.length === 0, violations }
}

/**
 * Sanitize string input (A.14.2.5)
 * @param {string} input - Input to sanitize
 * @param {object} options - Sanitization options
 * @returns {string}
 */
export function sanitizeString(input, options = {}) {
  if (typeof input !== 'string') return ''

  const {
    maxLength = 1000,
    allowHtml = false,
    allowNewlines = true,
    trim = true,
  } = options

  let result = input

  // Truncate
  if (result.length > maxLength) {
    result = result.slice(0, maxLength)
  }

  // Remove null bytes
  result = result.replace(/\x00/g, '')

  // Remove control characters (except newlines if allowed)
  if (allowNewlines) {
    result = result.replace(/[\x00-\x09\x0b\x0c\x0e-\x1f]/g, '')
  } else {
    result = result.replace(/[\x00-\x1f]/g, '')
  }

  // Escape HTML if not allowed
  if (!allowHtml) {
    result = result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  }

  // Trim
  if (trim) {
    result = result.trim()
  }

  return result
}

/**
 * Sanitize object recursively
 * @param {any} obj - Object to sanitize
 * @param {object} options - Sanitization options
 * @returns {any}
 */
export function sanitizeObject(obj, options = {}) {
  if (typeof obj === 'string') {
    return sanitizeString(obj, options)
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options))
  }

  if (obj && typeof obj === 'object') {
    const result = {}
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize keys too
      const safeKey = sanitizeString(key, { maxLength: 128 })
      result[safeKey] = sanitizeObject(value, options)
    }
    return result
  }

  return obj
}

/**
 * Validate and sanitize request body
 * @param {string} rawBody - Raw request body
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {{ valid: boolean, data?: any, error?: string }}
 */
export function validateRequestBody(rawBody, schema) {
  // Parse JSON
  let parsed
  try {
    parsed = rawBody ? JSON.parse(rawBody) : {}
  } catch (err) {
    return { valid: false, error: 'Invalid JSON body' }
  }

  // Check for dangerous patterns
  const dangerCheck = checkObjectForDangerousPatterns(parsed)
  if (!dangerCheck.safe) {
    const violation = dangerCheck.violations[0]
    return { 
      valid: false, 
      error: `Dangerous pattern detected at ${violation.path}: ${violation.pattern}`,
    }
  }

  // Validate against schema
  const result = schema.safeParse(parsed)
  if (!result.success) {
    // Handle both Zod v3 (errors array) and Zod v4 (issues array) formats
    const errors = result.error.errors || result.error.issues || []
    const firstError = errors[0]
    if (firstError) {
      const path = Array.isArray(firstError.path) ? firstError.path.join('.') : ''
      return { 
        valid: false, 
        error: `Validation error${path ? ` at ${path}` : ''}: ${firstError.message}`,
      }
    }
    return { valid: false, error: 'Validation error' }
  }

  return { valid: true, data: result.data }
}

/**
 * Validate query parameters
 * @param {object} params - Query parameters
 * @returns {{ valid: boolean, data?: any, error?: string }}
 */
export function validateQueryParams(params) {
  return validateRequestBody(JSON.stringify(params || {}), ValidationSchemas.queryParams)
}

/**
 * Validate headers
 * @param {object} headers - Request headers
 * @returns {{ valid: boolean, sanitized: object }}
 */
export function validateHeaders(headers) {
  const sanitized = {}
  
  for (const [key, value] of Object.entries(headers || {})) {
    const lowerKey = key.toLowerCase()
    
    // Only process known safe headers
    if (typeof value === 'string' && value.length <= 1024) {
      sanitized[lowerKey] = sanitizeString(value, { maxLength: 1024, allowNewlines: false })
    }
  }

  return { valid: true, sanitized }
}

/**
 * Validate file upload (A.12.2)
 * @param {object} file - File metadata
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFileUpload(file) {
  const ALLOWED_MIME_TYPES = [
    'application/json',
    'text/plain',
    'text/csv',
    'application/pdf',
  ]

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  if (!file || !file.type) {
    return { valid: false, error: 'File type not specified' }
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed` }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds maximum of ${MAX_FILE_SIZE} bytes` }
  }

  // Check filename for path traversal
  if (file.name && /[\/\\]|\.\./.test(file.name)) {
    return { valid: false, error: 'Invalid filename' }
  }

  return { valid: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export validation helpers
// ─────────────────────────────────────────────────────────────────────────────

export const isValidUUID = (str) => PATTERNS.uuid.test(str)
export const isValidEmail = (str) => PATTERNS.email.test(str)
export const isValidISODate = (str) => PATTERNS.isoDate.test(str)
export const isValidApiKey = (str) => PATTERNS.apiKey.test(str)
export const isValidOrgId = (str) => PATTERNS.orgId.test(str)
export const isValidSpaceName = (str) => PATTERNS.spaceName.test(str)
