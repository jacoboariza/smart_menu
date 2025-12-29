import { randomUUID } from 'crypto'
import { listOccupancySignals } from '../storage/normalizedRepo.js'
import { upsert } from '../storage/dataProductRepo.js'

const DEFAULT_POLICY = {
  allowedPurposes: ['discovery', 'recommendation', 'analytics'],
  allowedRoles: ['destination', 'marketplace', 'restaurant'],
  retentionDays: 30,
  pii: false,
}

const OCCUPANCY_SCHEMA = {
  type: 'object',
  properties: {
    restaurantId: { type: 'string' },
    ts: { type: 'string', format: 'date-time' },
    occupancyPct: { type: 'number', minimum: 0, maximum: 100 },
  },
}

/**
 * Build an occupancy DataProduct from normalized occupancy signals
 * @param {object} opts
 * @param {string} opts.restaurantId
 * @param {object} opts.identity - { orgId: string, roles: string[] }
 * @param {object} [opts.policyOverrides]
 * @returns {Promise<object>} The created/updated DataProduct
 */
export async function buildOccupancyProduct({ restaurantId, identity, policyOverrides }) {
  const signals = await listOccupancySignals(restaurantId)

  const policy = {
    ...DEFAULT_POLICY,
    ...policyOverrides,
    pii: false, // Always enforce pii:false
  }

  const product = {
    id: randomUUID(),
    type: 'occupancy',
    version: 'v1',
    schema: OCCUPANCY_SCHEMA,
    metadata: {
      title: `Occupancy for ${restaurantId}`,
      granularity: 'hourly',
      latency: '5m',
      restaurantId,
    },
    policy,
    createdByOrg: identity.orgId,
    createdAt: new Date().toISOString(),
    payloadRef: {
      kind: 'normalized',
      source: 'occupancy',
      restaurantId,
    },
  }

  await upsert(product)
  return product
}
