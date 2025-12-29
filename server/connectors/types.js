// Shared connector types (JSDoc) for reusability across connectors

/**
 * @typedef {Object} ConnectorContext
 * @property {string} orgId - Organization identifier (tenant/owner of the connector execution).
 * @property {string[]} roles - Security/authorization roles for the current request.
 * @property {string} requestId - Trace identifier for the current request.
 * @property {string} receivedAt - ISO timestamp when the payload was received.
 */

/**
 * @typedef {Object} ConnectorIngestResult
 * @property {string} stagingRecordId - Identifier of the staging record created.
 * @property {string} receivedAt - ISO timestamp when the record was ingested.
 */

/**
 * @typedef {Object} MenuItem
 * @property {string} name
 * @property {string} [description]
 * @property {number} [price]
 * @property {string} [currency]
 * @property {boolean} [isVegan]
 * @property {boolean} [isVegetarian]
 * @property {boolean} [isGlutenFree]
 */

/**
 * @typedef {Object} OccupancySignal
 * @property {string} venueId
 * @property {number} occupancy - Percentage or absolute occupancy depending on connector semantics.
 * @property {string} observedAt - ISO timestamp when the signal was observed.
 */

/**
 * @typedef {Object} ConnectorCanonicalResult
 * @property {MenuItem[]} [menuItems]
 * @property {OccupancySignal[]} [occupancySignals]
 */

export {};
