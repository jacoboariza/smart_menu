import { describe, expect, it } from 'vitest'
import { searchRestaurantsByDish } from './municipalityService.js'

describe('searchRestaurantsByDish', () => {
  const mockCatalog = [
    {
      restaurantId: 'resto-1',
      name: 'La Paella',
      menuItems: [
        {
          name: 'Paella Valenciana',
          description: 'Arroz con mariscos y azafrán',
          glutenFree: true,
          vegan: false,
          category: 'Arroces',
        },
        {
          name: 'Ensalada Mixta',
          description: 'Lechuga, tomate y cebolla',
          glutenFree: true,
          vegan: true,
          category: 'Entrantes',
        },
        {
          name: 'Lasaña',
          description: 'Con carne y bechamel',
          glutenFree: false,
          vegan: false,
          category: 'Pasta',
        },
      ],
    },
    {
      restaurantId: 'resto-2',
      name: 'Veggie House',
      menuItems: [
        {
          name: 'Hummus con Crudités',
          description: 'Garbanzos, tahini y verduras',
          glutenFree: true,
          vegan: true,
          category: 'Entrantes',
        },
        {
          name: 'Tortilla de Patatas',
          description: 'Tradicional española',
          glutenFree: true,
          vegan: false,
          category: 'Platos principales',
        },
      ],
    },
    {
      restaurantId: 'resto-3',
      name: 'Pasta Corner',
      menuItems: [
        {
          name: 'Lasaña Vegetal',
          description: 'Con verduras de temporada',
          glutenFree: false,
          vegan: true,
          category: 'Pasta',
        },
        {
          name: 'Carbonara',
          description: 'Pasta con huevo y panceta',
          glutenFree: false,
          vegan: false,
          category: 'Pasta',
        },
      ],
    },
  ]

  it('returns empty array when catalog is not an array', () => {
    const result = searchRestaurantsByDish({ catalog: null, query: 'paella' })
    expect(result).toEqual([])
  })

  it('returns empty array when query is empty', () => {
    const result = searchRestaurantsByDish({ catalog: mockCatalog, query: '' })
    expect(result).toEqual([])
  })

  it('returns empty array when query is only whitespace', () => {
    const result = searchRestaurantsByDish({ catalog: mockCatalog, query: '   ' })
    expect(result).toEqual([])
  })

  it('finds restaurants by dish name match', () => {
    const result = searchRestaurantsByDish({ catalog: mockCatalog, query: 'paella' })
    
    expect(result).toHaveLength(1)
    expect(result[0].restaurantId).toBe('resto-1')
    expect(result[0].name).toBe('La Paella')
    expect(result[0].matchedItems).toHaveLength(1)
    expect(result[0].matchedItems[0].name).toBe('Paella Valenciana')
  })

  it('finds restaurants by dish description match', () => {
    const result = searchRestaurantsByDish({ catalog: mockCatalog, query: 'mariscos' })
    
    expect(result).toHaveLength(1)
    expect(result[0].restaurantId).toBe('resto-1')
    expect(result[0].matchedItems[0].name).toBe('Paella Valenciana')
  })

  it('finds restaurants by category match', () => {
    const result = searchRestaurantsByDish({ catalog: mockCatalog, query: 'arroces' })
    
    expect(result).toHaveLength(1)
    expect(result[0].restaurantId).toBe('resto-1')
    expect(result[0].matchedItems[0].name).toBe('Paella Valenciana')
  })

  it('finds multiple restaurants with same dish name', () => {
    const result = searchRestaurantsByDish({ catalog: mockCatalog, query: 'lasaña' })
    
    expect(result).toHaveLength(2)
    expect(result[0].restaurantId).toBe('resto-1')
    expect(result[1].restaurantId).toBe('resto-3')
  })

  it('normalizes text to lowercase', () => {
    const result = searchRestaurantsByDish({ catalog: mockCatalog, query: 'PAELLA' })
    
    expect(result).toHaveLength(1)
    expect(result[0].matchedItems[0].name).toBe('Paella Valenciana')
  })

  it('normalizes accents in search query', () => {
    const result = searchRestaurantsByDish({ catalog: mockCatalog, query: 'lasana' })
    
    expect(result).toHaveLength(2)
  })

  it('filters by glutenFreeOnly', () => {
    const result = searchRestaurantsByDish({
      catalog: mockCatalog,
      query: 'lasaña',
      glutenFreeOnly: true,
    })
    
    expect(result).toHaveLength(0)
  })

  it('filters by veganOnly', () => {
    const result = searchRestaurantsByDish({
      catalog: mockCatalog,
      query: 'lasaña',
      veganOnly: true,
    })
    
    expect(result).toHaveLength(1)
    expect(result[0].restaurantId).toBe('resto-3')
    expect(result[0].matchedItems[0].name).toBe('Lasaña Vegetal')
  })

  it('combines glutenFreeOnly and veganOnly filters', () => {
    const result = searchRestaurantsByDish({
      catalog: mockCatalog,
      query: 'hummus',
      glutenFreeOnly: true,
      veganOnly: true,
    })
    
    expect(result).toHaveLength(1)
    expect(result[0].restaurantId).toBe('resto-2')
    expect(result[0].matchedItems[0].name).toBe('Hummus con Crudités')
  })

  it('excludes dishes that do not match both filters when combined', () => {
    const result = searchRestaurantsByDish({
      catalog: mockCatalog,
      query: 'tortilla',
      glutenFreeOnly: true,
      veganOnly: true,
    })
    
    expect(result).toHaveLength(0)
  })

  it('limits matched items to 3 per restaurant', () => {
    const catalogWithMany = [
      {
        restaurantId: 'resto-many',
        name: 'Many Dishes',
        menuItems: [
          { name: 'Pasta 1', description: '', glutenFree: false, vegan: false, category: 'Pasta' },
          { name: 'Pasta 2', description: '', glutenFree: false, vegan: false, category: 'Pasta' },
          { name: 'Pasta 3', description: '', glutenFree: false, vegan: false, category: 'Pasta' },
          { name: 'Pasta 4', description: '', glutenFree: false, vegan: false, category: 'Pasta' },
          { name: 'Pasta 5', description: '', glutenFree: false, vegan: false, category: 'Pasta' },
        ],
      },
    ]

    const result = searchRestaurantsByDish({ catalog: catalogWithMany, query: 'pasta' })
    
    expect(result).toHaveLength(1)
    expect(result[0].matchedItems).toHaveLength(3)
  })

  it('returns restaurants with gluten-free dishes when glutenFreeOnly is true', () => {
    const result = searchRestaurantsByDish({
      catalog: mockCatalog,
      query: 'ensalada',
      glutenFreeOnly: true,
    })
    
    expect(result).toHaveLength(1)
    expect(result[0].restaurantId).toBe('resto-1')
    expect(result[0].matchedItems[0].glutenFree).toBe(true)
  })

  it('handles restaurants with no menuItems', () => {
    const catalogWithEmpty = [
      {
        restaurantId: 'resto-empty',
        name: 'Empty Restaurant',
        menuItems: [],
      },
      ...mockCatalog,
    ]

    const result = searchRestaurantsByDish({ catalog: catalogWithEmpty, query: 'paella' })
    
    expect(result).toHaveLength(1)
    expect(result[0].restaurantId).toBe('resto-1')
  })

  it('handles restaurants with undefined menuItems', () => {
    const catalogWithUndefined = [
      {
        restaurantId: 'resto-undefined',
        name: 'Undefined Restaurant',
      },
      ...mockCatalog,
    ]

    const result = searchRestaurantsByDish({ catalog: catalogWithUndefined, query: 'paella' })
    
    expect(result).toHaveLength(1)
    expect(result[0].restaurantId).toBe('resto-1')
  })

  it('matches partial words in dish names', () => {
    const result = searchRestaurantsByDish({ catalog: mockCatalog, query: 'tort' })
    
    expect(result).toHaveLength(1)
    expect(result[0].matchedItems[0].name).toBe('Tortilla de Patatas')
  })

  it('matches single word from description', () => {
    const result = searchRestaurantsByDish({ catalog: mockCatalog, query: 'temporada' })
    
    expect(result).toHaveLength(1)
    expect(result[0].restaurantId).toBe('resto-3')
  })
})
