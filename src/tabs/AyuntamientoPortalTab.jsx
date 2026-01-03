import {
  BarChart3,
  Building2,
  Clock,
  FileCheck2,
  LifeBuoy,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Shield,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  buildDataProduct,
  consumeProduct,
  debugNormalized,
  ingestMenu,
  ingestOccupancy,
  ingestRestaurant,
  listAuditLogs,
  listDataProducts,
  normalizeRun,
  publishProduct,
  toUserError,
} from '../lib/apiClient.js'
import { isRestaurantOpenNow } from '../lib/openingHours.js'
import { mapEditorStateToMenuIngest } from '../lib/mappers/menuMapper.js'
import { mapEditorStateToRestaurantIngest } from '../lib/mappers/restaurantMapper.js'
import { getMunicipalCatalog, searchRestaurantsByDish } from '../lib/municipality/municipalityService.js'

/**
 * Portal Ayuntamiento
 *
 * Esta vista actúa como un “panel municipal” simplificado con dos sub-secciones:
 * - Gestión: KPIs y listado interno basado en datos normalizados.
 * - Servicios al ciudadano: recomendaciones y buscador orientado a consumo ciudadano.
 *
 * Flujo de datos (alto nivel):
 * - Normalized store (debug): se consulta vía `debugNormalized()` para obtener
 *   `menu` + `restaurant` + `occupancy` y se combina en un modelo `restaurants`.
 * - Catálogo municipal (published): se consulta vía `getMunicipalCatalog()` y
 *   se usa para la búsqueda por plato (`searchRestaurantsByDish`).
 *
 * Nota sobre “abierto ahora”:
 * - El cálculo se hace con `isRestaurantOpenNow({ timezone, weeklySchedule, exceptions })`.
 * - Si no hay horarios configurados, el helper puede devolver `null` y se trata
 *   como “sin filtro”/“desconocido” para no ocultar resultados.
 */

const SUBTABS = [
  { id: 'gestion', label: 'Gestión', icon: Settings2 },
  { id: 'ciudadano', label: 'Servicios al ciudadano', icon: Users },
]

