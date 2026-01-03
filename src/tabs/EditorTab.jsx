import {
  Calendar,
  Clock,
  Cookie,
  Droplets,
  Dumbbell,
  Globe,
  Image,
  Leaf,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Salad,
  Search,
  Utensils,
  Video,
  X,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'

export default function EditorTab({
  restaurantId,
  searchRestaurantsInDbByName,
  loadRestaurantFromDb,
  restaurantName,
  setRestaurantName,
  restaurantCuisine,
  setRestaurantCuisine,
  restaurantPhone,
  setRestaurantPhone,
  restaurantUrl,
  setRestaurantUrl,
  handleAutofillFromWebsite,
  webAutofillLoading,
  webAutofillError,
  normalizeWebsiteUrl,
  restaurantLicense,
  setRestaurantLicense,
  dataSharingScope,
  setDataSharingScope,
  restaurantImage,
  setRestaurantImage,
  restaurantStreet,
  setRestaurantStreet,
  restaurantCity,
  setRestaurantCity,
  restaurantPostalCode,
  setRestaurantPostalCode,
  restaurantCountry,
  setRestaurantCountry,
  restaurantTimezone,
  setRestaurantTimezone,
  weeklySchedule,
  setWeeklySchedule,
  exceptions,
  setExceptions,
  newSectionName,
  setNewSectionName,
  addSection,
  sections,
  renameSection,
  addItem,
  deleteSection,
  updateItem,
  deleteItem,
  currencies,
}) {
  const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  const [dbQuery, setDbQuery] = useState('')
  const [dbResults, setDbResults] = useState([])
  const [dbLoading, setDbLoading] = useState(false)
  const [dbError, setDbError] = useState('')

  const currentRestaurantLabel = useMemo(() => {
    const rid = String(restaurantId || '').trim()
    if (!rid) return null
    return rid
  }, [restaurantId])

  async function runDbSearch() {
    if (!searchRestaurantsInDbByName) return
    const q = String(dbQuery || '').trim()
    if (!q) {
      setDbResults([])
      return
    }

    setDbLoading(true)
    setDbError('')
    try {
      const res = await searchRestaurantsInDbByName(q)
      setDbResults(Array.isArray(res) ? res : [])
    } catch (err) {
      setDbError(err?.message ? String(err.message) : 'No se pudo buscar')
    } finally {
      setDbLoading(false)
    }
  }

  function ensureWeek(value) {
    if (Array.isArray(value) && value.length === 7) return value
    return Array.from({ length: 7 }).map((_, day) => ({ day, slots: [] }))
  }

  function updateDaySlots(day, nextSlots) {
    setWeeklySchedule((prev) =>
      ensureWeek(prev).map((d) => (d.day === day ? { ...d, slots: nextSlots } : d)),
    )
  }

  function addSlot(day) {
    const week = ensureWeek(weeklySchedule)
    const entry = week.find((d) => d.day === day) || { day, slots: [] }
    updateDaySlots(day, [...(entry.slots || []), { start: '09:00', end: '17:00' }])
  }

  function removeSlot(day, idx) {
    const week = ensureWeek(weeklySchedule)
    const entry = week.find((d) => d.day === day) || { day, slots: [] }
    updateDaySlots(day, (entry.slots || []).filter((_, i) => i !== idx))
  }

  function updateSlot(day, idx, patch) {
    const week = ensureWeek(weeklySchedule)
    const entry = week.find((d) => d.day === day) || { day, slots: [] }
    const next = (entry.slots || []).map((s, i) => (i === idx ? { ...s, ...patch } : s))
    updateDaySlots(day, next)
  }

  function addException() {
    setExceptions((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      {
        type: 'closed',
        startDate: '',
        endDate: '',
        reason: '',
        slots: [{ start: '09:00', end: '17:00' }],
      },
    ])
  }

  function removeException(idx) {
    setExceptions((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : []))
  }

  function updateException(idx, patch) {
    setExceptions((prev) =>
      (Array.isArray(prev) ? prev : []).map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    )
  }

  function addExceptionSlot(exIdx) {
    const ex = Array.isArray(exceptions) ? exceptions[exIdx] : null
    const slots = Array.isArray(ex?.slots) ? ex.slots : []
    updateException(exIdx, { slots: [...slots, { start: '09:00', end: '17:00' }] })
  }

  function updateExceptionSlot(exIdx, slotIdx, patch) {
    const ex = Array.isArray(exceptions) ? exceptions[exIdx] : null
    const slots = Array.isArray(ex?.slots) ? ex.slots : []
    updateException(exIdx, { slots: slots.map((s, i) => (i === slotIdx ? { ...s, ...patch } : s)) })
  }

  function removeExceptionSlot(exIdx, slotIdx) {
    const ex = Array.isArray(exceptions) ? exceptions[exIdx] : null
    const slots = Array.isArray(ex?.slots) ? ex.slots : []
    updateException(exIdx, { slots: slots.filter((_, i) => i !== slotIdx) })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Edición Restaurante</h2>
          <p className="text-sm text-slate-500">
            Crea y edita tu menú. Los cambios se reflejan en tiempo real.
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-4">
          <Search className="h-4 w-4 text-indigo-600" />
          Cargar restaurante existente
        </div>

        {currentRestaurantLabel && (
          <div className="mb-3 text-xs text-slate-600">
            Editando: <span className="font-semibold text-slate-900">{currentRestaurantLabel}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            value={dbQuery}
            onChange={(e) => setDbQuery(e.target.value)}
            placeholder="Buscar por nombre (ej: Resto API)"
          />
          <button
            type="button"
            onClick={runDbSearch}
            disabled={dbLoading || !dbQuery.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {dbLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </div>

        {dbError && <div className="mt-2 text-xs text-red-600">{dbError}</div>}

        {dbResults.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
            {dbResults.map((r) => (
              <button
                key={r.restaurantId}
                type="button"
                onClick={() => loadRestaurantFromDb && loadRestaurantFromDb(r.restaurantId)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
              >
                <div className="text-sm font-semibold text-slate-900">{r.name || r.restaurantId}</div>
                <div className="text-xs text-slate-600">{r.restaurantId} · {r.timezone || 'Europe/Madrid'}</div>
              </button>
            ))}
          </div>
        )}

        {dbResults.length === 0 && !dbLoading && dbQuery.trim() && (
          <div className="mt-3 text-xs text-slate-500">Sin resultados.</div>
        )}

        <div className="mt-3 text-[11px] text-slate-500">
          Esta opción carga datos normalizados del backend (perfil + menú) para poder editarlos.
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-4">
          <Utensils className="h-4 w-4 text-indigo-600" />
          Información del Restaurante
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Nombre del Restaurante"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Cocina</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={restaurantCuisine}
              onChange={(e) => setRestaurantCuisine(e.target.value)}
              placeholder="Ej: Mediterránea, Italiana, Japonesa..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              <Phone className="h-3 w-3 inline mr-1" />Teléfono
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={restaurantPhone}
              onChange={(e) => setRestaurantPhone(e.target.value)}
              placeholder="+34 912 345 678"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              <Globe className="h-3 w-3 inline mr-1" />URL Web
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={restaurantUrl}
                onChange={(e) => setRestaurantUrl(e.target.value)}
                placeholder="https://www.mirestaurante.com"
              />
              <button
                type="button"
                onClick={handleAutofillFromWebsite}
                disabled={webAutofillLoading || !normalizeWebsiteUrl(restaurantUrl)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                title="Intentar completar datos desde la web (JSON-LD / meta tags)"
              >
                {webAutofillLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Extraer
              </button>
            </div>
            {webAutofillError && <div className="mt-2 text-xs text-red-600">{webAutofillError}</div>}
            {!webAutofillError && (
              <div className="mt-2 text-[11px] text-slate-500">
                Se intentará leer datos públicos (JSON-LD / meta). No se almacena la información.
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Licencia de los datos</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={restaurantLicense}
              onChange={(e) => setRestaurantLicense(e.target.value)}
              placeholder="https://creativecommons.org/licenses/by/4.0/"
            />
            <p className="text-[11px] text-slate-500 mt-1">Incluye la URL de la licencia (ej. CC BY 4.0).</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ámbito de compartición</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={dataSharingScope}
              onChange={(e) => setDataSharingScope(e.target.value)}
            >
              <option value="public">Público</option>
              <option value="partners">Partners</option>
              <option value="private">Privado</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Controla la difusión del menú en espacios de datos.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              <Image className="h-3 w-3 inline mr-1" />URL Imagen de Portada
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={restaurantImage}
              onChange={(e) => setRestaurantImage(e.target.value)}
              placeholder="https://ejemplo.com/imagen-restaurante.jpg"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-3">
            <MapPin className="h-3.5 w-3.5 text-indigo-600" />
            Dirección
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Calle</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={restaurantStreet}
                onChange={(e) => setRestaurantStreet(e.target.value)}
                placeholder="Calle Principal, 123"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ciudad</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={restaurantCity}
                onChange={(e) => setRestaurantCity(e.target.value)}
                placeholder="Madrid"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">CP</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  value={restaurantPostalCode}
                  onChange={(e) => setRestaurantPostalCode(e.target.value)}
                  placeholder="28001"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">País</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  value={restaurantCountry}
                  onChange={(e) => setRestaurantCountry(e.target.value)}
                  placeholder="ES"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-4">
          <Clock className="h-4 w-4 text-indigo-600" />
          Horario de apertura
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Zona horaria</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={restaurantTimezone}
              onChange={(e) => setRestaurantTimezone(e.target.value)}
              placeholder="Europe/Madrid"
            />
            <div className="mt-1 text-[11px] text-slate-500">Ej.: Europe/Madrid, Europe/Lisbon</div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {ensureWeek(weeklySchedule).map((d) => (
            <div key={d.day} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">{dayLabels[d.day]}</div>
                <button
                  type="button"
                  onClick={() => addSlot(d.day)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Añadir tramo
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {(d.slots || []).length === 0 && (
                  <div className="text-xs text-slate-500">Sin tramos (cerrado).</div>
                )}
                {(d.slots || []).map((s, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2">
                    <input
                      type="time"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      value={s.start || ''}
                      onChange={(e) => updateSlot(d.day, idx, { start: e.target.value })}
                    />
                    <span className="text-sm text-slate-600">–</span>
                    <input
                      type="time"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      value={s.end || ''}
                      onChange={(e) => updateSlot(d.day, idx, { end: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(d.day, idx)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Calendar className="h-4 w-4 text-indigo-600" />
            Días especiales (festivos / vacaciones)
          </div>
          <button
            type="button"
            onClick={addException}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Añadir
          </button>
        </div>

        {(Array.isArray(exceptions) ? exceptions : []).length === 0 && (
          <div className="text-sm text-slate-500">No hay excepciones configuradas.</div>
        )}

        <div className="space-y-3">
          {(Array.isArray(exceptions) ? exceptions : []).map((ex, idx) => (
            <div key={idx} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-3 sm:grid-cols-4 flex-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                      value={ex.type || 'closed'}
                      onChange={(e) => updateException(idx, { type: e.target.value })}
                    >
                      <option value="closed">Cerrado</option>
                      <option value="open">Abierto (horario especial)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Desde</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={ex.startDate || ''}
                      onChange={(e) => updateException(idx, { startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Hasta (opcional)</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={ex.endDate || ''}
                      onChange={(e) => updateException(idx, { endDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Motivo (opcional)</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={ex.reason || ''}
                      onChange={(e) => updateException(idx, { reason: e.target.value })}
                      placeholder="Festivo / Vacaciones"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeException(idx)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Eliminar
                </button>
              </div>

              {ex.type === 'open' && (
                <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-700">Tramos de apertura</div>
                    <button
                      type="button"
                      onClick={() => addExceptionSlot(idx)}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Añadir tramo
                    </button>
                  </div>

                  <div className="mt-2 space-y-2">
                    {(Array.isArray(ex.slots) ? ex.slots : []).map((s, sIdx) => (
                      <div key={sIdx} className="flex flex-wrap items-center gap-2">
                        <input
                          type="time"
                          className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                          value={s.start || ''}
                          onChange={(e) => updateExceptionSlot(idx, sIdx, { start: e.target.value })}
                        />
                        <span className="text-sm text-slate-600">–</span>
                        <input
                          type="time"
                          className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                          value={s.end || ''}
                          onChange={(e) => updateExceptionSlot(idx, sIdx, { end: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => removeExceptionSlot(idx, sIdx)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <X className="h-4 w-4" />
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-slate-800">Secciones</div>
            <div className="text-xs text-slate-500">Crea categorías como Entrantes, Principales, Postres…</div>
          </div>
          <div className="flex gap-2">
            <input
              className="w-full sm:w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Nueva sección"
            />
            <button
              type="button"
              onClick={addSection}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Añadir
            </button>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {sections.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Crea tu primera sección para empezar.
          </div>
        )}

        {sections.map((section) => (
          <section key={section.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                className="w-full sm:w-[420px] text-lg font-semibold text-slate-900 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
                value={section.name}
                onChange={(e) => renameSection(section.id, e.target.value)}
                placeholder="Nombre de sección"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addItem(section.id)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Añadir plato
                </button>
                <button
                  type="button"
                  onClick={() => deleteSection(section.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Eliminar sección
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {section.items.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  Sin platos todavía.
                </div>
              )}

              {section.items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border border-slate-200 p-4 transition-opacity ${
                    item.isAvailable ? 'bg-white' : 'bg-slate-50 opacity-70'
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <input
                          className="w-full sm:flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-200"
                          value={item.name}
                          onChange={(e) => updateItem(section.id, item.id, { name: e.target.value })}
                          placeholder="Nombre del plato"
                        />

                        <div className="flex items-center gap-2">
                          <select
                            className="rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                            value={item.currency || 'EUR'}
                            onChange={(e) => updateItem(section.id, item.id, { currency: e.target.value })}
                          >
                            {currencies.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                            value={item.price}
                            onChange={(e) =>
                              updateItem(section.id, item.id, {
                                price: Number(e.target.value || 0),
                              })
                            }
                          />
                          <span className="text-sm text-slate-600">
                            {currencies.find((c) => c.code === (item.currency || 'EUR'))?.symbol || '€'}
                          </span>
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                        value={item.description}
                        onChange={(e) => updateItem(section.id, item.id, { description: e.target.value })}
                        placeholder="Descripción detallada"
                      />

                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <input
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200"
                            value={item.image || ''}
                            onChange={(e) => updateItem(section.id, item.id, { image: e.target.value })}
                            placeholder="URL imagen del plato"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                          <input
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200"
                            value={item.video || ''}
                            onChange={(e) => updateItem(section.id, item.id, { video: e.target.value })}
                            placeholder="URL video corto (mp4/webm/Reel)"
                          />
                        </div>
                      </div>

                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Salad className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <input
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200"
                            value={item.ingredients || ''}
                            onChange={(e) => updateItem(section.id, item.id, { ingredients: e.target.value })}
                            placeholder="Ingredientes separados por comas"
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            <input
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-indigo-200"
                              value={item.calories || ''}
                              onChange={(e) => updateItem(section.id, item.id, { calories: e.target.value })}
                              placeholder="kcal"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Dumbbell className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <input
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-indigo-200"
                              value={item.protein || ''}
                              onChange={(e) => updateItem(section.id, item.id, { protein: e.target.value })}
                              placeholder="prot g"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Cookie className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <input
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-indigo-200"
                              value={item.carbs || ''}
                              onChange={(e) => updateItem(section.id, item.id, { carbs: e.target.value })}
                              placeholder="carbs g"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Droplets className="h-4 w-4 text-pink-500 flex-shrink-0" />
                            <input
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-indigo-200"
                              value={item.fat || ''}
                              onChange={(e) => updateItem(section.id, item.id, { fat: e.target.value })}
                              placeholder="grasa g"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                        <label className="inline-flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                            checked={item.isVegan}
                            onChange={(e) => updateItem(section.id, item.id, { isVegan: e.target.checked })}
                          />
                          <span className="inline-flex items-center gap-1">
                            <Leaf className="h-4 w-4 text-emerald-600" />
                            Vegano
                          </span>
                        </label>

                        <label className="inline-flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-200"
                            checked={item.isVegetarian}
                            onChange={(e) => updateItem(section.id, item.id, { isVegetarian: e.target.checked })}
                          />
                          Vegetariano
                        </label>

                        <label className="inline-flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-200"
                            checked={item.isGlutenFree}
                            onChange={(e) => updateItem(section.id, item.id, { isGlutenFree: e.target.checked })}
                          />
                          Sin Gluten
                        </label>

                        <label className="inline-flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                            checked={item.isAvailable}
                            onChange={(e) => updateItem(section.id, item.id, { isAvailable: e.target.checked })}
                          />
                          Disponible
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => deleteItem(section.id, item.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Eliminar plato
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
