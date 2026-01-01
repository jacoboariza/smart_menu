import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Building2, FileCheck2, LifeBuoy, Settings2, ShieldCheck, Users } from 'lucide-react'
import { listAuditLogs, listDataProducts, toUserError } from '../lib/apiClient.js'

const SUBTABS = [
  { id: 'gestion', label: 'Gestión', icon: Settings2 },
  { id: 'ciudadano', label: 'Servicios al ciudadano', icon: Users },
]

export default function AyuntamientoPortalTab() {
  const [activeSubtab, setActiveSubtab] = useState('gestion')

  const [loading, setLoading] = useState({ products: false, audit: false })
  const [errors, setErrors] = useState({ products: null, audit: null })
  const [products, setProducts] = useState([])
  const [auditLogs, setAuditLogs] = useState([])

  const current = useMemo(() => SUBTABS.find((t) => t.id === activeSubtab) || SUBTABS[0], [activeSubtab])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading((p) => ({ ...p, products: true }))
      setErrors((e) => ({ ...e, products: null }))
      try {
        const res = await listDataProducts({ profile: 'municipality' })
        const list = Array.isArray(res?.products) ? res.products : Array.isArray(res) ? res : []
        if (!cancelled) setProducts(list)
      } catch (err) {
        if (!cancelled) setErrors((e) => ({ ...e, products: err }))
      } finally {
        if (!cancelled) setLoading((p) => ({ ...p, products: false }))
      }

      setLoading((p) => ({ ...p, audit: true }))
      setErrors((e) => ({ ...e, audit: null }))
      try {
        const res = await listAuditLogs({ profile: 'municipality' })
        const list = Array.isArray(res?.logs) ? res.logs : Array.isArray(res) ? res : []
        if (!cancelled) setAuditLogs(list.slice(-10).reverse())
      } catch (err) {
        if (!cancelled) setErrors((e) => ({ ...e, audit: err }))
      } finally {
        if (!cancelled) setLoading((p) => ({ ...p, audit: false }))
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

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

      {activeSubtab === 'gestion' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Catálogo municipal</div>
                  <div className="text-xs text-slate-500">Resumen (modo demo)</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Data products</div>
                  <div className="text-2xl font-bold text-slate-900">{loading.products ? '—' : products.length}</div>
                </div>
              </div>
              {errors.products && (
                <div className="mt-3 text-xs text-red-700">{toUserError(errors.products)}</div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Trazabilidad</div>
                  <div className="text-xs text-slate-500">Últimos eventos (modo demo)</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Eventos</div>
                  <div className="text-2xl font-bold text-slate-900">{loading.audit ? '—' : auditLogs.length}</div>
                </div>
              </div>
              {errors.audit && (
                <div className="mt-3 text-xs text-red-700">{toUserError(errors.audit)}</div>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Buscador municipal</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed flex-1">
                Restaurantes abiertos, filtros por alergias y opciones dietéticas sin depender de plataformas privadas.
              </p>
              <button
                type="button"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Ver prototipo
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <LifeBuoy className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Atención al visitante</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed flex-1">
                Recomendaciones por zona, eventos y accesibilidad con información oficial.
              </p>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                Listo para integrarse en la web del municipio.
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                  <Settings2 className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Integraciones</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed flex-1">
                Conecta con turismo, open data o apps municipales sin exponer APIs complejas.
              </p>
              <button
                type="button"
                className="w-full rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Solicitar integración
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Catálogo de servicios</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: 'Restaurantes por barrio', subtitle: 'Listado oficial con horarios y contacto' },
                { title: 'Filtro sin gluten', subtitle: 'Opciones señalizadas por restaurante y plato' },
                { title: 'Recomendaciones familiares', subtitle: 'Accesibilidad, menús infantiles y aforo' },
                { title: 'Mapa de restauración', subtitle: 'Puntos de interés y rutas gastronómicas' },
              ].map((s) => (
                <div key={s.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">{s.title}</div>
                  <div className="text-xs text-slate-600 mt-1">{s.subtitle}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
