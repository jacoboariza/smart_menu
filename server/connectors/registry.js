import { MenuConnectorJson } from './menuJsonConnector.js'
import { OccupancyConnectorEvents } from './occupancyEventsConnector.js'

export const CONNECTORS = [MenuConnectorJson, OccupancyConnectorEvents]

const bySource = new Map(CONNECTORS.map((c) => [c.source, c]))

/**
 * Resolve connector by source.
 * @param {string} source
 * @returns {import('./contract.js').Connector}
 */
export function getConnectorBySource(source) {
  const connector = bySource.get(source)
  if (!connector) {
    throw new Error(`No connector registered for source: ${source}`)
  }
  return connector
}
