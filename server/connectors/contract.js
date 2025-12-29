// Connector contract helpers
// Provides a minimal factory to enforce required methods and metadata.

/**
 * @typedef {import('./types.js').ConnectorContext} ConnectorContext
 * @typedef {import('./types.js').ConnectorIngestResult} ConnectorIngestResult
 * @typedef {import('./types.js').ConnectorCanonicalResult} ConnectorCanonicalResult
 */

/**
 * @typedef {Object} Connector
 * @property {string} id - Unique connector identifier.
 * @property {string} source - Human/machine label for the data source (e.g., "segittur", "opentable").
 * @property {(input: any) => Promise<void> | void} validate - Lightweight input validation; throws on error.
 * @property {(input: any, ctx: ConnectorContext) => Promise<ConnectorIngestResult>} ingest - Stores raw payload and returns staging info.
 * @property {(input: any, ctx: ConnectorContext) => Promise<ConnectorCanonicalResult>} toCanonical - Maps payload to canonical domain objects.
 */

/**
 * Create a connector ensuring required surface is present.
 * @param {Connector} spec
 * @returns {Connector}
 */
export function createConnector(spec) {
  const required = ['id', 'source', 'validate', 'ingest', 'toCanonical']

  for (const key of required) {
    if (spec[key] === undefined || spec[key] === null) {
      throw new Error(`Connector missing required property: ${key}`)
    }
  }

  if (typeof spec.id !== 'string' || !spec.id.trim()) {
    throw new Error('Connector id must be a non-empty string')
  }
  if (typeof spec.source !== 'string' || !spec.source.trim()) {
    throw new Error('Connector source must be a non-empty string')
  }
  if (typeof spec.validate !== 'function') {
    throw new Error('Connector validate must be a function')
  }
  if (typeof spec.ingest !== 'function') {
    throw new Error('Connector ingest must be a function')
  }
  if (typeof spec.toCanonical !== 'function') {
    throw new Error('Connector toCanonical must be a function')
  }

  return spec
}
