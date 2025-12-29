import { z } from 'zod'

// Ingest payload schema for menus
export const MenuIngestPayload = z.object({
  restaurantId: z.string().min(1),
  currency: z.string().min(1).optional(),
  items: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number().nonnegative(),
      category: z.string().optional(),
      allergens: z.array(z.string()),
      glutenFree: z.boolean(),
      vegan: z.boolean().optional(),
    })
  ).min(1),
})

// Canonical menu item schema
export const MenuItem = z.object({
  id: z.string().min(1),
  restaurantId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  currency: z.string().min(1),
  category: z.string().optional(),
  allergens: z.array(z.string()).optional(),
  glutenFree: z.boolean().optional(),
  vegan: z.boolean().optional(),
})

export const MenuItems = z.array(MenuItem)

export function validateMenuIngest(payload) {
  return MenuIngestPayload.parse(payload)
}

export function toCanonicalMenuItems(payload) {
  const validated = MenuIngestPayload.parse(payload)
  const currency = validated.currency || 'EUR'
  return validated.items.map((item) => ({
    id: item.id,
    restaurantId: validated.restaurantId,
    name: item.name,
    description: item.description,
    price: item.price,
    currency,
    category: item.category,
    allergens: item.allergens,
    glutenFree: item.glutenFree,
    vegan: item.vegan,
  }))
}