export default function AyuntamientoPortalTab({ editorState } = {}) {
  const [activeSubtab, setActiveSubtab] = useState('gestion')

  // Estados de carga y error por “fuente” de datos.
  const [loading, setLoading] = useState({
    menu: false,
    occupancy: false,
    restaurant: false,
    products: false,
    audit: false,
    demo: false,
  })
  const [errors, setErrors] = useState({ menu: null, occupancy: null, restaurant: null, products: null, audit: null, demo: null })

  // Datos normalizados (debug):
  // - menuItems: items de carta por restaurante
  // - occupancySignals: señales temporales de ocupación
  // - restaurantProfiles: perfil del restaurante (incl. timezone/horarios)
  const [menuItems, setMenuItems] = useState([])
  const [occupancySignals, setOccupancySignals] = useState([])
  const [restaurantProfiles, setRestaurantProfiles] = useState([])
  const [products, setProducts] = useState([])
  const [auditLogs, setAuditLogs] = useState([])

  // Filtros de búsqueda/gestión.
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ openNow: false, glutenFree: false, hasAllergens: false })

  // Búsqueda por plato (usa el catálogo municipal publicado).
  const [dishQuery, setDishQuery] = useState('')
  const [dishFilters, setDishFilters] = useState({ glutenFreeOnly: false, veganOnly: false })
  const [dishResults, setDishResults] = useState([])
  const [municipalCatalog, setMunicipalCatalog] = useState([])
  const [loadingDishSearch, setLoadingDishSearch] = useState(false)

  function isLocalDevHost() {
    const host = typeof window !== 'undefined' ? window.location?.hostname : ''
    return host === 'localhost' || host === '127.0.0.1' || host === '::1'
  }

  const demoModeEnabled = String(import.meta.env?.VITE_DEMO_MODE || '').trim() === 'true' || isLocalDevHost()
  const [demoSteps, setDemoSteps] = useState([])
  const [demoRunning, setDemoRunning] = useState(false)
  const [demoError, setDemoError] = useState(null)

  const current = useMemo(() => SUBTABS.find((t) => t.id === activeSubtab) || SUBTABS[0], [activeSubtab])

  /**
   * Carga el catálogo municipal “de consumo” (published/consume).
   *
   * Este catálogo es el que se utiliza para la búsqueda por plato.
   * Importante: se consulta contra una `space` concreta (en demo: `segittur-mock`).
   */
  async function loadMunicipalCatalog() {
    try {
      setLoadingDishSearch(true)
      const space = 'segittur-mock'
      const catalog = await getMunicipalCatalog(space)
      console.log('Municipal catalog loaded:', catalog)
      console.log('Number of restaurants:', catalog.length)
      if (catalog.length > 0) {
        console.log('First restaurant menuItems:', catalog[0].menuItems)
      }
      setMunicipalCatalog(catalog)
    } catch (err) {
      console.error('Error loading municipal catalog:', err)
    } finally {
      setLoadingDishSearch(false)
    }
  }

  /**
   * Refresca datos internos (debug/normalized) y trazabilidad:
   * - menu / occupancy / restaurant: de normalized store (para combinar en `restaurants`)
   * - products: data-products construidos
   * - audit: logs de policy/audit (p.ej. consumes allow/deny)
   */
  async function refreshData({ sinceIso } = {}) {
    const profile = 'municipality'

    setLoading((p) => ({ ...p, menu: true }))
    setErrors((e) => ({ ...e, menu: null }))
    try {
      const res = await debugNormalized({ type: 'menu', profile })
      const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []
      setMenuItems(list)
    } catch (err) {
      setErrors((e) => ({ ...e, menu: err }))
    } finally {
      setLoading((p) => ({ ...p, menu: false }))
    }

    setLoading((p) => ({ ...p, occupancy: true }))
    setErrors((e) => ({ ...e, occupancy: null }))
    try {
      const res = await debugNormalized({ type: 'occupancy', profile })
      const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []
      setOccupancySignals(list)
    } catch (err) {
      setErrors((e) => ({ ...e, occupancy: err }))
    } finally {
      setLoading((p) => ({ ...p, occupancy: false }))
    }

    setLoading((p) => ({ ...p, restaurant: true }))
    setErrors((e) => ({ ...e, restaurant: null }))
    try {
      const res = await debugNormalized({ type: 'restaurant', profile })
      const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []
      setRestaurantProfiles(list)
    } catch (err) {
      setErrors((e) => ({ ...e, restaurant: err }))
    } finally {
      setLoading((p) => ({ ...p, restaurant: false }))
    }

    setLoading((p) => ({ ...p, products: true }))
    setErrors((e) => ({ ...e, products: null }))
    try {
      const res = await listDataProducts({ profile })
      const list = Array.isArray(res?.products) ? res.products : Array.isArray(res) ? res : []
      setProducts(list)
    } catch (err) {
      setErrors((e) => ({ ...e, products: err }))
    } finally {
      setLoading((p) => ({ ...p, products: false }))
    }

    setLoading((p) => ({ ...p, audit: true }))
    setErrors((e) => ({ ...e, audit: null }))
    try {
      const res = await listAuditLogs({ profile, since: sinceIso })
      const list = Array.isArray(res?.logs) ? res.logs : Array.isArray(res) ? res : []
      setAuditLogs(list)
    } catch (err) {
      setErrors((e) => ({ ...e, audit: err }))
    } finally {
      setLoading((p) => ({ ...p, audit: false }))
    }
  }

  useEffect(() => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    refreshData({ sinceIso: since })
    loadMunicipalCatalog()
  }, [])

  function toMs(iso) {
    const t = Date.parse(iso)
    return Number.isNaN(t) ? 0 : t
  }

  function normalizeText(v) {
    return String(v || '').toLowerCase().trim()
  }

  function hasAllergens(it) {
    return Array.isArray(it?.allergens) && it.allergens.length > 0
  }

  function isGlutenFree(it) {
    return Boolean(it?.glutenFree)
  }

  const occupancyLatestByRestaurant = useMemo(() => {
    // Reduce: mantener la última señal (por timestamp) por restaurante.
    const map = new Map()
    for (const s of occupancySignals) {
      const rid = s?.restaurantId
      if (!rid) continue
      const ms = toMs(s?.ts)
      const prev = map.get(rid)
      if (!prev || ms > prev.ms) {
        map.set(rid, { ms, signal: s })
      }
    }
    return map
  }, [occupancySignals])

  const restaurants = useMemo(() => {
    // Combina `menuItems` + `restaurantProfiles` + `products` + `occupancySignals` en un único modelo.
    // Esto alimenta tanto “Gestión” (filtros/KPIs) como “Servicios al ciudadano”.
    const map = new Map()
    for (const it of menuItems) {
      const rid = it?.restaurantId
      if (!rid) continue

      const current = map.get(rid) || {
        id: rid,
        name: rid,
        cuisines: new Set(),
        itemsCount: 0,
        hasAllergens: false,
        glutenFree: false,
        updatedAtMs: 0,
      }

      current.itemsCount += 1
      current.hasAllergens = current.hasAllergens || hasAllergens(it)
      current.glutenFree = current.glutenFree || isGlutenFree(it)
      if (it?.category) current.cuisines.add(String(it.category))

      map.set(rid, current)
    }

    const profileByRestaurant = new Map()
    for (const rp of restaurantProfiles) {
      const rid = rp?.restaurantId
      if (!rid) continue
      profileByRestaurant.set(rid, rp)
    }

    const productByRestaurant = new Map()
    for (const p of products) {
      const rid = p?.metadata?.restaurantId
      if (!rid) continue
      const ms = toMs(p?.createdAt)
      const prev = productByRestaurant.get(rid)
      if (!prev || ms > prev.createdAtMs) {
        productByRestaurant.set(rid, { createdAtMs: ms, product: p })
      }
    }

    for (const [rid, v] of map.entries()) {
      const product = productByRestaurant.get(rid)
      if (product) v.updatedAtMs = product.createdAtMs
      const occ = occupancyLatestByRestaurant.get(rid)
      v.latestOccupancyAtMs = occ?.ms || 0
      v.latestOccupancyPct = occ?.signal?.occupancyPct
      v.cuisineLabel = Array.from(v.cuisines).slice(0, 2).join(' · ')

      // Perfil del restaurante (timezone/horarios). Fallbacks para mantener UI robusta.
      const rp = profileByRestaurant.get(rid)
      v.timezone = rp?.timezone ? String(rp.timezone) : 'Europe/Madrid'
      v.weeklySchedule = Array.isArray(rp?.weeklySchedule) ? rp.weeklySchedule : []
      v.exceptions = Array.isArray(rp?.exceptions) ? rp.exceptions : []
    }

    return Array.from(map.values()).sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0))
  }, [menuItems, products, occupancyLatestByRestaurant, restaurantProfiles])

  const filteredRestaurants = useMemo(() => {
    const q = normalizeText(query)
    const now = Date.now()

    return restaurants.filter((r) => {
      const haystack = `${r.name} ${r.cuisineLabel}`.toLowerCase()
      if (q && !haystack.includes(q)) return false

      if (filters.glutenFree && !r.glutenFree) return false
      if (filters.hasAllergens && !r.hasAllergens) return false
      if (filters.openNow) {
        // `open === null` significa “sin horarios configurados”: no filtramos para
        // evitar ocultar restaurantes sin schedule.
        const open = isRestaurantOpenNow({
          timezone: r.timezone,
          weeklySchedule: r.weeklySchedule,
          exceptions: r.exceptions,
        })
        // Si no hay horarios configurados, mantenemos el comportamiento previo (no filtrar)
        if (open === null) return true
        if (!open) return false
      }

      return true
    })
  }, [filters.glutenFree, filters.hasAllergens, filters.openNow, query, restaurants])

  const kpis = useMemo(() => {
    // KPIs de gestión (ventana 7 días).
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    const restaurantsIntegrated = restaurants.length
    const menusWithAllergens = restaurants.filter((r) => r.hasAllergens).length
    const updatedLast7Days = restaurants.filter((r) => (r.updatedAtMs || 0) >= sevenDaysAgo).length

    const consumes7d = auditLogs.filter((l) => l?.action === 'CONSUME')
    const allowed = consumes7d.filter((l) => l?.decision === 'allow').length
    const denied = consumes7d.filter((l) => l?.decision === 'deny').length

    return {
      restaurantsIntegrated,
      menusWithAllergens,
      updatedLast7Days,
      consumesAllowed: allowed,
      consumesDenied: denied,
    }
  }, [auditLogs, restaurants])

  const loadingAny = loading.menu || loading.occupancy || loading.products || loading.audit

  function occupancyLevel(pct) {
    if (typeof pct !== 'number') return null
    if (pct < 35) return { label: 'Baja', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
    if (pct < 70) return { label: 'Media', className: 'border-amber-200 bg-amber-50 text-amber-800' }
    return { label: 'Alta', className: 'border-rose-200 bg-rose-50 text-rose-700' }
  }

  const restaurantAllergens = useMemo(() => {
    const map = new Map()
    for (const it of menuItems) {
      const rid = it?.restaurantId
      if (!rid) continue
      const set = map.get(rid) || new Set()
      const list = Array.isArray(it?.allergens) ? it.allergens : []
      list.forEach((a) => {
        const v = String(a || '').trim()
        if (v) set.add(v)
      })
      map.set(rid, set)
    }
    return map
  }, [menuItems])

  const openNowRestaurants = useMemo(() => {
    // En “Servicios al ciudadano” priorizamos restaurantes con horario,
    // pero mantenemos fallback para no dejar la pantalla vacía.
    const withSchedule = restaurants.filter((r) => Array.isArray(r.weeklySchedule) && r.weeklySchedule.length)
    if (withSchedule.length > 0) {
      return restaurants.filter((r) => {
        const open = isRestaurantOpenNow({ timezone: r.timezone, weeklySchedule: r.weeklySchedule, exceptions: r.exceptions })
        return open === null ? true : open
      })
    }
    // Fallback: si no tenemos horarios, mostramos todos
    return restaurants
  }, [restaurants])

  const glutenFreeRestaurants = useMemo(() => {
    return restaurants.filter((r) => r.glutenFree)
  }, [restaurants])

  function runDishSearch() {
    // Búsqueda local sobre `municipalCatalog` (ya cargado) para encontrar restaurantes
    // que tengan items que “matchean” el query, con filtros opcionales.
    if (!dishQuery.trim()) {
      setDishResults([])
      return
    }

    console.log('Running dish search with:', {
      query: dishQuery,
      catalogLength: municipalCatalog.length,
      glutenFreeOnly: dishFilters.glutenFreeOnly,
      veganOnly: dishFilters.veganOnly,
    })

    const results = searchRestaurantsByDish({
      catalog: municipalCatalog,
      query: dishQuery,
      glutenFreeOnly: dishFilters.glutenFreeOnly,
      veganOnly: dishFilters.veganOnly,
    })

    console.log('Search results:', results)
    setDishResults(results)
  }

  function handleDishSearchKeyPress(e) {
    if (e.key === 'Enter') {
      runDishSearch()
    }
  }

  function pushDemoStep(text, status = 'running') {
    setDemoSteps((prev) => [...prev, { ts: new Date().toISOString(), text, status }])
  }

  function makeFixtureMenu(restaurantId) {
    return {
      restaurantId,
      currency: 'EUR',
      items: [
        {
          id: 'item-1',
          name: 'Ensalada de temporada',
          description: 'Producto local',
          price: 9.5,
          category: 'Med',
          allergens: [],
          glutenFree: true,
          vegan: true,
        },
        {
          id: 'item-2',
          name: 'Pasta casera',
          description: 'Con salsa de queso',
          price: 13.0,
          category: 'Italian',
          allergens: ['gluten', 'milk'],
          glutenFree: false,
          vegan: false,
        },
      ],
    }
  }

  function makeFixtureRestaurantProfile(restaurantId) {
    return mapEditorStateToRestaurantIngest({
      restaurantId,
      name: editorState?.restaurantName || `Restaurante ${restaurantId}`,
      phone: editorState?.restaurantPhone,
      url: editorState?.restaurantUrl,
      cuisine: editorState?.restaurantCuisine,
      image: editorState?.restaurantImage,
      address: editorState?.address,
      timezone: editorState?.timezone || 'Europe/Madrid',
      weeklySchedule: editorState?.weeklySchedule,
      exceptions: editorState?.exceptions,
    })
  }

  async function prepareMunicipalityDemo() {
    // Demo end-to-end (solo cuando está habilitado):
    // 1) ingest (restaurant + menu + occupancy)
    // 2) normalize
    // 3) build data products
    // 4) publish (space: segittur-mock)
    // 5) consume para generar auditoría allow/deny
    if (!demoModeEnabled || demoRunning) return

    const profile = 'municipality'
    const now = Date.now()
    const rids = ['resto-demo-1', 'resto-demo-2']

    setDemoRunning(true)
    setDemoError(null)
    setDemoSteps([])

    try {
      pushDemoStep('Cargando catálogo…')

      for (const rid of rids) {
        await ingestRestaurant(makeFixtureRestaurantProfile(rid), { profile })

        let menuPayload
        const editorSections = Array.isArray(editorState?.sections) ? editorState.sections : []
        if (editorSections.length) {
          const mapped = mapEditorStateToMenuIngest({ editorState, restaurantId: rid, currency: 'EUR' })
          menuPayload = mapped?.items?.length ? mapped : makeFixtureMenu(rid)
        } else {
          menuPayload = makeFixtureMenu(rid)
        }

        await ingestMenu(menuPayload, { profile })

        await ingestOccupancy(
          {
            restaurantId: rid,
            signals: [
              { ts: new Date(now - 75 * 60 * 1000).toISOString(), occupancyPct: 22 },
              { ts: new Date(now - 15 * 60 * 1000).toISOString(), occupancyPct: 58 },
              { ts: new Date(now).toISOString(), occupancyPct: 41 },
            ],
          },
          { profile },
        )
      }

      setDemoSteps((prev) => prev.map((s, idx) => (idx === 0 ? { ...s, status: 'ok' } : s)))

      pushDemoStep('Actualizando disponibilidad…')
      await normalizeRun({ profile })
      setDemoSteps((prev) => prev.map((s, idx) => (idx === 1 ? { ...s, status: 'ok' } : s)))

      pushDemoStep('Preparando servicios…')
      const builtProducts = []
      for (const rid of rids) {
        const restaurantProduct = await buildDataProduct({ type: 'restaurant', restaurantId: rid, profile })
        const menuProduct = await buildDataProduct({ type: 'menu', restaurantId: rid, profile })
        const occProduct = await buildDataProduct({ type: 'occupancy', restaurantId: rid, profile })
        builtProducts.push(restaurantProduct, menuProduct, occProduct)
      }
      setDemoSteps((prev) => prev.map((s, idx) => (idx === 2 ? { ...s, status: 'ok' } : s)))

      pushDemoStep('Publicando datos del municipio…')
      for (const p of builtProducts) {
        await publishProduct({ space: 'segittur-mock', productId: p.id, profile })
      }
      setDemoSteps((prev) => prev.map((s, idx) => (idx === 3 ? { ...s, status: 'ok' } : s)))

      // Generar auditoría de consumos permitidos/denegados (sin mostrar nada técnico)
      for (const p of builtProducts.filter((x) => x?.type === 'menu')) {
        await consumeProduct({ space: 'segittur-mock', productId: p.id, purpose: 'discovery', profile })
        try {
          await consumeProduct({ space: 'segittur-mock', productId: p.id, purpose: 'ads-targeting', profile })
        } catch {
          // esperado
        }
      }

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      await refreshData({ sinceIso: since })

      pushDemoStep('Demo lista', 'ok')
    } catch (err) {
      setDemoError(err)
      setDemoSteps((prev) => {
        if (!prev.length) return prev
        const lastIdx = prev.length - 1
        return prev.map((s, idx) => (idx === lastIdx ? { ...s, status: 'error' } : s))
      })
    } finally {
      setDemoRunning(false)
    }
  }

  function SkeletonCard() {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-4 w-32 bg-slate-200 rounded mb-3 animate-pulse" />
        <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg">
          <Building2 className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Portal Ayuntamiento</h1>
          <p className="text-slate-500 text-sm">Vista municipal simplificada para operar y ofrecer servicios</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid sm:grid-cols-2 gap-2">
          {SUBTABS.map((t) => {
            const Icon = t.icon
            const active = t.id === activeSubtab
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveSubtab(t.id)}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50 p-5 shadow-sm flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-indigo-600">SECCIÓN</div>
          <div className="text-lg font-semibold text-slate-900">{current.label}</div>
          <div className="text-sm text-slate-600">Acciones clave sin exponer complejidad técnica</div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-slate-700 border border-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Control público
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-slate-700 border border-slate-200">
            <FileCheck2 className="h-4 w-4 text-indigo-600" />
            Trazabilidad
          </span>
        </div>
      </div>

      {demoModeEnabled && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <LifeBuoy className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Preparar demo con datos</div>
                <div className="text-sm text-slate-600 mt-1">
                  Carga un ejemplo completo para ver KPIs, catálogo y servicios al ciudadano.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={prepareMunicipalityDemo}
              disabled={demoRunning}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60"
            >
              {demoRunning ? 'Preparando…' : 'Preparar demo con datos'}
            </button>
          </div>

          {demoError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              No se pudo preparar la demo. {toUserError(demoError)}
            </div>
          )}

          {demoSteps.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold text-slate-700">PROGRESO</div>
              <div className="mt-2 space-y-2">
                {demoSteps.map((s, idx) => (
                  <div key={`${s.ts}-${idx}`} className="flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-800">{s.text}</div>
                    <div className="text-xs font-semibold">
                      {s.status === 'ok' ? (
                        <span className="text-emerald-700">OK</span>
                      ) : s.status === 'error' ? (
                        <span className="text-red-700">Error</span>
                      ) : (
                        <span className="text-slate-500">En curso</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubtab === 'gestion' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loadingAny ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-bold text-indigo-600">KPI</div>
                  <div className="text-sm font-semibold text-slate-900">Restaurantes integrados</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{kpis.restaurantsIntegrated}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-bold text-indigo-600">KPI</div>
                  <div className="text-sm font-semibold text-slate-900">Menús con alérgenos</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{kpis.menusWithAllergens}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-bold text-indigo-600">KPI</div>
                  <div className="text-sm font-semibold text-slate-900">Actualizados últ. 7 días</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{kpis.updatedLast7Days}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-bold text-indigo-600">KPI</div>
                  <div className="text-sm font-semibold text-slate-900">Consumos (7 días)</div>
                  <div className="mt-2 flex items-end gap-3">
                    <div className="text-3xl font-bold text-slate-900">{kpis.consumesAllowed + kpis.consumesDenied}</div>
                    <div className="text-xs text-slate-500 pb-1">
                      <span className="text-emerald-700 font-semibold">{kpis.consumesAllowed} OK</span>
                      {' / '}
                      <span className="text-amber-700 font-semibold">{kpis.consumesDenied} DENY</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {(errors.menu || errors.occupancy || errors.products || errors.audit) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              No se han podido cargar algunos datos. {toUserError(errors.menu || errors.occupancy || errors.products || errors.audit)}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Catálogo municipal</h2>
                <p className="text-sm text-slate-500">Buscador y filtros para gestión pública</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
                    refreshData({ sinceIso: since })
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                  disabled={loadingAny}
                >
                  <Clock className="h-4 w-4" />
                  Actualizar
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nombre o cocina…"
                    className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.openNow}
                    onChange={(e) => setFilters((p) => ({ ...p, openNow: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-slate-700">Abierto ahora</span>
                </label>
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.glutenFree}
                    onChange={(e) => setFilters((p) => ({ ...p, glutenFree: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-slate-700">Sin gluten</span>
                </label>
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.hasAllergens}
                    onChange={(e) => setFilters((p) => ({ ...p, hasAllergens: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-slate-700">Con alérgenos</span>
                </label>
              </div>
            </div>

            <div className="mt-5">
              {loadingAny ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="h-4 w-48 bg-slate-200 rounded mb-2 animate-pulse" />
                      <div className="h-3 w-72 bg-slate-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : filteredRestaurants.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="text-sm font-semibold text-slate-900">No hay datos todavía</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Para ver el portal funcionando, puedes cargar una demo con datos de ejemplo.
                  </div>
                  {demoModeEnabled && (
                    <button
                      type="button"
                      onClick={prepareMunicipalityDemo}
                      disabled={demoRunning}
                      className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60"
                    >
                      {demoRunning ? 'Preparando…' : 'Preparar demo con datos'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                  {filteredRestaurants.map((r) => (
                    <div key={r.id} className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                        <div className="text-xs text-slate-500">
                          Cocina: <span className="text-slate-700">{r.cuisineLabel || '—'}</span>
                          {' · '}Items: <span className="text-slate-700">{r.itemsCount}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                          {r.latestOccupancyAtMs ? 'Ocupación' : 'Sin señal'}
                        </span>
                        {r.latestOccupancyAtMs && (
                          <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                            {typeof r.latestOccupancyPct === 'number' ? `${r.latestOccupancyPct}%` : '—'}
                          </span>
                        )}
                        {r.glutenFree && (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            Sin gluten
                          </span>
                        )}
                        {r.hasAllergens && (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                            Con alérgenos
                          </span>
                        )}
                        {(r.updatedAtMs || 0) > 0 && (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            Actualizado: {new Date(r.updatedAtMs).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Indicadores</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed flex-1">
                Resumen de cobertura de menús, estado de publicación y evolución del catálogo.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">Catálogo</div>
                  <div className="text-lg font-bold text-slate-900">—</div>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">Activos</div>
                  <div className="text-lg font-bold text-slate-900">—</div>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">Calidad</div>
                  <div className="text-lg font-bold text-slate-900">—</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Gobernanza</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed flex-1">
                Reglas de acceso, finalidad de uso y roles municipales de manera clara.
              </p>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                Política por defecto: <span className="font-semibold">sin PII</span> y consumo por finalidad.
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Publicación</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed flex-1">
                Controla qué datasets están publicados y en qué canales (web municipal, open data, etc.).
              </p>
              <button
                type="button"
                className="w-full rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Ver estado de publicación
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Acciones rápidas</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Actualizar catálogo</div>
                <div className="text-xs text-slate-600 mt-1">Importar nuevas cartas y normalizar</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Revisar calidad</div>
                <div className="text-xs text-slate-600 mt-1">Validaciones y cobertura por distrito</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Exportar informe</div>
                <div className="text-xs text-slate-600 mt-1">Impacto y uso (PDF/CSV)</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Auditoría</div>
                <div className="text-xs text-slate-600 mt-1">Trazabilidad de accesos y cambios</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubtab === 'ciudadano' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Servicios al ciudadano</h2>
            <p className="text-sm text-slate-600 mt-1">
              Información clara para ayudarte a elegir dónde comer, con datos del municipio.
            </p>
          </div>

          {loadingAny ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="h-4 w-56 bg-slate-200 rounded mb-2 animate-pulse" />
                  <div className="h-3 w-72 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : restaurants.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <div className="text-sm font-semibold text-slate-900">Aún no hay restaurantes para mostrar</div>
              <div className="text-sm text-slate-600 mt-1">Puedes cargar una demo para ver el servicio en funcionamiento.</div>
              {demoModeEnabled && (
                <button
                  type="button"
                  onClick={prepareMunicipalityDemo}
                  disabled={demoRunning}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60"
                >
                  {demoRunning ? 'Preparando…' : 'Preparar demo con datos'}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Dónde comer ahora</h3>
                    <p className="text-sm text-slate-600 mt-1">Restaurantes con información de ocupación reciente.</p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                    <Clock className="h-4 w-4" />
                    Actualización automática
                  </span>
                </div>

                <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                  {openNowRestaurants.slice(0, 12).map((r) => {
                    const level = occupancyLevel(r.latestOccupancyPct)
                    return (
                      <div key={r.id} className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                          <div className="text-xs text-slate-500">
                            Cocina: <span className="text-slate-700">{r.cuisineLabel || '—'}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {level ? (
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${level.className}`}>
                              Ocupación {level.label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                              Ocupación: —
                            </span>
                          )}
                          {r.glutenFree && (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                              Sin gluten
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {openNowRestaurants.length > 12 && (
                  <div className="mt-3 text-xs text-slate-500">Mostrando 12 de {openNowRestaurants.length}.</div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Opciones sin gluten</h3>
                    <p className="text-sm text-slate-600 mt-1">Restaurantes con platos marcados como sin gluten.</p>
                  </div>
                </div>

                {glutenFreeRestaurants.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                    No hay opciones sin gluten registradas por ahora.
                  </div>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                    {glutenFreeRestaurants.slice(0, 12).map((r) => {
                      const allergens = Array.from(restaurantAllergens.get(r.id) || []).slice(0, 4)
                      return (
                        <div key={r.id} className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                            <div className="text-xs text-slate-500">
                              Cocina: <span className="text-slate-700">{r.cuisineLabel || '—'}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                              Sin gluten
                            </span>
                            {allergens.length > 0 ? (
                              allergens.map((a) => (
                                <span
                                  key={a}
                                  className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
                                >
                                  {a}
                                </span>
                              ))
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                                Alérgenos: —
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Buscar por plato</h3>
                  <p className="text-sm text-slate-600 mt-1">Encuentra restaurantes que ofrezcan un plato específico.</p>
                  {municipalCatalog.length > 0 && (
                    <p className="text-xs text-emerald-600 mt-1">✓ Catálogo cargado: {municipalCatalog.length} restaurantes con {municipalCatalog.reduce((sum, r) => sum + (r.menuItems?.length || 0), 0)} platos</p>
                  )}
                  {municipalCatalog.length === 0 && !loadingDishSearch && (
                    <p className="text-xs text-amber-600 mt-1">⚠ Catálogo vacío - recarga la página</p>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={dishQuery}
                        onChange={(e) => setDishQuery(e.target.value)}
                        onKeyPress={handleDishSearchKeyPress}
                        placeholder="Ej.: paella, lasaña, hummus, tortilla…"
                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={runDishSearch}
                      disabled={loadingDishSearch || !dishQuery.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Search className="h-4 w-4" />
                      Buscar
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={dishFilters.glutenFreeOnly}
                        onChange={(e) => setDishFilters((p) => ({ ...p, glutenFreeOnly: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      <span className="text-slate-700">Solo sin gluten</span>
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={dishFilters.veganOnly}
                        onChange={(e) => setDishFilters((p) => ({ ...p, veganOnly: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      <span className="text-slate-700">Solo vegano</span>
                    </label>
                  </div>
                </div>

                {dishQuery.trim() && dishResults.length === 0 && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-sm font-semibold text-slate-900">No se encontraron resultados</div>
                    <div className="text-sm text-slate-600 mt-1">
                      Prueba con otros términos como "pasta", "ensalada", "arroz" o "tarta".
                    </div>
                  </div>
                )}

                {dishResults.length > 0 && (
                  <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                    {dishResults.map((result) => {
                      const restaurantData = restaurants.find((r) => r.id === result.restaurantId)
                      const level = restaurantData ? occupancyLevel(restaurantData.latestOccupancyPct) : null
                      const isOpenNow = restaurantData
                        ? isRestaurantOpenNow({
                            timezone: restaurantData.timezone,
                            weeklySchedule: restaurantData.weeklySchedule,
                            exceptions: restaurantData.exceptions,
                          })
                        : null

                      return (
                        <div key={result.restaurantId} className="p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-slate-900">{result.name}</div>
                              <div className="mt-2 space-y-1.5">
                                {result.matchedItems.slice(0, 3).map((item, idx) => (
                                  <div key={idx} className="flex items-start gap-2">
                                    <div className="text-xs text-slate-700 flex-1">
                                      <span className="font-medium">{item.name}</span>
                                      {item.description && (
                                        <span className="text-slate-500"> — {item.description}</span>
                                      )}
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                      {item.glutenFree && (
                                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                          Sin gluten
                                        </span>
                                      )}
                                      {item.vegan && (
                                        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                          Vegano
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {isOpenNow && (
                                <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                  Abierto ahora
                                </span>
                              )}
                              {isOpenNow === false && (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                                  Cerrado
                                </span>
                              )}
                              {level && (
                                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${level.className}`}>
                                  Ocupación {level.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {dishResults.length > 0 && (
                  <div className="mt-3 text-xs text-slate-500">
                    {dishResults.length} {dishResults.length === 1 ? 'restaurante encontrado' : 'restaurantes encontrados'}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
