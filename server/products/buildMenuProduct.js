import { randomUUID } from 'crypto'
import { listMenuItems } from '../storage/normalizedRepo.js'
import { upsert } from '../storage/dataProductRepo.js'

const DEFAULT_POLICY = {
  allowedPurposes: ['discovery', 'recommendation', 'analytics'],
  allowedRoles: ['destination', 'marketplace', 'restaurant'],
  retentionDays: 30,
  pii: false,
}

const MENU_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    restaurantId: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    price: { type: 'number' },
    currency: { type: 'string' },
    category: { type: 'string' },
    allergens: { type: 'array', items: { type: 'string' } },
    glutenFree: { type: 'boolean' },
    vegan: { type: 'boolean' },
  },
}

/**
 * Build a menu DataProduct from normalized menu items
 * @param {object} opts
 * @param {string} opts.restaurantId
 * @param {object} opts.identity - { orgId: string, roles: string[] }
 * @param {object} [opts.policyOverrides]
 * @returns {Promise<object>} The created/updated DataProduct
 */
export async function buildMenuProduct({ restaurantId, identity, policyOverrides }) {
  const items = await listMenuItems(restaurantId)

  const policy = {
    ...DEFAULT_POLICY,
    ...policyOverrides,
    pii: false, // Always enforce pii:false
  }

  const product = {
    id: randomUUID(),
    type: 'menu',
    version: 'v1',
    schema: MENU_SCHEMA,
    metadata: {
      title: `Menu for ${restaurantId}`,
      granularity: 'daily',
      latency: '1h',
      restaurantId,
    },
    policy,
    createdByOrg: identity.orgId,
    createdAt: new Date().toISOString(),
    payloadRef: {
      kind: 'normalized',
      source: 'menu',
      restaurantId,
    },
  }

  await upsert(product)
  return product
}
