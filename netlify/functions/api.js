import { getConnectorBySource } from '../../server/connectors/registry.js'
import { listBySource } from '../../server/storage/stagingRepo.js'
import {
  upsertMenuItems,
  upsertOccupancySignals,
} from '../../server/storage/normalizedRepo.js'

function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

function getApiKey(event) {
  const headers = event.headers || {}
  return headers['x-api-key'] || headers['X-API-Key'] || headers['x-api-key']
}

function requireAuth(event) {
  const configuredKey = process.env.API_KEY || process.env.INGEST_API_KEY
  const provided = getApiKey(event)
  if (!configuredKey || configuredKey !== provided) {
    return false
  }
  return true
}

function parseSource(path) {
  const normalized = path.replace(/\/*$/, '')
  const parts = normalized.split('/')
  const idx = parts.indexOf('ingest')
  if (idx === -1 || !parts[idx + 1]) return null
  return parts[idx + 1]
}

function isNormalizeRun(path) {
  const normalized = path.replace(/\/*$/, '')
  return normalized.endsWith('/normalize/run') || normalized.includes('/normalize/run')
}

export async function handler(event, context) {
  const isPost = event.httpMethod === 'POST'
  if (!isPost) {
    return buildResponse(405, { error: { code: 'method_not_allowed', message: 'Method not allowed' } })
  }

  if (!requireAuth(event)) {
    return buildResponse(401, { error: { code: 'unauthorized', message: 'Missing or invalid API key' } })
  }

  const orgId = event.headers?.['x-org-id'] || event.headers?.['X-Org-Id'] || null
  const baseCtx = {
    orgId,
    requestId: context.awsRequestId || context.invokedFunctionArn || null,
    receivedAt: new Date().toISOString(),
    roles: [],
  }

  // Normalize endpoint
  if (isNormalizeRun(event.path || '')) {
    try {
      const menuRecords = await listBySource('menu', orgId || undefined)
      const occupancyRecords = await listBySource('occupancy', orgId || undefined)

      let processed = 0
      let menuItemsUpserted = 0
      let occupancySignalsUpserted = 0

      if (menuRecords.length) {
        const connector = getConnectorBySource('menu')
        for (const rec of menuRecords) {
          const canonical = await connector.toCanonical(rec.payload, baseCtx)
          if (canonical.menuItems?.length) {
            const added = await upsertMenuItems(canonical.menuItems)
            menuItemsUpserted += added
          }
          processed += 1
        }
      }

      if (occupancyRecords.length) {
        const connector = getConnectorBySource('occupancy')
        for (const rec of occupancyRecords) {
          const canonical = await connector.toCanonical(rec.payload, baseCtx)
          if (canonical.occupancySignals?.length) {
            const added = await upsertOccupancySignals(canonical.occupancySignals)
            occupancySignalsUpserted += added
          }
          processed += 1
        }
      }

      return buildResponse(200, { processed, menuItemsUpserted, occupancySignalsUpserted })
    } catch (err) {
      return buildResponse(500, { error: { code: 'normalize_error', message: err.message || 'Normalization failed' } })
    }
  }

  // Ingest endpoint
  const source = parseSource(event.path || '')
  if (!source) {
    return buildResponse(404, { error: { code: 'not_found', message: 'Source not provided' } })
  }

  let connector
  try {
    connector = getConnectorBySource(source)
  } catch (err) {
    return buildResponse(404, { error: { code: 'connector_not_found', message: err.message } })
  }

  let body
  try {
    body = event.body ? JSON.parse(event.body) : {}
  } catch (err) {
    return buildResponse(400, { error: { code: 'invalid_json', message: 'Invalid JSON body' } })
  }

  try {
    connector.validate(body)
  } catch (err) {
    return buildResponse(400, { error: { code: 'validation_error', message: err.message } })
  }

  try {
    const result = await connector.ingest(body, baseCtx)
    return buildResponse(201, {
      source: connector.source,
      stagingRecordId: result.stagingRecordId,
      receivedAt: result.receivedAt,
    })
  } catch (err) {
    return buildResponse(500, { error: { code: 'ingest_error', message: err.message || 'Ingest failed' } })
  }
}
