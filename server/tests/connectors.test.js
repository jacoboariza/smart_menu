import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import { MenuConnectorJson } from '../connectors/menuJsonConnector.js'
import { OccupancyConnectorEvents } from '../connectors/occupancyEventsConnector.js'
import { listBySource } from '../storage/stagingRepo.js'
import { upsertMenuItems, upsertOccupancySignals } from '../storage/normalizedRepo.js'

const ROOT = process.cwd()
const DATA_DIR = path.join(ROOT, 'server', 'storage', 'data')
const STAGING_FILE = path.join(DATA_DIR, 'staging.json')
const MENU_FILE = path.join(DATA_DIR, 'normalized_menu_items.json')
const OCC_FILE = path.join(DATA_DIR, 'normalized_occupancy_signals.json')

async function cleanup() {
  await fs.rm(DATA_DIR, { recursive: true, force: true })
}

async function readJson(file) {
  try {
    const txt = await fs.readFile(file, 'utf8')
    return JSON.parse(txt || '[]')
  } catch {
    return []
  }
}

const menuFixture = {
  restaurantId: 'resto-xyz',
  currency: 'EUR',
  items: [
    {
      id: 'item-1',
      name: ' Plato Especial ',
      description: ' Con algo ',
      price: 10,
      category: ' Especial ',
      allergens: ['GLUTEN', 'Frutos Secos '],
      glutenFree: false,
      vegan: false,
    },
  ],
}

const occupancyFixture = {
  restaurantId: 'resto-xyz',
  signals: [
    { ts: '2025-01-01T00:00:00Z', occupiedSeats: 25, capacitySeats: 50 },
  ],
}

describe('MenuConnectorJson', () => {
  beforeEach(cleanup)

  it('normaliza allergens a minúsculas y trim en toCanonical', async () => {
    const canonical = await MenuConnectorJson.toCanonical(menuFixture, {})
    const allergens = canonical.menuItems[0].allergens
    expect(allergens).toEqual(['gluten', 'frutos secos'])
    expect(canonical.menuItems[0].name).toBe('Plato Especial')
  })
})

describe('OccupancyConnectorEvents', () => {
  beforeEach(cleanup)

  it('calcula occupancyPct desde seats', async () => {
    const canonical = await OccupancyConnectorEvents.toCanonical(occupancyFixture, {})
    expect(canonical.occupancySignals[0].occupancyPct).toBe(50)
  })
})

describe('Integración ingest + normalize', () => {
  beforeEach(cleanup)

  it('ingiere staging y normaliza a ficheros deduplicados', async () => {
    const ctx = { orgId: 'org-1', receivedAt: '2025-01-02T00:00:00Z', roles: [] }

    // ingest menu
    const menuResult = await MenuConnectorJson.ingest(menuFixture, ctx)
    expect(menuResult.stagingRecordId).toBeTruthy()

    // ingest occupancy
    const occResult = await OccupancyConnectorEvents.ingest(occupancyFixture, ctx)
    expect(occResult.stagingRecordId).toBeTruthy()

    // normalize: leer staging y upsert canónicos
    const menuRecords = await listBySource('menu', ctx.orgId)
    const occupancyRecords = await listBySource('occupancy', ctx.orgId)

    let menuUpserts = 0
    for (const rec of menuRecords) {
      const canonical = await MenuConnectorJson.toCanonical(rec.payload, ctx)
      if (canonical.menuItems?.length) {
        menuUpserts += await upsertMenuItems(canonical.menuItems)
      }
    }

    let occUpserts = 0
    for (const rec of occupancyRecords) {
      const canonical = await OccupancyConnectorEvents.toCanonical(rec.payload, ctx)
      if (canonical.occupancySignals?.length) {
        occUpserts += await upsertOccupancySignals(canonical.occupancySignals)
      }
    }

    expect(menuUpserts).toBe(1)
    expect(occUpserts).toBe(1)

    const menuNormalized = await readJson(MENU_FILE)
    const occNormalized = await readJson(OCC_FILE)

    expect(menuNormalized).toHaveLength(1)
    expect(occNormalized).toHaveLength(1)
    expect(menuNormalized[0].id).toBe('item-1')
    expect(menuNormalized[0].allergens).toEqual(['gluten', 'frutos secos'])
    expect(occNormalized[0].occupancyPct).toBe(50)

    // dedupe check
    await upsertMenuItems(menuNormalized)
    const afterDedupeMenu = await readJson(MENU_FILE)
    expect(afterDedupeMenu).toHaveLength(1)
  })
})
