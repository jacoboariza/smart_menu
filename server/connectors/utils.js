// Shared utilities for connector handlers (no endpoints yet)

/**
 * Safely parse a JSON body from a Request.
 * @param {Request} req
 * @returns {Promise<any>}
 */
export async function parseJsonBody(req) {
  const text = await req.text()
  try {
    return JSON.parse(text)
  } catch (err) {
    throw new Error('Invalid JSON body')
  }
}

/**
 * Build a JSON Response with status.
 * @param {number} status
 * @param {any} body
 * @returns {Response}
 */
export function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Build a JSON error response with a standard shape.
 * @param {number} status
 * @param {string} code
 * @param {string} message
 * @param {any} [details]
 * @returns {Response}
 */
export function errorResponse(status, code, message, details) {
  const payload = { error: { code, message } }
  if (details !== undefined) payload.error.details = details
  return jsonResponse(status, payload)
}
