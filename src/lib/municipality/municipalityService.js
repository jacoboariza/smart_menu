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
    menuItems: Array.isArray(item?.menuItems) ? item.menuItems.map((mi) => ({
      name: String(mi?.name || ''),
      description: String(mi?.description || ''),
      glutenFree: Boolean(mi?.glutenFree),
      vegan: Boolean(mi?.vegan),
      category: String(mi?.category || ''),
    })) : [],
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

/**
 * Normalize text for search (lowercase, remove accents)
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Search restaurants by dish name/description with filters
 * @param {Object} params
 * @param {Array} params.catalog - Restaurant catalog from getMunicipalCatalog
 * @param {string} params.query - Search query for dish name/description/category
 * @param {boolean} params.glutenFreeOnly - Filter to only gluten-free dishes
 * @param {boolean} params.veganOnly - Filter to only vegan dishes
 * @returns {Array} Restaurants with matched dishes
 */
export function searchRestaurantsByDish({ catalog, query, glutenFreeOnly = false, veganOnly = false }) {
  if (!Array.isArray(catalog)) return []
  
  const normalizedQuery = normalizeText(query).trim()
  if (!normalizedQuery) return []
  
  const results = []
  
  for (const restaurant of catalog) {
    const menuItems = Array.isArray(restaurant?.menuItems) ? restaurant.menuItems : []
    const matchedItems = []
    
    for (const item of menuItems) {
      const nameMatch = normalizeText(item.name).includes(normalizedQuery)
      const descMatch = normalizeText(item.description).includes(normalizedQuery)
      const categoryMatch = normalizeText(item.category).includes(normalizedQuery)
      
      if (!nameMatch && !descMatch && !categoryMatch) continue
      
      if (glutenFreeOnly && !item.glutenFree) continue
      if (veganOnly && !item.vegan) continue
      
      matchedItems.push(item)
    }
    
    if (matchedItems.length > 0) {
      results.push({
        restaurantId: restaurant.restaurantId,
        name: restaurant.name,
        matchedItems: matchedItems.slice(0, 3),
      })
    }
  }
  
  return results
}
