import { createConnector } from './contract.js'
import { append as appendStaging } from '../storage/stagingRepo.js'
import { OccupancyIngestPayload } from '../domain/occupancy.js'

function clampPct(value) {
  const pct = Number.isFinite(value) ? value : 0
  return Math.max(0, Math.min(100, Math.round(pct)))
}

function computePctFromSeats(occupiedSeats, capacitySeats) {
  if (!capacitySeats || capacitySeats <= 0) return 0
  return (occupiedSeats / capacitySeats) * 100
}

function toIso(ts) {
  const d = new Date(ts)
  return d.toISOString()
}

export const OccupancyConnectorEvents = createConnector({
  id: 'occupancy_events_v1',
  source: 'occupancy',

  validate(input) {
    const parsed = OccupancyIngestPayload.parse(input)

    // Extra rule: occupiedSeats <= capacitySeats when both present
    parsed.signals.forEach((s, idx) => {
      if (
        s.occupiedSeats !== undefined &&
        s.capacitySeats !== undefined &&
        s.occupiedSeats > s.capacitySeats
      ) {
        throw new Error(`Signal ${idx}: occupiedSeats cannot exceed capacitySeats`)
      }
    })

    return parsed
  },

  async ingest(input, ctx = {}) {
    const payload = this.validate(input)
    const id = await appendStaging({
      source: this.source,
      orgId: ctx.orgId || null,
      receivedAt: ctx.receivedAt,
      payload,
    })
    return { stagingRecordId: id, receivedAt: ctx.receivedAt || new Date().toISOString() }
  },

  async toCanonical(input, ctx = {}) {
    const payload = this.validate(input)

    const occupancySignals = payload.signals.map((signal) => {
      const pct =
        signal.occupancyPct !== undefined
          ? signal.occupancyPct
          : computePctFromSeats(signal.occupiedSeats ?? 0, signal.capacitySeats ?? 0)

      return {
        restaurantId: payload.restaurantId,
        ts: toIso(signal.ts),
        occupancyPct: clampPct(pct),
      }
    })

    return { occupancySignals }
  },
})

export default OccupancyConnectorEvents
