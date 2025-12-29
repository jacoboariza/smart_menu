import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'server', 'storage', 'data')
const FILE = path.join(DATA_DIR, 'audit.json')
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
 * Append an audit event
 * @param {object} event - AuditEvent shape
 * @returns {Promise<void>}
 */
export async function append(event) {
  const records = await loadRecords()
  records.push(event)
  await safeWriteJson(records)
}

/**
 * List audit events with optional filters
 * @param {object} [filters]
 * @param {string} [filters.action]
 * @param {string} [filters.productId]
 * @param {string} [filters.space]
 * @param {string} [filters.since] - ISO date string; events with ts >= since
 * @returns {Promise<any[]>}
 */
export async function list(filters = {}) {
  let records = await loadRecords()

  if (filters.action) {
    records = records.filter((r) => r.action === filters.action)
  }
  if (filters.productId) {
    records = records.filter((r) => r.productId === filters.productId)
  }
  if (filters.space) {
    records = records.filter((r) => r.space === filters.space)
  }
  if (filters.since) {
    records = records.filter((r) => r.ts >= filters.since)
  }

  return records
}
