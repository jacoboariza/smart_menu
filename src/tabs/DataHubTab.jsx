import { Activity, Eye, EyeOff, RefreshCw, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { health, ingestMenu, ingestOccupancy, normalizeRun, toUserError } from '../lib/apiClient.js'
import { mapEditorStateToMenuIngest } from '../lib/mappers/menuMapper.js'

export default function DataHubTab({ editorState }) {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [orgId, setOrgId] = useState('')
  const [restaurantId, setRestaurantId] = useState('resto-1')
  const [currency, setCurrency] = useState('EUR')

  const [loading, setLoading] = useState({
    health: false,
    ingestMenu: false,
    ingestOccupancy: false,
    normalize: false,
  })

  const [lastResponse, setLastResponse] = useState(null)
  const [lastError, setLastError] = useState(null)
  const [actionLog, setActionLog] = useState([])

  function pushLog(entry) {
    setActionLog((prev) => [entry, ...prev].slice(0, 50))
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
    </div>
  )
}
