import { describe, it, expect } from 'vitest'
import { evaluateAccess } from '../policy/evaluateAccess.js'

const basePolicy = {
  allowedPurposes: ['analytics', 'reporting'],
  allowedRoles: ['admin', 'analyst'],
  retentionDays: 30,
  pii: false,
}

const validIdentity = {
  orgId: 'org-1',
  roles: ['analyst'],
}

describe('evaluateAccess', () => {
  it('allows access when all conditions are met', () => {
    const result = evaluateAccess(basePolicy, validIdentity, 'analytics')
    expect(result.allow).toBe(true)
    expect(result.reason).toBe('access granted')
  })

  it('denies access when purpose is not allowed', () => {
    const result = evaluateAccess(basePolicy, validIdentity, 'marketing')
    expect(result.allow).toBe(false)
    expect(result.reason).toContain('purpose')
    expect(result.reason).toContain('not allowed')
  })

  it('denies access when role does not match', () => {
    const identity = { orgId: 'org-1', roles: ['viewer'] }
    const result = evaluateAccess(basePolicy, identity, 'analytics')
    expect(result.allow).toBe(false)
    expect(result.reason).toBe('no matching role')
  })

  it('denies access when pii is true', () => {
    const piiPolicy = { ...basePolicy, pii: true }
    const result = evaluateAccess(piiPolicy, validIdentity, 'analytics')
    expect(result.allow).toBe(false)
    expect(result.reason).toBe('pii must be false')
  })
})
