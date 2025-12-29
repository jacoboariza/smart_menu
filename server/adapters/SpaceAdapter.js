/**
 * SpaceAdapter interface (by convention)
 * Implementations must provide:
 * - publish(space, dataProduct, actor) → Promise<{id}>
 * - consume(space, productId, actor, purpose) → Promise<{dataProduct, payload}|{denied, reason}>
 */

export class SpaceAdapter {
  /**
   * Publish a data product to a space
   * @param {string} space
   * @param {object} dataProduct
   * @param {object} actor - { orgId, roles }
   * @returns {Promise<{id: string}>}
   */
  async publish(space, dataProduct, actor) {
    throw new Error('publish() not implemented')
  }

  /**
   * Consume a data product from a space
   * @param {string} space
   * @param {string} productId
   * @param {object} actor - { orgId, roles }
   * @param {string} purpose
   * @returns {Promise<{dataProduct, payload}|{denied: true, reason: string}>}
   */
  async consume(space, productId, actor, purpose) {
    throw new Error('consume() not implemented')
  }
}
