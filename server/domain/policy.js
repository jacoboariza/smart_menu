import { z } from 'zod'

export const AccessPolicy = z.object({
  allowedPurposes: z.array(z.string()),
  allowedRoles: z.array(z.string()),
  retentionDays: z.number(),
  pii: z.literal(false),
})

export function validateAccessPolicy(payload) {
  return AccessPolicy.parse(payload)
}
