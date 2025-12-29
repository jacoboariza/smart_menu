# Smart Menu Semantic

MVP de conectores y normalización para menús y ocupación.

## Qué hace
- Ingesta de datos de menú y eventos de ocupación vía conectores JSON.
- Staging en disco (`server/storage/data/staging.json`).
- Normalización a entidades canónicas: `normalized_menu_items.json` y `normalized_occupancy_signals.json`.
- Conectores registrados: `menu_json_v1` (source: menu), `occupancy_events_v1` (source: occupancy).
- Validación con Zod y deduplicación en normalizados.

## Quickstart (5 minutos)
1. Instala deps
   ```bash
   npm install
   ```
2. Arranca dev (Netlify Functions + Vite)
   ```bash
   npx netlify-cli dev
   ```
   - Variables requeridas: `API_KEY` (o `INGEST_API_KEY`).
   - Opcional: `X-Org-Id` en las peticiones para aislar staging/normalize por organización.
3. Ingesta datos de ejemplo
   ```bash
   export API_KEY=mykey
   curl -X POST -H "Content-Type: application/json" -H "X-API-Key: $API_KEY" \
     -d @server/connectors/fixtures/menu.sample.json \
     "http://localhost:8888/.netlify/functions/api/ingest/menu"

   curl -X POST -H "Content-Type: application/json" -H "X-API-Key: $API_KEY" \
     -d @server/connectors/fixtures/occupancy.sample.json \
     "http://localhost:8888/.netlify/functions/api/ingest/occupancy"
   ```
4. Normaliza
   ```bash
   curl -X POST -H "X-API-Key: $API_KEY" \
     "http://localhost:8888/.netlify/functions/api/normalize/run"
   ```
5. Ver resultados
   - Staging: `server/storage/data/staging.json`
   - Canónicos: `server/storage/data/normalized_menu_items.json`, `server/storage/data/normalized_occupancy_signals.json`

## Tests
```bash
npm test
```

## Estructura relevante
- `server/connectors/` conectores, registry y fixtures
- `server/domain/` esquemas Zod (menu, occupancy)
- `server/storage/` staging y normalizados
- `netlify/functions/api.js` endpoints ingest y normalize

## Auth
- Cabecera `X-API-Key` debe coincidir con `API_KEY`/`INGEST_API_KEY` en entorno.
- Cabecera opcional `X-Org-Id` para filtrar staging y normalización por organización.
