import { Activity, Database, Eye, EyeOff, RefreshCw, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  buildDataProduct,
  listDataProducts,
  debugNormalized,
  debugStaging,
  health,
  ingestMenu,
  ingestOccupancy,
  normalizeRun,
  toUserError,
} from '../lib/apiClient.js'
import { mapEditorStateToMenuIngest } from '../lib/mappers/menuMapper.js'

export default function DataHubTab({ editorState }) {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [orgId, setOrgId] = useState('')
  const [restaurantId, setRestaurantId] = useState('resto-1')
  const [currency, setCurrency] = useState('EUR')

  const [dataProducts, setDataProducts] = useState([])
  const [selectedDataProduct, setSelectedDataProduct] = useState(null)
  const [dataProductsFilters, setDataProductsFilters] = useState({
    type: 'all',
    restaurantId: 'resto-1',
  })
  const [dataProductsLoading, setDataProductsLoading] = useState(false)
  const [dataProductsError, setDataProductsError] = useState(null)

  const [buildType, setBuildType] = useState('menu')
  const [policyOverridesText, setPolicyOverridesText] = useState('')
  const [buildLoading, setBuildLoading] = useState(false)
  const [buildError, setBuildError] = useState(null)

  const [loading, setLoading] = useState({
    health: false,
    ingestMenu: false,
    ingestOccupancy: false,
    normalize: false,
    demo: false,
    viewStaging: false,
    viewNormalized: false,
  })

  const [lastResponse, setLastResponse] = useState(null)
  const [lastError, setLastError] = useState(null)
  const [actionLog, setActionLog] = useState([])

  const [storageView, setStorageView] = useState(null)

  function pushLog(entry) {
    setActionLog((prev) => [entry, ...prev].slice(0, 50))
  }

  async function viewStaging(source) {
    setLastError(null)
    setStorageView(null)
    setLoading((prev) => ({ ...prev, viewStaging: true }))
    try {
      const res = await debugStaging({ apiKey, orgId: orgId || undefined, source })
      setStorageView({
        kind: 'staging',
        label: `Staging (${source})`,
        count: res?.count ?? 0,
        items: Array.isArray(res?.items) ? res.items : [],
      })
      setLastResponse(res)
      stepLog(`View staging (${source})`, 'ok')
    } catch (err) {
      setLastError(err)
      stepLog(`View staging (${source})`, 'error')
    } finally {
      setLoading((prev) => ({ ...prev, viewStaging: false }))
    }
  }

  async function onBuildDataProduct() {
    setBuildError(null)
    setLastError(null)
    setBuildLoading(true)

    try {
      const restaurantIdValue = dataProductsFilters.restaurantId || undefined

      let policyOverrides
      if (String(policyOverridesText || '').trim()) {
        try {
          policyOverrides = JSON.parse(policyOverridesText)
        } catch {
          const err = {
            code: 'client_invalid_json',
            message: 'policyOverrides no es JSON válido',
          }
          setBuildError(err)
          setLastError(err)
          return
        }
      }

      const res = await buildDataProduct({
        apiKey,
        orgId: orgId || undefined,
        type: buildType,
        restaurantId: restaurantIdValue,
        policyOverrides,
      })

      setSelectedDataProduct(res)
      setLastResponse(res)
      stepLog('Build data product', 'ok')
      await refreshDataProducts()
    } catch (err) {
      setBuildError(err)
      setLastError(err)
      stepLog('Build data product', 'error')
    } finally {
      setBuildLoading(false)
    }
  }

  async function viewNormalized(type) {
    setLastError(null)
    setStorageView(null)
    setLoading((prev) => ({ ...prev, viewNormalized: true }))
    try {
      const res = await debugNormalized({
        apiKey,
        orgId: orgId || undefined,
        type,
        restaurantId: restaurantId || undefined,
      })
      setStorageView({
        kind: 'normalized',
        label: `Normalizados (${type})`,
        count: res?.count ?? 0,
        items: Array.isArray(res?.items) ? res.items : [],
      })
      setLastResponse(res)
      stepLog(`View normalized (${type})`, 'ok')
    } catch (err) {
      setLastError(err)
      stepLog(`View normalized (${type})`, 'error')
    } finally {
      setLoading((prev) => ({ ...prev, viewNormalized: false }))
    }
  }

  function stepLog(label, status) {
    const suffix = status === 'ok' ? ' ✅' : status === 'error' ? ' ❌' : ''
    pushLog({ ts: new Date().toISOString(), action: `${label}${suffix}`, status })
  }

  async function refreshDataProducts() {
    setDataProductsError(null)
    setDataProductsLoading(true)
    try {
      const type = dataProductsFilters.type === 'all' ? undefined : dataProductsFilters.type
      const res = await listDataProducts({
        apiKey,
        orgId: orgId || undefined,
        type,
        restaurantId: dataProductsFilters.restaurantId || undefined,
      })
      const products = Array.isArray(res?.products) ? res.products : Array.isArray(res) ? res : []
      setDataProducts(products)
      setLastResponse(res)
      stepLog('List data products', 'ok')
    } catch (err) {
      setDataProductsError(err)
      setLastError(err)
      stepLog('List data products', 'error')
    } finally {
      setDataProductsLoading(false)
    }
  }

  async function runAction(label, key, fn) {
    setLastError(null)
    try {
      pushLog({ ts: new Date().toISOString(), action: label, status: 'running' })
      setLoading((prev) => ({ ...prev, [key]: true }))
      const res = await fn()
      setLastResponse(res)
      pushLog({ ts: new Date().toISOString(), action: label, status: 'ok' })
    } catch (err) {
      setLastError(err)
      pushLog({ ts: new Date().toISOString(), action: label, status: 'error' })
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  async function runDemoFlow() {
    setLastError(null)
    setLastResponse(null)
    setLoading((prev) => ({ ...prev, demo: true }))

    try {
      const headers = { apiKey, orgId: orgId || undefined }

      stepLog('Demo: ingest menu', 'running')
      const menuPayload = mapEditorStateToMenuIngest({
        editorState,
        restaurantId,
        currency,
      })
      const menuRes = await ingestMenu(menuPayload, headers)
      setLastResponse(menuRes)
      stepLog('Demo: ingest menu', 'ok')

      stepLog('Demo: ingest occupancy', 'running')
      const now = Date.now()
      const ts = (deltaMs) => new Date(now - deltaMs).toISOString()
      const occupancyPayload = {
        restaurantId,
        signals: [
          { ts: ts(2 * 60 * 60 * 1000), occupancyPct: 28 },
          { ts: ts(60 * 60 * 1000), occupancyPct: 55 },
          { ts: ts(0), occupancyPct: 42 },
        ],
      }
      const occRes = await ingestOccupancy(occupancyPayload, headers)
      setLastResponse(occRes)
      stepLog('Demo: ingest occupancy', 'ok')

      stepLog('Demo: normalize', 'running')
      const normRes = await normalizeRun(headers)
      setLastResponse(normRes)
      stepLog('Demo: normalize', 'ok')
    } catch (err) {
      setLastError(err)
      stepLog('Demo: aborted', 'error')
    } finally {
      setLoading((prev) => ({ ...prev, demo: false }))
    }
  }

  function clearCredentials() {
    setApiKey('')
    setOrgId('')
  }

  const missingApiKey = !String(apiKey || '').trim()

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Data Hub</h2>
          <p className="text-sm text-slate-500">Llama al backend (Netlify Functions) con el estado actual del editor.</p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-slate-800">Estado del almacenamiento</div>
          {storageView?.label && (
            <div className="text-xs text-slate-500">{storageView.label}</div>
          )}
        </div>

        {storageView ? (
          <>
            <div className="text-sm text-slate-700 mb-3">
              Conteo: <span className="font-semibold">{storageView.count}</span>
            </div>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-80">
              {JSON.stringify(storageView.items.slice(0, 5), null, 2)}
            </pre>
          </>
        ) : (
          <div className="text-sm text-slate-500">—</div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-slate-800">Credenciales</div>
          <button
            type="button"
            onClick={clearCredentials}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpiar credenciales
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">API Key</label>
            <div className="flex gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="mykey"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                title={showApiKey ? 'Ocultar' : 'Mostrar'}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">Se guarda solo en estado React (no se persiste).</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">OrgId</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="org-1"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">RestaurantId</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              placeholder="resto-1"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Currency</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="EUR"
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      {missingApiKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Falta la <strong>API Key</strong>. Añádela para poder llamar al backend.
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-semibold text-slate-800 mb-4">Acciones</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              runAction('Health', 'health', () => health({ apiKey, orgId: orgId || undefined }))
            }
            disabled={missingApiKey || loading.health}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Activity className="h-4 w-4" />
            {loading.health ? 'Cargando…' : 'Health'}
          </button>

          <button
            type="button"
            onClick={() =>
              runAction('Ingest menu (from editor)', 'ingestMenu', async () => {
                const payload = mapEditorStateToMenuIngest({
                  editorState,
                  restaurantId,
                  currency,
                })

                return ingestMenu(payload, { apiKey, orgId: orgId || undefined })
              })
            }
            disabled={missingApiKey || loading.ingestMenu}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-2 text-sm font-medium text-white hover:from-indigo-600 hover:to-violet-600 transition-all shadow-sm disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {loading.ingestMenu ? 'Enviando…' : 'Ingest menú (desde editor)'}
          </button>

          <button
            type="button"
            onClick={() =>
              runAction('Ingest occupancy (demo)', 'ingestOccupancy', async () => {
                const now = Date.now()
                const ts = (deltaMs) => new Date(now - deltaMs).toISOString()
                const payload = {
                  restaurantId,
                  signals: [
                    {
                      ts: ts(2 * 60 * 60 * 1000),
                      occupancyPct: 28,
                    },
                    {
                      ts: ts(60 * 60 * 1000),
                      occupancyPct: 55,
                    },
                    {
                      ts: ts(0),
                      occupancyPct: 42,
                    },
                  ],
                }

                return ingestOccupancy(payload, { apiKey, orgId: orgId || undefined })
              })
            }
            disabled={missingApiKey || loading.ingestOccupancy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {loading.ingestOccupancy ? 'Enviando…' : 'Ingest ocupación (demo)'}
          </button>

          <button
            type="button"
            onClick={() =>
              runAction('Normalize', 'normalize', () => normalizeRun({ apiKey, orgId: orgId || undefined }))
            }
            disabled={missingApiKey || loading.normalize}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-sm font-medium text-white hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            {loading.normalize ? 'Procesando…' : 'Normalize'}
          </button>

          <button
            type="button"
            onClick={runDemoFlow}
            disabled={missingApiKey || loading.demo}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-sm font-medium text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading.demo ? 'animate-spin' : ''}`} />
            {loading.demo ? 'Ejecutando demo…' : 'Run demo (menu+occupancy+normalize)'}
          </button>

          <button
            type="button"
            onClick={() => viewStaging('menu')}
            disabled={missingApiKey || loading.viewStaging}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Database className="h-4 w-4" />
            {loading.viewStaging ? 'Cargando…' : 'Ver staging (menu)'}
          </button>

          <button
            type="button"
            onClick={() => viewStaging('occupancy')}
            disabled={missingApiKey || loading.viewStaging}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Database className="h-4 w-4" />
            {loading.viewStaging ? 'Cargando…' : 'Ver staging (occupancy)'}
          </button>

          <button
            type="button"
            onClick={() => viewNormalized('menu')}
            disabled={missingApiKey || loading.viewNormalized}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Database className="h-4 w-4" />
            {loading.viewNormalized ? 'Cargando…' : 'Ver normalizados (menu)'}
          </button>

          <button
            type="button"
            onClick={() => viewNormalized('occupancy')}
            disabled={missingApiKey || loading.viewNormalized}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Database className="h-4 w-4" />
            {loading.viewNormalized ? 'Cargando…' : 'Ver normalizados (occupancy)'}
          </button>
        </div>

        <div className="mt-4 text-[11px] text-slate-500">
          Tip: si estás usando Netlify Dev, puedes configurar <code className="font-mono">VITE_API_BASE_URL</code>.
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-semibold text-slate-800 mb-3">Última respuesta</div>
          <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-80">
            {lastResponse ? JSON.stringify(lastResponse, null, 2) : '—'}
          </pre>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-semibold text-slate-800 mb-3">Errores</div>
          {lastError ? (
            <>
              <div className="text-sm text-red-700 mb-2">{toUserError(lastError)}</div>
              <pre className="text-xs bg-red-50 border border-red-200 rounded-lg p-3 overflow-auto max-h-80">
                {JSON.stringify(
                  {
                    status: lastError.status,
                    code: lastError.code,
                    message: lastError.message,
                    details: lastError.details,
                  },
                  null,
                  2,
                )}
              </pre>
            </>
          ) : (
            <div className="text-sm text-slate-500">—</div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-semibold text-slate-800 mb-3">Log de acciones</div>
        {actionLog.length ? (
          <div className="space-y-2">
            {actionLog.map((e, idx) => (
              <div
                key={`${e.ts}-${idx}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="text-xs text-slate-700">
                  <span className="font-mono text-slate-500">{e.ts}</span> — {e.action}
                </div>
                <div
                  className={`text-xs font-semibold ${
                    e.status === 'ok'
                      ? 'text-emerald-700'
                      : e.status === 'error'
                        ? 'text-red-700'
                        : 'text-slate-600'
                  }`}
                >
                  {e.status}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500">—</div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-slate-800">Data Products</div>
          <button
            type="button"
            onClick={refreshDataProducts}
            disabled={missingApiKey || dataProductsLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${dataProductsLoading ? 'animate-spin' : ''}`} />
            {dataProductsLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-800">Build</div>
            <button
              type="button"
              onClick={onBuildDataProduct}
              disabled={missingApiKey || buildLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-2 text-xs font-medium text-white hover:from-indigo-600 hover:to-violet-600 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${buildLoading ? 'animate-spin' : ''}`} />
              {buildLoading ? 'Building…' : 'Build'}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">type</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={buildType}
                onChange={(e) => setBuildType(e.target.value)}
              >
                <option value="menu">menu</option>
                <option value="occupancy">occupancy</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">restaurantId</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={dataProductsFilters.restaurantId}
                onChange={(e) =>
                  setDataProductsFilters((prev) => ({
                    ...prev,
                    restaurantId: e.target.value,
                  }))
                }
                placeholder="resto-1"
                autoComplete="off"
              />
              <div className="mt-2 text-[11px] text-slate-500">Se usa el mismo restaurantId del filtro de arriba.</div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">policyOverrides (JSON, opcional)</label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-200 min-h-24"
              value={policyOverridesText}
              onChange={(e) => setPolicyOverridesText(e.target.value)}
              placeholder='{"allowedPurposes":["analytics"],"retentionDays":30}'
            />
          </div>

          {buildError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {toUserError(buildError)}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">type</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={dataProductsFilters.type}
              onChange={(e) =>
                setDataProductsFilters((prev) => ({
                  ...prev,
                  type: e.target.value,
                }))
              }
            >
              <option value="all">all</option>
              <option value="menu">menu</option>
              <option value="occupancy">occupancy</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">restaurantId</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={dataProductsFilters.restaurantId}
              onChange={(e) =>
                setDataProductsFilters((prev) => ({
                  ...prev,
                  restaurantId: e.target.value,
                }))
              }
              placeholder="resto-1"
              autoComplete="off"
            />
          </div>
        </div>

        {dataProductsError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {toUserError(dataProductsError)}
          </div>
        )}

        <div className="mt-4 overflow-auto">
          {dataProducts.length ? (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3 font-medium">id</th>
                  <th className="py-2 pr-3 font-medium">type</th>
                  <th className="py-2 pr-3 font-medium">version</th>
                  <th className="py-2 pr-3 font-medium">title</th>
                  <th className="py-2 pr-3 font-medium">restaurantId</th>
                  <th className="py-2 pr-3 font-medium">createdAt</th>
                  <th className="py-2 pr-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {dataProducts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-mono text-xs text-slate-700">{p.id}</td>
                    <td className="py-2 pr-3 text-slate-700">{p.type}</td>
                    <td className="py-2 pr-3 text-slate-700">{p.version}</td>
                    <td className="py-2 pr-3 text-slate-700">{p?.metadata?.title}</td>
                    <td className="py-2 pr-3 text-slate-700">{p?.metadata?.restaurantId}</td>
                    <td className="py-2 pr-3 text-slate-700">{p.createdAt}</td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => setSelectedDataProduct(p)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-sm text-slate-500">—</div>
          )}
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-700 mb-2">selectedDataProduct</div>
          <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-64">
            {selectedDataProduct ? JSON.stringify(selectedDataProduct, null, 2) : '—'}
          </pre>
        </div>
      </section>
    </div>
  )
}
