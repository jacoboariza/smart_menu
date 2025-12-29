import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import { MenuConnectorJson } from '../connectors/menuJsonConnector.js'
import { OccupancyConnectorEvents } from '../connectors/occupancyEventsConnector.js'
import { upsertMenuItems, upsertOccupancySignals } from '../storage/normalizedRepo.js'
import { buildMenuProduct } from '../products/buildMenuProduct.js'
import { segitturAdapter } from '../adapters/SegitturAdapterMock.js'
import { list as listAudit } from '../storage/auditRepo.js'

const ROOT = process.cwd()
const DATA_DIR = path.join(ROOT, 'server', 'storage', 'data')

async function cleanup() {
  await fs.rm(DATA_DIR, { recursive: true, force: true })
}

const menuFixture = {
  restaurantId: 'resto-e2e',
  currency: 'EUR',
  items: [
    {
      id: 'item-e2e-1',
      name: 'E2E Dish',
      description: 'Test dish',
      price: 15,
      category: 'Main',
      allergens: ['gluten'],
      glutenFree: false,
      vegan: true,
    },
  ],
}

const occupancyFixture = {
  restaurantId: 'resto-e2e',
  signals: [
    { ts: '2025-01-01T12:00:00Z', occupiedSeats: 30, capacitySeats: 100 },
  ],
}

const identity = {
  orgId: 'org-e2e',
  roles: ['destination'],
}

describe('E2E: Data Product Flow', () => {
  beforeEach(cleanup)

  it('full flow: ingest → normalize → build → publish → consume (allow) → consume (deny) → audit', async () => {
    const ctx = { orgId: 'org-e2e', receivedAt: new Date().toISOString(), roles: [] }

    // 1. Ingest menu
    const menuResult = await MenuConnectorJson.ingest(menuFixture, ctx)
    expect(menuResult.stagingRecordId).toBeTruthy()

    // 2. Ingest occupancy
    const occResult = await OccupancyConnectorEvents.ingest(occupancyFixture, ctx)
    expect(occResult.stagingRecordId).toBeTruthy()

    // 3. Normalize menu
    const menuCanonical = await MenuConnectorJson.toCanonical(menuFixture, ctx)
    await upsertMenuItems(menuCanonical.menuItems)

    // 4. Normalize occupancy
    const occCanonical = await OccupancyConnectorEvents.toCanonical(occupancyFixture, ctx)
    await upsertOccupancySignals(occCanonical.occupancySignals)

    // 5. Build menu data product
    const dataProduct = await buildMenuProduct({
      restaurantId: 'resto-e2e',
      identity,
    })
    expect(dataProduct.id).toBeTruthy()
    expect(dataProduct.type).toBe('menu')
    expect(dataProduct.policy.pii).toBe(false)

    // 6. Publish to segittur
    const publishResult = await segitturAdapter.publish('segittur', dataProduct, identity)
    expect(publishResult.id).toBe(dataProduct.id)

    // 7. Consume with allowed purpose (analytics is in default allowedPurposes)
    const consumeAllow = await segitturAdapter.consume('segittur', dataProduct.id, identity, 'analytics')
    expect(consumeAllow.denied).toBeUndefined()
    expect(consumeAllow.dataProduct).toBeTruthy()
    expect(consumeAllow.payload).toBeInstanceOf(Array)
    expect(consumeAllow.payload.length).toBeGreaterThan(0)

    // 8. Consume with invalid purpose
    const consumeDeny = await segitturAdapter.consume('segittur', dataProduct.id, identity, 'marketing')
    expect(consumeDeny.denied).toBe(true)
    expect(consumeDeny.reason).toContain('not allowed')

    // 9. Check audit logs contain PUBLISH and CONSUME
    const auditLogs = await listAudit({})
    const actions = auditLogs.map((log) => log.action)
    expect(actions).toContain('PUBLISH')
    expect(actions).toContain('CONSUME')

    // Check we have both allow and deny decisions
    const decisions = auditLogs.filter((l) => l.action === 'CONSUME').map((l) => l.decision)
    expect(decisions).toContain('allow')
    expect(decisions).toContain('deny')
  })
})
