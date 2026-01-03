export function getApiBaseUrl() {
  const configured = import.meta.env?.VITE_API_BASE_URL
  if (configured && String(configured).trim()) return String(configured).trim()
  // Prefer the local Netlify dev server when running locally; fall back to relative path in prod
  if (isLocalDevHost()) return 'http://localhost:8888/.netlify/functions/api'
  return '/.netlify/functions/api'
}

function isLocalDevHost() {
  const host = typeof window !== 'undefined' ? window.location?.hostname : ''
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

function joinUrl(baseUrl, path) {
  const base = String(baseUrl).replace(/\/+$/, '')
  const p = String(path || '')
  if (!p) return base
  if (p.startsWith('/')) return `${base}${p}`
  return `${base}/${p}`
}

export async function request(path, options = {}) {
  const baseUrl = getApiBaseUrl()
  const url = joinUrl(baseUrl, path)

  const method = options.method || 'GET'
  const headers = new Headers(options.headers || {})

  let body = options.body
  if (body !== undefined && body !== null) {
    const isPlainObject = typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)

    if (isPlainObject) {
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
      body = JSON.stringify(body)
    }
  }

  let res
  try {
    res = await fetch(url, {
      method,
      headers,
      body,
    })
  } catch (cause) {
    const err = new Error('No se pudo conectar con el servidor')
    err.status = 0
    err.code = 'network_error'
    err.details = { cause }
    throw err
  }

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  let payload
  try {
    payload = isJson ? await res.json() : await res.text()
  } catch {
    payload = null
  }

  if (!res.ok) {
    const status = res.status

    const apiError = payload && typeof payload === 'object' ? payload.error : null
    const code = apiError?.code || 'request_failed'
    const message = apiError?.message || res.statusText || 'Request failed'
    const details = apiError?.details || apiError || payload

    const err = new Error(message)
    err.status = status
    err.code = code
    err.details = details
    throw err
  }

  return payload
}

function getMunicipalityDemoProfileEnabled() {
  return String(import.meta.env?.VITE_DEMO_MODE || '').trim() === 'true'
}

