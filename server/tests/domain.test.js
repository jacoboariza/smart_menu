import { describe, it, expect } from 'vitest'
import { AccessPolicy, validateAccessPolicy } from '../domain/policy.js'
import { DataProduct, validateDataProduct } from '../domain/dataProduct.js'
import { AuditEvent, validateAuditEvent } from '../domain/audit.js'

const basePolicy = {
  allowedPurposes: ['analytics'],
  allowedRoles: ['admin'],
  retentionDays: 30,
  pii: false,
}

const baseProduct = {
  id: '11111111-1111-1111-8111-111111111111',
  type: 'menu',
  version: 'v1',
  schema: { foo: 'bar' },
  metadata: { title: 'Menu product', granularity: 'item', latency: 'daily' },
  policy: basePolicy,
  createdByOrg: 'org-1',
  createdAt: '2024-01-01T00:00:00.000Z',
}

describe('AccessPolicy', () => {
  it('acepta un policy válido', () => {
    const parsed = validateAccessPolicy(basePolicy)
    expect(parsed.allowedPurposes).toContain('analytics')
  })

  it('rechaza cuando pii es true', () => {
    expect(() => validateAccessPolicy({ ...basePolicy, pii: true })).toThrow()
  })
})

describe('DataProduct', () => {
  it('acepta un data product válido', () => {
    const parsed = validateDataProduct(baseProduct)
    expect(parsed.metadata.title).toBe('Menu product')
  })

  it('rechaza payloadRef inválido', () => {
    const bad = {
      ...baseProduct,
      payloadRef: { kind: 'raw', source: 'menu', restaurantId: 'r1' },
    }
    expect(() => validateDataProduct(bad)).toThrow()
  })
})

describe('AuditEvent', () => {
  it('acepta un evento válido', () => {
    const event = {
      ts: '2024-01-01T00:00:00.000Z',
      actorOrg: 'org-1',
      action: 'access_granted',
      productId: baseProduct.id,
      decision: 'allow',
    }
    const parsed = validateAuditEvent(event)
    expect(parsed.decision).toBe('allow')
  })

  it('rechaza timestamp inválido', () => {
    const bad = {
      ts: 'not-a-date',
      actorOrg: 'org-1',
      action: 'access_granted',
    }
    expect(() => validateAuditEvent(bad)).toThrow()
  })
})
