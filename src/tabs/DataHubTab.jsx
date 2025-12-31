import { Activity, Database, Eye, EyeOff, RefreshCw, Send, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import ActionButton from '../components/ActionButton.jsx'
import Card from '../components/Card.jsx'
import Field from '../components/Field.jsx'
import JsonViewer from '../components/JsonViewer.jsx'
import {
  buildDataProduct,
  listDataProducts,
  consumeProduct,
  publishProduct,
  listAuditLogs,
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

  const [rolesSelected, setRolesSelected] = useState(['restaurant'])

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

  const [publishSpace, setPublishSpace] = useState('segittur-mock')
  const [publishLoading, setPublishLoading] = useState(false)
  const [publishError, setPublishError] = useState(null)
  const [publishedStatus, setPublishedStatus] = useState({})

  const [consumePurpose, setConsumePurpose] = useState('discovery')
  const [consumeLoading, setConsumeLoading] = useState(false)
  const [consumeError, setConsumeError] = useState(null)
  const [consumeResult, setConsumeResult] = useState(null)

  const [auditFilters, setAuditFilters] = useState({
    action: 'all',
    space: 'all',
    productId: '',
    since: '',
  })
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])

  const [dataSpaceDemoLoading, setDataSpaceDemoLoading] = useState(false)

  useEffect(() => {
    try {
      const storedOrgId = sessionStorage.getItem('dataHub.orgId')
      const storedRestaurantId = sessionStorage.getItem('dataHub.restaurantId')
      const storedCurrency = sessionStorage.getItem('dataHub.currency')
      const storedSpace = sessionStorage.getItem('dataHub.lastSpace')
      const storedPurpose = sessionStorage.getItem('dataHub.lastPurpose')

      if (storedOrgId !== null) setOrgId(storedOrgId)
      if (storedRestaurantId !== null) {
        setRestaurantId(storedRestaurantId)
        setDataProductsFilters((prev) => ({ ...prev, restaurantId: storedRestaurantId }))
      }
      if (storedCurrency !== null) setCurrency(storedCurrency)
      if (storedSpace !== null) setPublishSpace(storedSpace)
      if (storedPurpose !== null) setConsumePurpose(storedPurpose)
    } catch {
      // ignore sessionStorage errors
    }
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem('dataHub.orgId', orgId || '')
    } catch {
      // ignore sessionStorage errors
    }
  }, [orgId])

  useEffect(() => {
    try {
      sessionStorage.setItem('dataHub.restaurantId', restaurantId || '')
    } catch {
      // ignore sessionStorage errors
    }
  }, [restaurantId])

  useEffect(() => {
    try {
      sessionStorage.setItem('dataHub.currency', currency || '')
    } catch {
      // ignore sessionStorage errors
    }
  }, [currency])

  useEffect(() => {
    try {
      sessionStorage.setItem('dataHub.lastSpace', publishSpace || '')
    } catch {
      // ignore sessionStorage errors
    }
  }, [publishSpace])

  useEffect(() => {
    try {
      sessionStorage.setItem('dataHub.lastPurpose', consumePurpose || '')
    } catch {
      // ignore sessionStorage errors
    }
  }, [consumePurpose])

  useEffect(() => {
    if (!selectedDataProduct?.id) return
    setAuditFilters((prev) => {
      if (String(prev.productId || '').trim()) return prev
      return { ...prev, productId: selectedDataProduct.id }
    })
  }, [selectedDataProduct?.id])

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

  function setSingleRole(role) {
    setRolesSelected([role])
  }

  function toggleRole(role) {
    setRolesSelected((prev) => {
      const set = new Set(prev)
      if (set.has(role)) set.delete(role)
      else set.add(role)
      return Array.from(set)
    })
  }

  function onAuditAutofillFromSelected() {
    setAuditFilters((prev) => ({
      ...prev,
      productId: selectedDataProduct?.id || prev.productId,
      space: publishSpace || prev.space,
    }))
  }

  async function onFetchAuditLogs() {
    setAuditError(null)
    setLastError(null)
    setAuditLoading(true)

    try {
      const action = auditFilters.action === 'all' ? undefined : auditFilters.action
      const space = auditFilters.space === 'all' ? undefined : auditFilters.space
      const productId = String(auditFilters.productId || '').trim() || undefined
      const since = auditFilters.since ? new Date(auditFilters.since).toISOString() : undefined

      const res = await listAuditLogs({
        apiKey,
        orgId: orgId || undefined,
        roles: rolesSelected,
        action,
        space,
        productId,
        since,
      })

      const logs = Array.isArray(res?.logs) ? res.logs : Array.isArray(res) ? res : []
      setAuditLogs(logs)
      setLastResponse(res)
      stepLog('Audit logs', 'ok')
    } catch (err) {
      setAuditError(err)
      setLastError(err)
      stepLog('Audit logs', 'error')
    } finally {
      setAuditLoading(false)
    }
  }

  async function onConsumeSelectedProduct() {
    setConsumeError(null)
    setLastError(null)
    setConsumeResult(null)
    setConsumeLoading(true)

    const productId = selectedDataProduct?.id
    if (!productId) {
      const err = { code: 'missing_product_id', message: 'No hay data product seleccionado' }
      setConsumeError(err)
      setLastError(err)
      setConsumeLoading(false)
      return
    }

    try {
      const res = await consumeProduct({
        apiKey,
        orgId: orgId || undefined,
        roles: rolesSelected,
        space: publishSpace,
        productId,
        purpose: consumePurpose,
      })

      setConsumeResult(res)
      setLastResponse(res)
      stepLog(`CONSUME (${publishSpace})`, 'ok')
    } catch (err) {
      setConsumeError(err)
      setLastError(err)
      stepLog(`CONSUME (${publishSpace})`, 'error')
    } finally {
      setConsumeLoading(false)
    }
  }

  async function viewStaging(source) {
    setLastError(null)
    setStorageView(null)
    setLoading((prev) => ({ ...prev, viewStaging: true }))
    try {
      const res = await debugStaging({ apiKey, orgId: orgId || undefined, roles: rolesSelected, source })
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

  async function onPublishSelectedProduct() {
    setPublishError(null)
    setLastError(null)
    setPublishLoading(true)

    const productId = selectedDataProduct?.id
    if (!productId) {
      const err = { code: 'missing_product_id', message: 'No hay data product seleccionado' }
      setPublishError(err)
      setLastError(err)
      setPublishLoading(false)
      return
    }

    try {
      const res = await publishProduct({
        apiKey,
        orgId: orgId || undefined,
        roles: rolesSelected,
        space: publishSpace,
        productId,
      })

      setLastResponse(res)
      setPublishedStatus((prev) => ({
        ...prev,
        [publishSpace]: {
          ok: true,
          ts: new Date().toISOString(),
          result: res,
        },
      }))
      stepLog(`PUBLISH (${publishSpace})`, 'ok')
    } catch (err) {
      setPublishError(err)
      setLastError(err)
      setPublishedStatus((prev) => ({
        ...prev,
        [publishSpace]: {
          ok: false,
          ts: new Date().toISOString(),
          error: {
            status: err?.status,
            code: err?.code,
            message: err?.message,
          },
        },
      }))
      stepLog(`PUBLISH (${publishSpace})`, 'error')
    } finally {
      setPublishLoading(false)
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
        roles: rolesSelected,
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
        roles: rolesSelected,
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

  async function runTimedStep(label, fn, { allow403 = false } = {}) {
    const start = performance.now()
    try {
      const res = await fn()
      const ms = Math.round(performance.now() - start)
      stepLog(`${label} (${ms}ms)`, 'ok')
      return { ok: true, res }
    } catch (err) {
      const ms = Math.round(performance.now() - start)
      if (allow403 && err?.status === 403) {
        stepLog(`${label} — DENIED (${ms}ms)`, 'ok')
        return { ok: false, denied: true, err }
      }
      stepLog(`${label} (${ms}ms)`, 'error')
      throw err
    }
  }

  async function runDataSpaceDemoMenu() {
    setLastError(null)
    setAuditError(null)
    setPublishError(null)
    setConsumeError(null)
    setBuildError(null)
    setDataSpaceDemoLoading(true)

    try {
      const demoSpace = 'segittur-mock'
      const rid = restaurantId || dataProductsFilters.restaurantId || undefined

      setPublishSpace(demoSpace)

      const headers = { apiKey, orgId: orgId || undefined, roles: rolesSelected }
      setConsumePurpose('discovery')
      stepLog('Data-space demo (menu): start', 'running')

      const build = await runTimedStep('Build data product', async () => {
        return buildDataProduct({
          ...headers,
          type: 'menu',
          restaurantId: rid,
        })
      })

      const product = build.res
      setSelectedDataProduct(product)
      setLastResponse(product)

      await runTimedStep('Refresh data products', async () => refreshDataProducts())

      const publish = await runTimedStep(`Publish to ${demoSpace}`, async () => {
        return publishProduct({
          ...headers,
          space: demoSpace,
          productId: product.id,
        })
      })

      setLastResponse(publish.res)
      setPublishedStatus((prev) => ({
        ...prev,
        [demoSpace]: {
          ok: true,
          ts: new Date().toISOString(),
          result: publish.res,
        },
      }))

      const consumeAllow = await runTimedStep('Consume (allow)', async () => {
        return consumeProduct({
          ...headers,
          space: demoSpace,
          productId: product.id,
          purpose: 'discovery',
        })
      })

      setConsumeResult(consumeAllow.res)
      setLastResponse(consumeAllow.res)

      const consumeDeny = await runTimedStep(
        'Consume (deny)',
        async () => {
          return consumeProduct({
            ...headers,
            space: demoSpace,
            productId: product.id,
            purpose: 'ads-targeting',
          })
        },
        { allow403: true },
      )

      if (consumeDeny.denied) {
        setConsumeError(consumeDeny.err)
        setLastError(consumeDeny.err)
      }

      setAuditFilters((prev) => ({
        ...prev,
        action: 'all',
        space: demoSpace,
        productId: product.id,
      }))

      await runTimedStep('Fetch audit logs', async () => onFetchAuditLogs())

      stepLog('Data-space demo (menu): done', 'ok')
    } catch (err) {
      setLastError(err)
      stepLog('Data-space demo (menu): aborted', 'error')
    } finally {
      setDataSpaceDemoLoading(false)
    }
  }

  async function refreshDataProducts() {
    setDataProductsError(null)
    setDataProductsLoading(true)
    try {
      const type = dataProductsFilters.type === 'all' ? undefined : dataProductsFilters.type
      const res = await listDataProducts({
        apiKey,
        orgId: orgId || undefined,
        roles: rolesSelected,
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
      const headers = { apiKey, orgId: orgId || undefined, roles: rolesSelected }

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

      <Card as="section">
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
            <JsonViewer value={storageView.items.slice(0, 5)} />
          </>
        ) : (
          <div className="text-sm text-slate-500">—</div>
        )}
      </Card>

      <Card as="section">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-slate-800">Credenciales</div>
          <ActionButton
            onClick={clearCredentials}
            className="border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            icon={<Trash2 className="h-3.5 w-3.5" />}
          >
            Limpiar credenciales
          </ActionButton>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="API Key" hint="Se guarda solo en estado React (no se persiste).">
            <div className="flex gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="mykey"
                autoComplete="off"
              />
              <ActionButton
                onClick={() => setShowApiKey((v) => !v)}
                className="border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                icon={showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              />
            </div>
          </Field>

          <Field label="OrgId">
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="org-1"
              autoComplete="off"
            />
          </Field>

          <Field label="RestaurantId">
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              placeholder="resto-1"
              autoComplete="off"
            />
          </Field>

          <Field label="Currency">
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="EUR"
              autoComplete="off"
            />
          </Field>

          <Field label="Roles">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  onClick={() => setSingleRole('restaurant')}
                  className="border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Perfil Restaurante
                </ActionButton>
                <ActionButton
                  onClick={() => setSingleRole('destination')}
                  className="border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Perfil Destino
                </ActionButton>
                <ActionButton
                  onClick={() => setSingleRole('marketplace')}
                  className="border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Perfil Marketplace
                </ActionButton>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {['restaurant', 'destination', 'marketplace', 'admin'].map((role) => (
                  <label key={role} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={rolesSelected.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="h-4 w-4"
                    />
                    <span className="text-slate-700">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          </Field>
        </div>
      </Card>

      {missingApiKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Falta la <strong>API Key</strong>. Añádela para poder llamar al backend.
        </div>
      )}

      <Card as="section">
        <div className="text-sm font-semibold text-slate-800 mb-4">Acciones</div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() =>
              runAction('Health', 'health', () => health({ apiKey, orgId: orgId || undefined, roles: rolesSelected }))
            }
            disabled={missingApiKey}
            loading={loading.health}
            loadingText="Cargando…"
            className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            icon={<Activity className="h-4 w-4" />}
          >
            Health
          </ActionButton>

          <ActionButton
            onClick={() =>
              runAction('Ingest menu (from editor)', 'ingestMenu', async () => {
                const payload = mapEditorStateToMenuIngest({
                  editorState,
                  restaurantId,
                  currency,
                })

                return ingestMenu(payload, { apiKey, orgId: orgId || undefined, roles: rolesSelected })
              })
            }
            disabled={missingApiKey}
            loading={loading.ingestMenu}
            loadingText="Enviando…"
            className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 transition-all shadow-sm"
            icon={<Send className="h-4 w-4" />}
          >
            Ingest menú (desde editor)
          </ActionButton>

          <ActionButton
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

                return ingestOccupancy(payload, { apiKey, orgId: orgId || undefined, roles: rolesSelected })
              })
            }
            disabled={missingApiKey}
            loading={loading.ingestOccupancy}
            loadingText="Enviando…"
            className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            icon={<Send className="h-4 w-4" />}
          >
            Ingest ocupación (demo)
          </ActionButton>

          <ActionButton
            onClick={() =>
              runAction('Normalize', 'normalize', () =>
                normalizeRun({ apiKey, orgId: orgId || undefined, roles: rolesSelected }),
              )
            }
            disabled={missingApiKey}
            loading={loading.normalize}
            loadingText="Procesando…"
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm"
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Normalize
          </ActionButton>

          <ActionButton
            onClick={runDemoFlow}
            disabled={missingApiKey}
            loading={loading.demo}
            loadingText="Ejecutando demo…"
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Run demo (menu+occupancy+normalize)
          </ActionButton>

          <ActionButton
            onClick={() => viewStaging('menu')}
            disabled={missingApiKey}
            loading={loading.viewStaging}
            loadingText="Cargando…"
            className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            icon={<Database className="h-4 w-4" />}
          >
            Ver staging (menu)
          </ActionButton>

          <ActionButton
            onClick={() => viewStaging('occupancy')}
            disabled={missingApiKey}
            loading={loading.viewStaging}
            loadingText="Cargando…"
            className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            icon={<Database className="h-4 w-4" />}
          >
            Ver staging (occupancy)
          </ActionButton>

          <ActionButton
            onClick={() => viewNormalized('menu')}
            disabled={missingApiKey}
            loading={loading.viewNormalized}
            loadingText="Cargando…"
            className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            icon={<Database className="h-4 w-4" />}
          >
            Ver normalizados (menu)
          </ActionButton>

          <ActionButton
            onClick={() => viewNormalized('occupancy')}
            disabled={missingApiKey}
            loading={loading.viewNormalized}
            loadingText="Cargando…"
            className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            icon={<Database className="h-4 w-4" />}
          >
            Ver normalizados (occupancy)
          </ActionButton>
        </div>

        <div className="mt-4 text-[11px] text-slate-500">
          Tip: si estás usando Netlify Dev, puedes configurar <code className="font-mono">VITE_API_BASE_URL</code>.
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card as="section">
          <div className="text-sm font-semibold text-slate-800 mb-3">Última respuesta</div>
          <JsonViewer value={lastResponse} />
        </Card>

        <Card as="section">
          <div className="text-sm font-semibold text-slate-800 mb-3">Errores</div>
          {lastError ? (
            <>
              <div className="text-sm text-red-700 mb-2">{toUserError(lastError)}</div>
              <JsonViewer
                className="bg-red-50 border-red-200"
                value={{
                  status: lastError.status,
                  code: lastError.code,
                  message: lastError.message,
                  details: lastError.details,
                }}
              />
            </>
          ) : (
            <div className="text-sm text-slate-500">—</div>
          )}
        </Card>
      </div>

      <Card as="section">
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
      </Card>

      <Card as="section">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-slate-800">Data Products</div>
          <div className="flex items-center gap-2">
            <ActionButton
              onClick={runDataSpaceDemoMenu}
              disabled={missingApiKey}
              loading={dataSpaceDemoLoading}
              loadingText="Running…"
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 transition-all shadow-sm text-xs"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Run data-space demo (menu)
            </ActionButton>

            <ActionButton
              onClick={refreshDataProducts}
              disabled={missingApiKey}
              loading={dataProductsLoading}
              loadingText="Refreshing…"
              className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-xs"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </ActionButton>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-800">Build</div>
            <ActionButton
              onClick={onBuildDataProduct}
              disabled={missingApiKey}
              loading={buildLoading}
              loadingText="Building…"
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 transition-all shadow-sm text-xs"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Build
            </ActionButton>
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
                      <ActionButton
                        onClick={() => setSelectedDataProduct(p)}
                        className="border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Select
                      </ActionButton>
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
          <JsonViewer value={selectedDataProduct} maxHeightClassName="max-h-64" />
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-800">Publish</div>
            <ActionButton
              onClick={onPublishSelectedProduct}
              disabled={missingApiKey || !selectedDataProduct?.id}
              loading={publishLoading}
              loadingText="Publishing…"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm text-xs"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Publish selected
            </ActionButton>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">space</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={publishSpace}
                onChange={(e) => setPublishSpace(e.target.value)}
              >
                <option value="segittur-mock">SEGITTUR (mock)</option>
                <option value="gaiax-mock">GAIA-X (mock)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs font-medium text-slate-600 mb-1">Estado por space</div>
              <div className="flex flex-wrap gap-2">
                {['segittur-mock', 'gaiax-mock'].map((space) => {
                  const status = publishedStatus?.[space]
                  const label = status
                    ? status.ok
                      ? `✅ ${space} — ${status.ts}`
                      : `❌ ${space} — ${status.ts}`
                    : `${space} — —`

                  return (
                    <span
                      key={space}
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        !status
                          ? 'border-slate-200 bg-white text-slate-600'
                          : status.ok
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-red-200 bg-red-50 text-red-800'
                      }`}
                      title={status?.ok ? 'Último publish OK' : status ? 'Último publish FAILED' : 'Sin publish'}
                    >
                      {label}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          {publishError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {toUserError(publishError)}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-800">Consume</div>
            <ActionButton
              onClick={onConsumeSelectedProduct}
              disabled={missingApiKey || !selectedDataProduct?.id}
              loading={consumeLoading}
              loadingText="Consuming…"
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm text-xs"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Consume selected
            </ActionButton>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">space</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={publishSpace}
                onChange={(e) => setPublishSpace(e.target.value)}
              >
                <option value="segittur-mock">SEGITTUR (mock)</option>
                <option value="gaiax-mock">GAIA-X (mock)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-600">purpose</label>
                <select
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                  value={consumePurpose}
                  onChange={(e) => setConsumePurpose(e.target.value)}
                  title="Template selector"
                >
                  <option value="discovery">discovery</option>
                  <option value="recommendation">recommendation</option>
                  <option value="analytics">analytics</option>
                  <option value="ads-targeting">ads-targeting</option>
                </select>
              </div>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={consumePurpose}
                onChange={(e) => setConsumePurpose(e.target.value)}
                placeholder="discovery"
                autoComplete="off"
              />
            </div>
          </div>

          {consumeError?.status === 403 ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="text-sm font-semibold text-amber-800">DENIED</div>
              <div className="mt-1 text-sm text-amber-800">
                {consumeError?.message || consumeError?.details?.message || 'Acceso denegado'}
              </div>
            </div>
          ) : consumeError ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {toUserError(consumeError)}
            </div>
          ) : null}

          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-700 mb-2">result</div>
            <JsonViewer value={consumeResult} maxHeightClassName="max-h-64" />
          </div>
        </div>
      </Card>

      <Card as="section">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-slate-800">Audit Logs</div>
          <div className="flex items-center gap-2">
            <ActionButton
              onClick={onAuditAutofillFromSelected}
              disabled={!selectedDataProduct?.id}
              className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-xs"
            >
              Auto-fill from selected
            </ActionButton>

            <ActionButton
              onClick={onFetchAuditLogs}
              disabled={missingApiKey}
              loading={auditLoading}
              loadingText="Fetching…"
              className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-xs"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Fetch logs
            </ActionButton>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">action</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={auditFilters.action}
              onChange={(e) => setAuditFilters((prev) => ({ ...prev, action: e.target.value }))}
            >
              <option value="all">all</option>
              <option value="PUBLISH">PUBLISH</option>
              <option value="CONSUME">CONSUME</option>
              <option value="INGEST">INGEST</option>
              <option value="NORMALIZE">NORMALIZE</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">space</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={auditFilters.space}
              onChange={(e) => setAuditFilters((prev) => ({ ...prev, space: e.target.value }))}
            >
              <option value="all">all</option>
              <option value="segittur-mock">SEGITTUR (mock)</option>
              <option value="gaiax-mock">GAIA-X (mock)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">productId</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={auditFilters.productId}
              onChange={(e) => setAuditFilters((prev) => ({ ...prev, productId: e.target.value }))}
              placeholder={selectedDataProduct?.id ? selectedDataProduct.id : 'product-id'}
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">since</label>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={auditFilters.since}
              onChange={(e) => setAuditFilters((prev) => ({ ...prev, since: e.target.value }))}
            />
          </div>
        </div>

        {auditError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {toUserError(auditError)}
          </div>
        )}

        <div className="mt-4">
          {auditLogs.length ? (
            <div className="space-y-2">
              {auditLogs.map((l, idx) => {
                const ts = l.ts || l.at || l.createdAt || ''
                const actorOrg = l.actorOrg || l.actorOrgId || l.orgId || ''
                const action = l.action || ''
                const space = l.space || ''
                const decision = (l.decision || l.result || l.outcome || '').toString().toLowerCase()
                const reason = l.reason || l.message || l.details?.reason || l.details?.message || ''
                const isDenied = decision === 'deny' || decision === 'denied' || l.status === 403

                return (
                  <div
                    key={`${ts}-${idx}`}
                    className={`rounded-lg border px-3 py-2 ${
                      isDenied ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-slate-700">
                        <span className="font-mono text-slate-500">{ts}</span>
                        {actorOrg ? <span className="text-slate-500"> — {actorOrg}</span> : null}
                      </div>
                      {decision ? (
                        <div
                          className={`text-xs font-semibold ${
                            isDenied ? 'text-red-800' : 'text-emerald-700'
                          }`}
                        >
                          {isDenied ? 'DENY' : decision.toUpperCase()}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-1 text-sm text-slate-800">
                      <span className="font-semibold">{action || '—'}</span>
                      {space ? <span className="text-slate-500"> — {space}</span> : null}
                    </div>

                    {reason ? (
                      <div className={`mt-1 text-sm ${isDenied ? 'text-red-800' : 'text-slate-700'}`}>{reason}</div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-500">—</div>
          )}
        </div>
      </Card>
    </div>
  )
}
