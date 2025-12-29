import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'server', 'storage', 'data')

function fileForSpace(space) {
  return path.join(DATA_DIR, `published_${space}_mock.json`)
}

function tmpForSpace(space) {
  return `${fileForSpace(space)}.tmp`
}

async function ensureFile(space) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const file = fileForSpace(space)
  try {
    await fs.access(file)
  } catch {
    await safeWriteJson(space, [])
  }
}

async function safeWriteJson(space, data) {
  const payload = JSON.stringify(data, null, 2)
  const tmp = tmpForSpace(space)
  const file = fileForSpace(space)
  await fs.writeFile(tmp, payload, 'utf8')
  await fs.rename(tmp, file)
}

async function loadRecords(space) {
  await ensureFile(space)
  const file = fileForSpace(space)
  const buf = await fs.readFile(file, 'utf8')
  if (!buf.trim()) return []
  try {
    const parsed = JSON.parse(buf)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Publish (upsert) a data product to a space
 * @param {string} space - e.g. 'segittur', 'gaiax'
 * @param {object} dataProduct
 * @returns {Promise<string>} product id
 */
export async function publish(space, dataProduct) {
  const records = await loadRecords(space)
  const idx = records.findIndex((r) => r.id === dataProduct.id)
  if (idx >= 0) {
    records[idx] = dataProduct
  } else {
    records.push(dataProduct)
  }
  await safeWriteJson(space, records)
  return dataProduct.id
}

/**
 * Get a published product by id in a space
 * @param {string} space
 * @param {string} productId
 * @returns {Promise<any|null>}
 */
export async function get(space, productId) {
  const records = await loadRecords(space)
  return records.find((r) => r.id === productId) || null
}

/**
 * List all published products in a space
 * @param {string} space
 * @returns {Promise<any[]>}
 */
export async function list(space) {
  return loadRecords(space)
}
