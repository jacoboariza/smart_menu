import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const DATA_DIR = path.join(process.cwd(), 'server', 'storage', 'data')
const STAGING_FILE = path.join(DATA_DIR, 'staging.json')
const TMP_FILE = `${STAGING_FILE}.tmp`

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(STAGING_FILE)
  } catch {
    await safeWriteJson([])
  }
}

async function safeWriteJson(data) {
  const payload = JSON.stringify(data, null, 2)
  await fs.writeFile(TMP_FILE, payload, 'utf8')
  await fs.rename(TMP_FILE, STAGING_FILE)
}

async function loadRecords() {
  await ensureDataFile()
  const buf = await fs.readFile(STAGING_FILE, 'utf8')
  if (!buf.trim()) return []
  try {
    const parsed = JSON.parse(buf)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

/**
 * Append a staging record.
 * @param {{source:string, orgId?:string, receivedAt?:string, payload:any}} record
 * @returns {Promise<string>} id
 */
export async function append(record) {
  const records = await loadRecords()
  const id = record.id || randomUUID()
  const receivedAt = record.receivedAt || new Date().toISOString()
  const entry = {
    id,
    source: record.source,
    orgId: record.orgId || null,
    receivedAt,
    payload: record.payload,
  }
  records.push(entry)
  await safeWriteJson(records)
  return id
}

/**
 * List records by source (and optionally orgId)
 * @param {string} source
 * @param {string} [orgId]
 * @returns {Promise<any[]>}
 */
export async function listBySource(source, orgId) {
  const records = await loadRecords()
  return records.filter((r) => r.source === source && (orgId ? r.orgId === orgId : true))
}

/**
 * Get a record by id
 * @param {string} id
 * @returns {Promise<any|null>}
 */
export async function getById(id) {
  const records = await loadRecords()
  return records.find((r) => r.id === id) || null
}
