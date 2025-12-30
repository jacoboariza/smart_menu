import { describe, expect, it } from 'vitest'
import { mapEditorStateToMenuIngest } from './menuMapper.js'

describe('mapEditorStateToMenuIngest', () => {
  it('maps sections/items to MenuIngestPayload shape with defaults', () => {
    const editorState = {
      sections: [
        {
          name: 'Entrantes',
          items: [
            { name: 'Ensalada', price: 9.5, isGlutenFree: true, allergens: ['nuts'] },
            { name: '  ', price: 10 },
          ],
        },
      ],
    }

    const payload = mapEditorStateToMenuIngest({
      editorState,
      restaurantId: 'rest1',
      currency: 'EUR',
    })

    expect(payload).toEqual({
      restaurantId: 'rest1',
      currency: 'EUR',
      items: [
        {
          id: expect.any(String),
          name: 'Ensalada',
          description: undefined,
          price: 9.5,
          category: 'Entrantes',
          allergens: ['nuts'],
          glutenFree: true,
        },
      ],
    })

    expect(payload.items[0].id.length).toBeGreaterThan(0)
  })

  it('generates stable id from slug + indices when item has no id', () => {
    const editorState = {
      sections: [{ name: 'Carta', items: [{ name: 'Tortilla de patatas' }] }],
    }

    const payload1 = mapEditorStateToMenuIngest({ editorState, restaurantId: 'r1', currency: 'EUR' })
    const payload2 = mapEditorStateToMenuIngest({ editorState, restaurantId: 'r1', currency: 'EUR' })

    expect(payload1.items[0].id).toBe(payload2.items[0].id)
    expect(payload1.items[0].id).toBe('tortilla-de-patatas-0-0')
  })

  it('coerces invalid/negative prices to a non-negative number', () => {
    const editorState = {
      sections: [{ name: 'Carta', items: [{ name: 'A', price: -3 }, { name: 'B', price: 'nope' }] }],
    }

    const payload = mapEditorStateToMenuIngest({ editorState, restaurantId: 'r1', currency: 'EUR' })

    expect(payload.items[0].price).toBe(0)
    expect(payload.items[1].price).toBe(0)
  })
})
