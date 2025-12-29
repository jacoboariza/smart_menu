import { createConnector } from './contract.js'
import { append as appendStaging } from '../storage/stagingRepo.js'
import { MenuIngestPayload, toCanonicalMenuItems } from '../domain/menu.js'

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : value
}

function normalizeAllergens(allergens) {
  if (!Array.isArray(allergens)) return []
  return allergens
    .map((a) => (typeof a === 'string' ? a.trim().toLowerCase() : ''))
    .filter(Boolean)
}

export const MenuConnectorJson = createConnector({
  id: 'menu_json_v1',
  source: 'menu',

  validate(input) {
    return MenuIngestPayload.parse(input)
  },

  async ingest(input, ctx = {}) {
    const payload = MenuIngestPayload.parse(input)
    const id = await appendStaging({
      source: this.source,
      orgId: ctx.orgId || null,
      receivedAt: ctx.receivedAt,
      payload,
    })
    return { stagingRecordId: id, receivedAt: ctx.receivedAt || new Date().toISOString() }
  },

  async toCanonical(input, ctx = {}) {
    const payload = MenuIngestPayload.parse(input)
    const items = toCanonicalMenuItems(payload).map((item) => ({
      ...item,
      name: normalizeString(item.name),
      description: normalizeString(item.description),
      category: normalizeString(item.category),
      allergens: normalizeAllergens(item.allergens),
    }))

    return { menuItems: items }
  },
})

export default MenuConnectorJson
