function slugify(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toNonNegativeNumber(value, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  if (n < 0) return 0
  return n
}

export function mapEditorStateToMenuIngest({ editorState, restaurantId, currency } = {}) {
  const sections = Array.isArray(editorState)
    ? editorState
    : Array.isArray(editorState?.sections)
      ? editorState.sections
      : []

  const items = []

  sections.forEach((section, sectionIndex) => {
    const category = section?.name ? String(section.name) : undefined
    const sectionItems = Array.isArray(section?.items) ? section.items : []

    sectionItems.forEach((it, itemIndex) => {
      const name = String(it?.name || '').trim()
      if (!name) return

      const stableIdBase = slugify(name) || 'item'
      const stableId = it?.id ? String(it.id) : `${stableIdBase}-${sectionIndex}-${itemIndex}`

      items.push({
        id: stableId,
        name,
        description: it?.description ? String(it.description) : undefined,
        price: toNonNegativeNumber(it?.price, 0),
        category,
        allergens: Array.isArray(it?.allergens)
          ? it.allergens.map((a) => String(a)).filter(Boolean)
          : [],
        glutenFree: Boolean(it?.isGlutenFree),
      })
    })
  })

  return {
    restaurantId,
    currency,
    items,
  }
}
