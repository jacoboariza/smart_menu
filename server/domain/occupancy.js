import { z } from 'zod'

// Ingest payload schema for occupancy signals
export const OccupancyIngestPayload = z.object({
  restaurantId: z.string().min(1),
  signals: z
    .array(
      z.object({
        ts: z.string().datetime(),
        occupancyPct: z.number().min(0).max(100).optional(),
        occupiedSeats: z.number().int().nonnegative().optional(),
        capacitySeats: z.number().int().positive().optional(),
      })
    )
    .min(1)
    .superRefine((arr, ctx) => {
      arr.forEach((signal, idx) => {
        const hasPct = signal.occupancyPct !== undefined
        const hasSeats = signal.occupiedSeats !== undefined || signal.capacitySeats !== undefined
        if (!hasPct && !hasSeats) {
          ctx.addIssue({
            code: 'custom',
            message: 'Debe venir occupancyPct o pair occupiedSeats+capacitySeats',
            path: [idx],
          })
        }
        if (hasSeats) {
          if (signal.occupiedSeats === undefined || signal.capacitySeats === undefined) {
            ctx.addIssue({
              code: 'custom',
              message: 'occupiedSeats y capacitySeats deben venir juntos',
              path: [idx],
            })
          }
        }
      })
    }),
})

// Canonical occupancy signal
export const OccupancySignal = z.object({
  restaurantId: z.string().min(1),
  ts: z.string().datetime(),
  occupancyPct: z.number().min(0).max(100),
})

export const OccupancySignals = z.array(OccupancySignal)

export function validateOccupancyIngest(payload) {
  return OccupancyIngestPayload.parse(payload)
}

export function toCanonicalOccupancySignals(payload) {
  const validated = OccupancyIngestPayload.parse(payload)
  return validated.signals.map((signal) => {
    let pct = signal.occupancyPct
    if (pct === undefined && signal.occupiedSeats !== undefined && signal.capacitySeats !== undefined) {
      pct = (signal.occupiedSeats / signal.capacitySeats) * 100
    }

    return {
      restaurantId: validated.restaurantId,
      ts: signal.ts,
      occupancyPct: Math.max(0, Math.min(100, Number(pct?.toFixed ? pct.toFixed(2) : pct))),
    }
  })
}
