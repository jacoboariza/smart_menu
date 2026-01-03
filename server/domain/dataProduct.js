import { z } from 'zod'
import { AccessPolicy } from './policy.js'

export const DataProduct = z.object({
  id: z.string().uuid(),
  type: z.enum(['menu', 'occupancy', 'restaurant']),
  version: z.string().min(1),
  schema: z.record(z.string(), z.any()),
  metadata: z.object({
    title: z.string().min(1),
    granularity: z.string().min(1),
    latency: z.string().min(1),
    restaurantId: z.string().min(1).optional(),
  }),
  policy: AccessPolicy,
  createdByOrg: z.string().min(1),
  createdAt: z.string().datetime(),
  payloadRef: z
    .object({
      kind: z.literal('normalized'),
      source: z.enum(['menu', 'occupancy', 'restaurant']),
      restaurantId: z.string().min(1),
    })
    .optional(),
})

export function validateDataProduct(payload) {
  return DataProduct.parse(payload)
}
