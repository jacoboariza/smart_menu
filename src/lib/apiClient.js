export function getApiBaseUrl() {
  const configured = import.meta.env?.VITE_API_BASE_URL
  if (configured && String(configured).trim()) return String(configured).trim()
  return '/.netlify/functions/api'
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

function buildHeaders({ apiKey, orgId, roles } = {}) {
  const headers = {}
  if (apiKey) headers['X-API-Key'] = apiKey
  if (orgId) headers['X-Org-Id'] = orgId

  if (Array.isArray(roles) && roles.length) {
    headers['X-Roles'] = roles.join(',')
  }

  return headers
}

export function health({ apiKey, orgId, roles } = {}) {
  return request('/audit/logs', { method: 'GET', headers: buildHeaders({ apiKey, orgId, roles }) })
}

export function ingestMenu(payload, { apiKey, orgId, roles } = {}) {
  return request('/ingest/menu', {
    method: 'POST',
    headers: buildHeaders({ apiKey, orgId, roles }),
    body: payload,
  })
}

export function ingestOccupancy(payload, { apiKey, orgId, roles } = {}) {
  return request('/ingest/occupancy', {
    method: 'POST',
    headers: buildHeaders({ apiKey, orgId, roles }),
    body: payload,
  })
}

export function normalizeRun({ apiKey, orgId, roles } = {}) {
  return request('/normalize/run', {
    method: 'POST',
    headers: buildHeaders({ apiKey, orgId, roles }),
    body: {},
  })
}

export function debugStaging({ apiKey, orgId, roles, source } = {}) {
  const params = new URLSearchParams()
  if (source) params.set('source', source)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return request(`/debug/staging${qs}`, {
    method: 'GET',
    headers: buildHeaders({ apiKey, orgId, roles }),
  })
}

export function debugNormalized({ apiKey, orgId, roles, type, restaurantId } = {}) {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  if (restaurantId) params.set('restaurantId', restaurantId)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return request(`/debug/normalized${qs}`, {
    method: 'GET',
    headers: buildHeaders({ apiKey, orgId, roles }),
  })
}

function mapSpace(space) {
  if (!space) return space
  if (space === 'segittur-mock') return 'segittur'
  if (space === 'gaiax-mock') return 'gaiax'
  return space
}

export function listDataProducts({ apiKey, orgId, roles, type, restaurantId } = {}) {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  if (restaurantId) params.set('restaurantId', restaurantId)
  const qs = params.toString() ? `?${params.toString()}` : ''

  return request(`/data-products${qs}`, {
    method: 'GET',
    headers: buildHeaders({ apiKey, orgId, roles }),
  })
}

export function buildDataProduct({ apiKey, orgId, roles, type, restaurantId, policyOverrides } = {}) {
  return request('/data-products/build', {
    method: 'POST',
    headers: buildHeaders({ apiKey, orgId, roles }),
    body: {
      type,
      restaurantId,
      policyOverrides,
    },
  })
}

export function publishProduct({ apiKey, orgId, roles, space, productId } = {}) {
  const mapped = mapSpace(space)
  return request(`/publish/${mapped}`, {
    method: 'POST',
    headers: buildHeaders({ apiKey, orgId, roles }),
    body: { productId },
  })
}

export function consumeProduct({ apiKey, orgId, roles, space, productId, purpose } = {}) {
  const mapped = mapSpace(space)
  return request(`/consume/${mapped}/${productId}`, {
    method: 'POST',
    headers: buildHeaders({ apiKey, orgId, roles }),
    body: { purpose },
  })
}

export function listAuditLogs({ apiKey, orgId, roles, action, productId, space, since } = {}) {
  const params = new URLSearchParams()
  if (action) params.set('action', action)
  if (productId) params.set('productId', productId)
  if (space) params.set('space', mapSpace(space))
  if (since) params.set('since', since)
  const qs = params.toString() ? `?${params.toString()}` : ''

  return request(`/audit/logs${qs}`, {
    method: 'GET',
    headers: buildHeaders({ apiKey, orgId, roles }),
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
