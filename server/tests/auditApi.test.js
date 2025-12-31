import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import { handler } from '../../netlify/functions/api.js'
import { append as appendAudit } from '../storage/auditRepo.js'

const ROOT = process.cwd()
const DATA_DIR = path.join(ROOT, 'server', 'storage', 'data')

async function cleanup() {
  await fs.rm(DATA_DIR, { recursive: true, force: true })
}

describe('API: /audit/logs filters', () => {
  const prevApiKey = process.env.API_KEY

  beforeAll(() => {
    process.env.API_KEY = 'mykey'
  })

  afterAll(() => {
    process.env.API_KEY = prevApiKey
  })

  beforeEach(cleanup)

  it('supports since (ts>=since) and normalizes -mock space', async () => {
    await appendAudit({
      ts: '2025-01-01T00:00:00.000Z',
      action: 'CONSUME',
      space: 'segittur',
      productId: 'p1',
      decision: 'allow',
      reason: 'ok',
    })

    await appendAudit({
      ts: '2025-01-02T00:00:00.000Z',
      action: 'CONSUME',
      space: 'segittur',
      productId: 'p2',
      decision: 'deny',
      reason: 'not allowed',
    })

    const event = {
      httpMethod: 'GET',
      path: '/.netlify/functions/api/audit/logs',
      headers: {
        'x-api-key': 'mykey',
      },
      queryStringParameters: {
        space: 'segittur-mock',
        since: '2025-01-02T00:00:00.000Z',
      },
    }

    const res = await handler(event, { awsRequestId: 'test-req' })
    expect(res.statusCode).toBe(200)

    const payload = JSON.parse(res.body)
    expect(Array.isArray(payload.logs)).toBe(true)
    expect(payload.logs.length).toBe(1)
    expect(payload.logs[0].productId).toBe('p2')
  })

  it('returns 400 if since is invalid', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/.netlify/functions/api/audit/logs',
      headers: {
        'x-api-key': 'mykey',
      },
      queryStringParameters: {
        since: 'not-a-date',
      },
    }

    const res = await handler(event, { awsRequestId: 'test-req' })
    expect(res.statusCode).toBe(400)

    const payload = JSON.parse(res.body)
    expect(payload.error.code).toBe('validation_error')
  })
})
