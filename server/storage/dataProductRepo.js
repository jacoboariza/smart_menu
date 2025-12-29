import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'server', 'storage', 'data')
const FILE = path.join(DATA_DIR, 'data_products.json')
const TMP_FILE = `${FILE}.tmp`

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(FILE)
  } catch {
    await safeWriteJson([])
  }
}

async function safeWriteJson(data) {
  const payload = JSON.stringify(data, null, 2)
  await fs.writeFile(TMP_FILE, payload, 'utf8')
  await fs.rename(TMP_FILE, FILE)
}

async function loadRecords() {
  await ensureFile()
  const buf = await fs.readFile(FILE, 'utf8')
  if (!buf.trim()) return []
  try {
    const parsed = JSON.parse(buf)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * List all data products
 * @returns {Promise<any[]>}
 */
export async function list() {
  return loadRecords()
}

/**
 * Get a data product by id
 * @param {string} id
 * @returns {Promise<any|null>}
 */
export async function getById(id) {
  const records = await loadRecords()
  return records.find((r) => r.id === id) || null
}

/**
 * Upsert a data product (insert or replace by id)
 * @param {object} product
 * @returns {Promise<string>} id
 */
export async function upsert(product) {
  const records = await loadRecords()
  const idx = records.findIndex((r) => r.id === product.id)
  if (idx >= 0) {
    records[idx] = product
  } else {
    records.push(product)
  }
  await safeWriteJson(records)
  return product.id
}
