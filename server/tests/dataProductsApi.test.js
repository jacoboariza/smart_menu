import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import { handler } from '../../netlify/functions/api.js'
import { upsertMenuItems } from '../storage/normalizedRepo.js'

const ROOT = process.cwd()
const DATA_DIR = path.join(ROOT, 'server', 'storage', 'data')

async function cleanup() {
  await fs.rm(DATA_DIR, { recursive: true, force: true })
}

describe('API: /data-products', () => {
  const prevApiKey = process.env.API_KEY

  beforeAll(() => {
    process.env.API_KEY = 'mykey'
  })

  afterAll(() => {
    process.env.API_KEY = prevApiKey
  })

  beforeEach(cleanup)

  it('POST /data-products/build returns an id and then GET /data-products lists it', async () => {
    await upsertMenuItems([
      {
        restaurantId: 'resto-api',
        id: 'item-api-1',
        name: 'Dish API',
        description: 'Test dish',
        price: 10,
        currency: 'EUR',
        category: 'Main',
        allergens: ['gluten'],
        glutenFree: false,
        vegan: true,
      },
    ])

    const buildEvent = {
      httpMethod: 'POST',
      path: '/.netlify/functions/api/data-products/build',
      headers: {
        'x-api-key': 'mykey',
        'x-org-id': 'org-api',
        'x-roles': 'restaurant',
      },
      body: JSON.stringify({ type: 'menu', restaurantId: 'resto-api' }),
    }

    const ctx = { awsRequestId: 'test-req' }

    const buildRes = await handler(buildEvent, ctx)
    expect(buildRes.statusCode).toBe(200)

    const builtProduct = JSON.parse(buildRes.body)
    expect(builtProduct.id).toBeTruthy()
    expect(builtProduct.type).toBe('menu')

    const listEvent = {
      httpMethod: 'GET',
      path: '/.netlify/functions/api/data-products',
      headers: {
        'x-api-key': 'mykey',
        'x-org-id': 'org-api',
      },
      queryStringParameters: {
        type: 'menu',
        restaurantId: 'resto-api',
      },
    }

    const listRes = await handler(listEvent, ctx)
    expect(listRes.statusCode).toBe(200)

    const listed = JSON.parse(listRes.body)
    expect(Array.isArray(listed.products)).toBe(true)
    expect(listed.products.length).toBeGreaterThanOrEqual(1)
    expect(listed.products.some((p) => p.id === builtProduct.id)).toBe(true)
  })
})
