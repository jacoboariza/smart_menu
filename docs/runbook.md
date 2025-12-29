# Ingest & Normalize Runbook

## Requisitos
- Node >=18
- Netlify CLI (`npm i -g netlify-cli`) para `netlify dev`
- Variables de entorno:
  - `API_KEY` (o `INGEST_API_KEY`) para auth
  - Opcional cabecera `X-Org-Id` para aislar staging/normalize por organización

## Arranque local
```bash
npm install
netlify dev
# Netlify sirve funciones en http://localhost:8888/.netlify/functions/api
```

## Endpoints
- POST `/.netlify/functions/api/ingest/menu`
- POST `/.netlify/functions/api/ingest/occupancy`
- POST `/.netlify/functions/api/normalize/run`

## Ejemplos con fixtures

### Ingesta de menú
```bash
export API_KEY=mykey
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d @server/connectors/fixtures/menu.sample.json \
  "http://localhost:8888/.netlify/functions/api/ingest/menu"
```

### Ingesta de ocupación
```bash
export API_KEY=mykey
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d @server/connectors/fixtures/occupancy.sample.json \
  "http://localhost:8888/.netlify/functions/api/ingest/occupancy"
```

### Normalizar todo (menu + occupancy)
```bash
export API_KEY=mykey
curl -X POST \
  -H "X-API-Key: $API_KEY" \
  "http://localhost:8888/.netlify/functions/api/normalize/run"
```

## Respuestas
- 201 OK ingest: `{ "source", "stagingRecordId", "receivedAt" }`
- 200 OK normalize: `{ "processed", "menuItemsUpserted", "occupancySignalsUpserted" }`
- 400 validation_error | invalid_json
- 401 unauthorized (API Key inválida o no configurada)
- 404 connector_not_found (source desconocido)
- 500 ingest_error | normalize_error

## Ficheros persistidos
- Staging: `server/storage/data/staging.json`
- Normalizados: `server/storage/data/normalized_menu_items.json`, `normalized_occupancy_signals.json`

## Notas
- Los conectores registrados se resuelven por `source` (`menu`, `occupancy`).
- Deduplicación en normalizados: (restaurantId, id) para menú; (restaurantId, ts) para ocupación.
