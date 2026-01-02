import { request } from '../apiClient.js'

/**
 * Get municipality catalog (restaurants with menu data)
 * @param {string} space - Data space (e.g., 'segittur-mock', 'gaiax-mock')
 * @returns {Promise<Array>} List of restaurants with simplified data
 */
export async function getMunicipalCatalog(space) {
  const params = new URLSearchParams({ space })
  const response = await request(`/municipality/catalog?${params.toString()}`)
  
  const items = Array.isArray(response?.items) ? response.items : []
  
  return items.map((item) => ({
    restaurantId: String(item?.restaurantId || ''),
    name: String(item?.name || ''),
    glutenFree: Boolean(item?.glutenFree),
    allergens: Array.isArray(item?.allergens) ? item.allergens.map(String) : [],
    updatedAt: item?.updatedAt ? String(item.updatedAt) : null,
  }))
}

/**
 * Get municipality occupancy data (latest occupancy signals per restaurant)
 * @param {string} space - Data space (e.g., 'segittur-mock', 'gaiax-mock')
 * @returns {Promise<Array>} List of occupancy data per restaurant
 */
export async function getMunicipalOccupancy(space) {
  const params = new URLSearchParams({ space })
  const response = await request(`/municipality/occupancy?${params.toString()}`)
  
  const items = Array.isArray(response?.items) ? response.items : []
  
  return items.map((item) => ({
    restaurantId: String(item?.restaurantId || ''),
    level: String(item?.level || ''),
    ts: item?.ts ? String(item.ts) : null,
  }))
}

/**
 * Get municipality KPIs (key performance indicators)
 * @param {string} space - Data space (e.g., 'segittur-mock', 'gaiax-mock')
 * @returns {Promise<Object>} KPI data with counts and metrics
 */
export async function getMunicipalKpis(space) {
  const params = new URLSearchParams({ space })
  const response = await request(`/municipality/kpis?${params.toString()}`)
  
  return {
    restaurantsPublished: Number(response?.restaurantsPublished || 0),
    menusWithAllergens: Number(response?.menusWithAllergens || 0),
    consumesLast7Days: {
      allow: Number(response?.consumesLast7Days?.allow || 0),
      deny: Number(response?.consumesLast7Days?.deny || 0),
    },
  }
}
