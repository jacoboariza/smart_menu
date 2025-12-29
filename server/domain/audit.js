import { z } from 'zod'

export const AuditEvent = z.object({
  ts: z.string().datetime(),
  actorOrg: z.string().min(1),
  action: z.string().min(1),
  space: z.string().min(1).optional(),
  productId: z.string().uuid().optional(),
  purpose: z.string().min(1).optional(),
  decision: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
})

export const AuditEvents = z.array(AuditEvent)

export function validateAuditEvent(payload) {
  return AuditEvent.parse(payload)
}