function safeSessionGet(key) {
  try {
    if (typeof sessionStorage === 'undefined') return null
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function resolveProfileDefaults({ apiKey, orgId, roles, profile } = {}) {
  if (profile !== 'municipality') return { apiKey, orgId, roles }

  const storedApiKey = safeSessionGet('dataHub.apiKey')
  const storedOrgId = safeSessionGet('dataHub.orgId')
  const demoApiKey = String(import.meta.env?.VITE_DEMO_API_KEY || '').trim()
  const demoOrgId = String(import.meta.env?.VITE_DEMO_ORG_ID || '').trim()
  const localDefaultKey = isLocalDevHost() ? 'key' : undefined

  // Solo aplicar defaults si demoMode está habilitado o estamos en localhost
  const shouldApplyDefaults = getMunicipalityDemoProfileEnabled() || isLocalDevHost()
  if (!shouldApplyDefaults) return { apiKey, orgId, roles }

  return {
    apiKey: apiKey || storedApiKey || demoApiKey || localDefaultKey,
    orgId: orgId || storedOrgId || demoOrgId || undefined,
    roles: Array.isArray(roles) && roles.length ? roles : ['destination'],
  }
}

export function buildHeaders({ apiKey, orgId, roles, profile } = {}) {
  const resolved = resolveProfileDefaults({ apiKey, orgId, roles, profile })
  const headers = {}
  if (resolved.apiKey) headers['X-API-Key'] = resolved.apiKey
  if (resolved.orgId) headers['X-Org-Id'] = resolved.orgId

  if (Array.isArray(resolved.roles) && resolved.roles.length) {
    headers['X-Roles'] = resolved.roles.join(',')
  }

  return headers
}

export function health({ apiKey, orgId, roles, profile } = {}) {
  return request('/audit/logs', { method: 'GET', headers: buildHeaders({ apiKey, orgId, roles, profile }) })
}

export function ingestMenu(payload, { apiKey, orgId, roles, profile } = {}) {
  return request('/ingest/menu', {
    method: 'POST',
    headers: buildHeaders({ apiKey, orgId, roles, profile }),
    body: payload,
  })
}

export function ingestOccupancy(payload, { apiKey, orgId, roles, profile } = {}) {
  return request('/ingest/occupancy', {
    method: 'POST',
    headers: buildHeaders({ apiKey, orgId, roles, profile }),
    body: payload,
  })
}

export function ingestRestaurant(payload, { apiKey, orgId, roles, profile } = {}) {
  return request('/ingest/restaurant', {
    method: 'POST',
    headers: buildHeaders({ apiKey, orgId, roles, profile }),
    body: payload,
  })
}

export function normalizeRun({ apiKey, orgId, roles, profile } = {}) {
  return request('/normalize/run', {
    method: 'POST',
    headers: buildHeaders({ apiKey, orgId, roles, profile }),
    body: {},
  })
}

export function debugStaging({ apiKey, orgId, roles, source, profile } = {}) {
  const params = new URLSearchParams()
  if (source) params.set('source', source)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return request(`/debug/staging${qs}`, {
    method: 'GET',
    headers: buildHeaders({ apiKey, orgId, roles, profile }),
  })
}

export function debugNormalized({ apiKey, orgId, roles, type, restaurantId, profile } = {}) {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  if (restaurantId) params.set('restaurantId', restaurantId)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return request(`/debug/normalized${qs}`, {
    method: 'GET',
    headers: buildHeaders({ apiKey, orgId, roles, profile }),
  })
}

function mapSpace(space) {
  if (!space) return space
  if (space === 'segittur-mock') return 'segittur'
  if (space === 'gaiax-mock') return 'gaiax'
  return space
}

export function listDataProducts({ apiKey, orgId, roles, type, restaurantId, profile } = {}) {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  if (restaurantId) params.set('restaurantId', restaurantId)
  const qs = params.toString() ? `?${params.toString()}` : ''

  return request(`/data-products${qs}`, {
    method: 'GET',
    headers: buildHeaders({ apiKey, orgId, roles, profile }),
  })
}

export function buildDataProduct({ apiKey, orgId, roles, type, restaurantId, policyOverrides, profile } = {}) {
  return request('/data-products/build', {
    method: 'POST',
    headers: buildHeaders({ apiKey, orgId, roles, profile }),
    body: {
      type,
      restaurantId,
      policyOverrides,
    },
  })
}

export function publishProduct({ apiKey, orgId, roles, space, productId, profile } = {}) {
  const mapped = mapSpace(space)
  return request(`/publish/${mapped}`, {
    method: 'POST',
    headers: buildHeaders({ apiKey, orgId, roles, profile }),
    body: { productId },
  })
}

export function consumeProduct({ apiKey, orgId, roles, space, productId, purpose, profile } = {}) {
  const mapped = mapSpace(space)
  return request(`/consume/${mapped}/${productId}`, {
    method: 'POST',
    headers: buildHeaders({ apiKey, orgId, roles, profile }),
    body: { purpose },
  })
}

export function listAuditLogs({ apiKey, orgId, roles, action, productId, space, since, profile } = {}) {
  const params = new URLSearchParams()
  if (action) params.set('action', action)
  if (productId) params.set('productId', productId)
  if (space) params.set('space', mapSpace(space))
  if (since) params.set('since', since)
  const qs = params.toString() ? `?${params.toString()}` : ''

  return request(`/audit/logs${qs}`, {
    method: 'GET',
    headers: buildHeaders({ apiKey, orgId, roles, profile }),
  })
}

export function toUserError(err) {
  if (!err) return 'Ha ocurrido un error inesperado'

  if (err.code === 'network_error') return 'No se pudo conectar con el servidor. Revisa que esté levantado y tu conexión.'
  if (err.status === 401 || err.code === 'unauthorized') return 'No autorizado. Revisa tu API key.'
  if (err.status === 403 || err.code === 'access_denied') return 'Acceso denegado. No tienes permisos para esta operación.'
  if (err.code === 'invalid_json') return 'La respuesta del servidor no es JSON válido.'

  return err.message || 'Ha ocurrido un error inesperado'
}
