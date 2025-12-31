import { getConnectorBySource } from '../../server/connectors/registry.js'
import { listBySource } from '../../server/storage/stagingRepo.js'
import {
  upsertMenuItems,
  upsertOccupancySignals,
  listMenuItems,
  listOccupancySignals,
} from '../../server/storage/normalizedRepo.js'
import { getById as getDataProduct } from '../../server/storage/dataProductRepo.js'
import { list as listAudit } from '../../server/storage/auditRepo.js'
import { segitturAdapter } from '../../server/adapters/SegitturAdapterMock.js'
import { gaiaXAdapter } from '../../server/adapters/GaiaXAdapterMock.js'

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

function parsePublishSpace(path) {
  const normalized = path.replace(/\/*$/, '')
  const parts = normalized.split('/')
  const idx = parts.indexOf('publish')
  if (idx === -1 || !parts[idx + 1]) return null
  return parts[idx + 1]
}

function parseConsumeParams(path) {
  const normalized = path.replace(/\/*$/, '')
  const parts = normalized.split('/')
  const idx = parts.indexOf('consume')
  if (idx === -1 || !parts[idx + 1] || !parts[idx + 2]) return null
  return { space: parts[idx + 1], productId: parts[idx + 2] }
}

function isAuditLogs(path) {
  const normalized = path.replace(/\/*$/, '')
  return normalized.endsWith('/audit/logs') || normalized.includes('/audit/logs')
}

export function normalizeSpace(space) {
  if (typeof space !== 'string') {
    return { ok: false, statusCode: 400, error: { code: 'invalid_space', message: 'space must be a string' } }
  }

  const normalized = space.trim().toLowerCase()
  if (!normalized) {
    return { ok: false, statusCode: 400, error: { code: 'invalid_space', message: 'space must be a non-empty string' } }
  }

  if (normalized === 'segittur' || normalized === 'segittur-mock') {
    return { ok: true, space: 'segittur' }
  }
  if (normalized === 'gaiax' || normalized === 'gaiax-mock') {
    return { ok: true, space: 'gaiax' }
  }

  return {
    ok: false,
    statusCode: 404,
    error: {
      code: 'space_not_found',
      message: `Space '${space}' not supported`,
    },
  }
}

function getAdapterForSpace(space) {
  if (space === 'segittur') return segitturAdapter
  if (space === 'gaiax') return gaiaXAdapter
  return null
}

function isNormalizeRun(path) {
  const normalized = path.replace(/\/*$/, '')
  return normalized.endsWith('/normalize/run') || normalized.includes('/normalize/run')
}

function isDebugStaging(path) {
  const normalized = path.replace(/\/*$/, '')
  return normalized.endsWith('/debug/staging') || normalized.includes('/debug/staging')
}

function isDebugNormalized(path) {
  const normalized = path.replace(/\/*$/, '')
  return normalized.endsWith('/debug/normalized') || normalized.includes('/debug/normalized')
}

export async function handler(event, context) {
  const method = event.httpMethod
  const path = event.path || ''

  // GET endpoints
  if (method === 'GET') {
    if (!requireAuth(event)) {
      return buildResponse(401, { error: { code: 'unauthorized', message: 'Missing or invalid API key' } })
    }

    const orgId = event.headers?.['x-org-id'] || event.headers?.['X-Org-Id'] || null

    // GET /audit/logs
    if (isAuditLogs(path)) {
      try {
        const params = event.queryStringParameters || {}
        const filters = {}
        if (params.action) filters.action = params.action
        if (params.productId) filters.productId = params.productId
        if (params.space) {
          const normalizedSpace = normalizeSpace(params.space)
          if (!normalizedSpace.ok) {
            return buildResponse(normalizedSpace.statusCode, { error: normalizedSpace.error })
          }
          filters.space = normalizedSpace.space
        }
        if (params.since) filters.since = params.since

        const logs = await listAudit(filters)
        return buildResponse(200, { logs })
      } catch (err) {
        return buildResponse(500, { error: { code: 'audit_error', message: err.message } })
      }
    }

    // GET /debug/staging?source=menu|occupancy
    if (isDebugStaging(path)) {
      try {
        const params = event.queryStringParameters || {}
        const source = params.source
        if (source !== 'menu' && source !== 'occupancy') {
          return buildResponse(400, {
            error: {
              code: 'invalid_source',
              message: "source must be 'menu' or 'occupancy'",
            },
          })
        }

        const records = await listBySource(source, orgId || undefined)
        return buildResponse(200, { source, count: records.length, items: records })
      } catch (err) {
        return buildResponse(500, { error: { code: 'debug_error', message: err.message } })
      }
    }

    // GET /debug/normalized?type=menu|occupancy
    if (isDebugNormalized(path)) {
      try {
        const params = event.queryStringParameters || {}
        const type = params.type
        if (type !== 'menu' && type !== 'occupancy') {
          return buildResponse(400, {
            error: {
              code: 'invalid_type',
              message: "type must be 'menu' or 'occupancy'",
            },
          })
        }

        const items = type === 'menu'
          ? await listMenuItems(params.restaurantId || undefined)
          : await listOccupancySignals(params.restaurantId || undefined)

        return buildResponse(200, { type, count: items.length, items })
      } catch (err) {
        return buildResponse(500, { error: { code: 'debug_error', message: err.message } })
      }
    }

    return buildResponse(404, { error: { code: 'not_found', message: 'Endpoint not found' } })
  }

  // POST endpoints
  if (method !== 'POST') {
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

  // Parse body for POST endpoints
  let body
  try {
    body = event.body ? JSON.parse(event.body) : {}
  } catch (err) {
    return buildResponse(400, { error: { code: 'invalid_json', message: 'Invalid JSON body' } })
  }

  // Parse roles from header
  const rolesHeader = event.headers?.['x-roles'] || event.headers?.['X-Roles'] || ''
  const roles = rolesHeader ? rolesHeader.split(',').map((r) => r.trim()) : []
  const actor = { orgId: orgId || 'anonymous', roles }

  // POST /publish/:space
  const publishSpace = parsePublishSpace(path)
  if (publishSpace) {
    const normalizedSpace = normalizeSpace(publishSpace)
    if (!normalizedSpace.ok) {
      return buildResponse(normalizedSpace.statusCode, { error: normalizedSpace.error })
    }

    const adapter = getAdapterForSpace(normalizedSpace.space)
    if (!adapter) {
      return buildResponse(404, { error: { code: 'space_not_found', message: `Space '${normalizedSpace.space}' not supported` } })
    }

    const { productId } = body
    if (!productId) {
      return buildResponse(400, { error: { code: 'missing_product_id', message: 'productId required' } })
    }

    try {
      const dataProduct = await getDataProduct(productId)
      if (!dataProduct) {
        return buildResponse(404, { error: { code: 'product_not_found', message: 'Data product not found' } })
      }

      const result = await adapter.publish(normalizedSpace.space, dataProduct, actor)
      return buildResponse(200, { space: normalizedSpace.space, productId: result.id })
    } catch (err) {
      return buildResponse(500, { error: { code: 'publish_error', message: err.message } })
    }
  }

  // POST /consume/:space/:productId
  const consumeParams = parseConsumeParams(path)
  if (consumeParams) {
    const { space, productId } = consumeParams
    const normalizedSpace = normalizeSpace(space)
    if (!normalizedSpace.ok) {
      return buildResponse(normalizedSpace.statusCode, { error: normalizedSpace.error })
    }

    const adapter = getAdapterForSpace(normalizedSpace.space)
    if (!adapter) {
      return buildResponse(404, { error: { code: 'space_not_found', message: `Space '${normalizedSpace.space}' not supported` } })
    }

    const { purpose } = body
    if (!purpose) {
      return buildResponse(400, { error: { code: 'missing_purpose', message: 'purpose required' } })
    }

    try {
      const result = await adapter.consume(normalizedSpace.space, productId, actor, purpose)

      if (result.denied) {
        return buildResponse(403, { error: { code: 'access_denied', message: result.reason } })
      }

      return buildResponse(200, { dataProduct: result.dataProduct, payload: result.payload })
    } catch (err) {
      return buildResponse(500, { error: { code: 'consume_error', message: err.message } })
    }
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
