import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'server', 'storage', 'data')
const MENU_FILE = path.join(DATA_DIR, 'normalized_menu_items.json')
const OCC_FILE = path.join(DATA_DIR, 'normalized_occupancy_signals.json')
const TMP_MENU = `${MENU_FILE}.tmp`
const TMP_OCC = `${OCC_FILE}.tmp`

async function ensureFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  for (const file of [MENU_FILE, OCC_FILE]) {
    try {
      await fs.access(file)
    } catch {
      await fs.writeFile(file, '[]', 'utf8')
    }
  }
}

async function safeWrite(file, tmp, data) {
  const payload = JSON.stringify(data, null, 2)
  await fs.writeFile(tmp, payload, 'utf8')
  await fs.rename(tmp, file)
}

async function loadJson(file) {
  await ensureFiles()
  const txt = await fs.readFile(file, 'utf8')
  if (!txt.trim()) return []
  try {
    const parsed = JSON.parse(txt)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Upsert menu items deduping by (restaurantId, id)
 * @param {Array} items
 * @returns {Promise<number>} number of upserted (new or replaced)
 */
export async function upsertMenuItems(items) {
  const current = await loadJson(MENU_FILE)
  const key = (it) => `${it.restaurantId}::${it.id}`
  const map = new Map(current.map((it) => [key(it), it]))

  let upserted = 0
  for (const item of items) {
    const k = key(item)
    const existed = map.has(k)
    map.set(k, item)
    if (!existed) upserted += 1
    else upserted += 1 // replaced counts as upsert
  }

  const next = Array.from(map.values())
  await safeWrite(MENU_FILE, TMP_MENU, next)
  return upserted
}

/**
 * Upsert occupancy signals deduping by (restaurantId, ts)
 * @param {Array} signals
 * @returns {Promise<number>} number of upserted (new or replaced)
 */
export async function upsertOccupancySignals(signals) {
  const current = await loadJson(OCC_FILE)
  const key = (s) => `${s.restaurantId}::${s.ts}`
  const map = new Map(current.map((s) => [key(s), s]))

  let upserted = 0
  for (const signal of signals) {
    const k = key(signal)
    const existed = map.has(k)
    map.set(k, signal)
    if (!existed) upserted += 1
    else upserted += 1
  }

  const next = Array.from(map.values())
  await safeWrite(OCC_FILE, TMP_OCC, next)
  return upserted
}
