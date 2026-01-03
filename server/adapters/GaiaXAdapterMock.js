import { SpaceAdapter } from './SpaceAdapter.js'
import { publish as publishToRepo, get as getFromRepo } from '../storage/publishedRepo.js'
import { append as appendAudit } from '../storage/auditRepo.js'
import { evaluateAccess } from '../policy/evaluateAccess.js'
import { listMenuItems, listOccupancySignals, listRestaurants } from '../storage/normalizedRepo.js'

export class GaiaXAdapterMock extends SpaceAdapter {
  constructor() {
    super()
    this.space = 'gaiax'
  }

  async publish(space, dataProduct, actor) {
    await publishToRepo(space, dataProduct)

    await appendAudit({
      ts: new Date().toISOString(),
      actorOrg: actor.orgId,
      action: 'PUBLISH',
      space,
      productId: dataProduct.id,
    })

    return { id: dataProduct.id }
  }

  async consume(space, productId, actor, purpose) {
    const dataProduct = await getFromRepo(space, productId)

    if (!dataProduct) {
      return { denied: true, reason: 'product not found' }
    }

    const decision = evaluateAccess(dataProduct.policy, actor, purpose)

    await appendAudit({
      ts: new Date().toISOString(),
      actorOrg: actor.orgId,
      action: 'CONSUME',
      space,
      productId,
      purpose,
      decision: decision.allow ? 'allow' : 'deny',
      reason: decision.reason,
    })

    if (!decision.allow) {
      return { denied: true, reason: decision.reason }
    }

    const payload = await this.resolvePayload(dataProduct)

    return { dataProduct, payload }
  }

  async resolvePayload(dataProduct) {
    const ref = dataProduct.payloadRef
    if (!ref || ref.kind !== 'normalized') {
      return null
    }

    if (ref.source === 'menu') {
      return listMenuItems(ref.restaurantId)
    } else if (ref.source === 'occupancy') {
      return listOccupancySignals(ref.restaurantId)
    } else if (ref.source === 'restaurant') {
      const items = await listRestaurants(ref.restaurantId)
      return items && items.length ? items[items.length - 1] : null
    }

    return null
  }
}

export const gaiaXAdapter = new GaiaXAdapterMock()
