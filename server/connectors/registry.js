import { MenuConnectorJson } from './menuJsonConnector.js'
import { OccupancyConnectorEvents } from './occupancyEventsConnector.js'
import { RestaurantConnectorProfile } from './restaurantConnector.js'

export const CONNECTORS = [MenuConnectorJson, OccupancyConnectorEvents, RestaurantConnectorProfile]

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
