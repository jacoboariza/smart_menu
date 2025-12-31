import { describe, it, expect } from 'vitest'
import { normalizeSpace } from '../../netlify/functions/api.js'

describe('normalizeSpace', () => {
  it('maps segittur-mock to segittur', () => {
    const res = normalizeSpace('segittur-mock')
    expect(res.ok).toBe(true)
    expect(res.space).toBe('segittur')
  })

  it('maps gaiax-mock to gaiax', () => {
    const res = normalizeSpace('gaiax-mock')
    expect(res.ok).toBe(true)
    expect(res.space).toBe('gaiax')
  })

  it('rejects empty space', () => {
    const res = normalizeSpace('')
    expect(res.ok).toBe(false)
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 for unknown space', () => {
    const res = normalizeSpace('unknown-space')
    expect(res.ok).toBe(false)
    expect(res.statusCode).toBe(404)
    expect(res.error.code).toBe('space_not_found')
  })
})
