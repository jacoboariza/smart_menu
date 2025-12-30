import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildDataProduct,
  consumeProduct,
  listAuditLogs,
  listDataProducts,
  publishProduct,
} from './apiClient.js'

function mockFetchJson(payload, { ok = true, status = 200, contentType = 'application/json' } = {}) {
  globalThis.fetch = vi.fn(async () => ({
    ok,
    status,
    statusText: ok ? 'OK' : 'Bad Request',
    headers: {
      get: (k) => (k && k.toLowerCase() === 'content-type' ? contentType : null),
    },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  }))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('apiClient (data products / publish / consume / audit)', () => {
  it('listDataProducts builds query params and sends auth headers', async () => {
    mockFetchJson({ products: [] })

    await listDataProducts({ apiKey: 'k', orgId: 'o', type: 'menu', restaurantId: 'r1' })

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = globalThis.fetch.mock.calls[0]

    expect(url).toBe('/.netlify/functions/api/data-products?type=menu&restaurantId=r1')
    expect(init.method).toBe('GET')
    expect(init.headers.get('X-API-Key')).toBe('k')
    expect(init.headers.get('X-Org-Id')).toBe('o')
  })

  it('buildDataProduct posts JSON body and headers', async () => {
    mockFetchJson({ id: 'p1' })

    await buildDataProduct({
      apiKey: 'k',
      orgId: 'o',
      type: 'occupancy',
      restaurantId: 'r1',
      policyOverrides: { retentionDays: 10 },
    })

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/.netlify/functions/api/data-products/build')
    expect(init.method).toBe('POST')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({
      type: 'occupancy',
      restaurantId: 'r1',
      policyOverrides: { retentionDays: 10 },
    })
  })

  it('publishProduct maps segittur-mock to segittur in path', async () => {
    mockFetchJson({ space: 'segittur', productId: 'p1' })

    await publishProduct({ apiKey: 'k', space: 'segittur-mock', productId: 'p1' })

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/.netlify/functions/api/publish/segittur')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ productId: 'p1' })
  })

  it('consumeProduct maps gaiax-mock to gaiax and posts purpose', async () => {
    mockFetchJson({ payload: [] })

    await consumeProduct({ apiKey: 'k', space: 'gaiax-mock', productId: 'p1', purpose: 'analytics' })

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/.netlify/functions/api/consume/gaiax/p1')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ purpose: 'analytics' })
  })

  it('listAuditLogs builds query params and maps space', async () => {
    mockFetchJson({ logs: [] })

    await listAuditLogs({
      apiKey: 'k',
      action: 'PUBLISH',
      productId: 'p1',
      space: 'segittur-mock',
      since: '2025-01-01T00:00:00Z',
    })

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe(
      '/.netlify/functions/api/audit/logs?action=PUBLISH&productId=p1&space=segittur&since=2025-01-01T00%3A00%3A00Z',
    )
    expect(init.method).toBe('GET')
  })

  it('throws a structured error when API returns !ok', async () => {
    mockFetchJson({ error: { code: 'x', message: 'boom', details: { a: 1 } } }, { ok: false, status: 400 })

    await expect(listDataProducts({ apiKey: 'k' })).rejects.toMatchObject({
      status: 400,
      code: 'x',
      details: { a: 1 },
      message: 'boom',
    })
  })
})
