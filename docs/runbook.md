# Ingest & Normalize Runbook

## Requisitos
- Node >=18
- Netlify CLI (`npm i -g netlify-cli`) para `netlify dev`

## Variables de entorno
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `API_KEY` | API key para autenticación (o `INGEST_API_KEY`) | `mykey` |

## Headers opcionales
| Header | Descripción | Ejemplo |
|--------|-------------|---------|
| `X-Org-Id` | ID de organización para aislar datos | `org-1` |
| `X-Roles` | Roles del actor (comma-separated) | `destination,marketplace` |

## Arranque local
```bash
npm install
export API_KEY=mykey
netlify dev
# Netlify sirve funciones en http://localhost:8888/.netlify/functions/api
```

## Endpoints
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/ingest/menu` | Ingesta menú |
| POST | `/ingest/occupancy` | Ingesta ocupación |
| POST | `/normalize/run` | Normaliza staging a canónicos |
| GET | `/data-products` | Lista data products (query: `type`, `restaurantId`) |
| POST | `/data-products/build` | Construye data product desde normalizados |
| POST | `/publish/:space` | Publica data product a space |
| POST | `/consume/:space/:productId` | Consume data product |
| GET | `/audit/logs` | Lista eventos de auditoría |
| GET | `/debug/staging` | Debug staging (query: `source`, `orgId`) |
| GET | `/debug/normalized` | Debug normalizados (query: `type`, `restaurantId`) |

---

# End-to-End Demo

## Setup
```bash
export API_KEY=mykey
export BASE_URL="http://localhost:8888/.netlify/functions/api"
```

## 1. Ingest Menu
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Org-Id: org-demo" \
  -d '{
    "restaurantId": "resto-demo",
    "currency": "EUR",
    "items": [
      {
        "id": "dish-1",
        "name": "Paella Valenciana",
        "description": "Arroz con mariscos",
        "price": 18.50,
        "category": "Principales",
        "allergens": ["gluten", "mariscos"],
        "glutenFree": false,
        "vegan": false
      }
    ]
  }' \
  "$BASE_URL/ingest/menu"
```
Respuesta: `201 { "source": "menu", "stagingRecordId": "...", "receivedAt": "..." }`

## 2. Ingest Occupancy
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Org-Id: org-demo" \
  -d '{
    "restaurantId": "resto-demo",
    "signals": [
      { "ts": "2025-01-15T13:00:00Z", "occupiedSeats": 45, "capacitySeats": 100 }
    ]
  }' \
  "$BASE_URL/ingest/occupancy"
```
Respuesta: `201 { "source": "occupancy", "stagingRecordId": "...", "receivedAt": "..." }`

## 3. Normalize (staging → canónicos)
```bash
curl -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "X-Org-Id: org-demo" \
  "$BASE_URL/normalize/run"
```
Respuesta: `200 { "processed": 2, "menuItemsUpserted": 1, "occupancySignalsUpserted": 1 }`

## 4. Build Data Product (programático)
Los builders se invocan desde código:
```javascript
import { buildMenuProduct } from './server/products/buildMenuProduct.js'

const product = await buildMenuProduct({
  restaurantId: 'resto-demo',
  identity: { orgId: 'org-demo', roles: ['destination'] }
})
console.log('Product ID:', product.id)
```
El producto se guarda en `server/storage/data/data_products.json`.

## 5. Publish to Space
```bash
# Reemplaza PRODUCT_ID con el UUID del data product
export PRODUCT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Org-Id: org-demo" \
  -H "X-Roles: destination" \
  -d "{\"productId\": \"$PRODUCT_ID\"}" \
  "$BASE_URL/publish/segittur"
```
Respuesta: `200 { "space": "segittur", "productId": "..." }`

## 6. Consume (allowed purpose)
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Org-Id: org-consumer" \
  -H "X-Roles: destination" \
  -d '{"purpose": "analytics"}' \
  "$BASE_URL/consume/segittur/$PRODUCT_ID"
```
Respuesta: `200 { "dataProduct": {...}, "payload": [...] }`

## 7. Consume (denied purpose)
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Org-Id: org-consumer" \
  -H "X-Roles: destination" \
  -d '{"purpose": "marketing"}' \
  "$BASE_URL/consume/segittur/$PRODUCT_ID"
```
Respuesta: `403 { "error": { "code": "access_denied", "message": "purpose 'marketing' not allowed" } }`

### Ejemplos de purpose

- Permitidos por defecto: `discovery`, `recommendation`, `analytics`
- No permitido (para probar deny): `ads-targeting` (o cualquier otro fuera de la lista)

## 8. Audit Logs
```bash
# Todos los logs
curl -H "X-API-Key: $API_KEY" "$BASE_URL/audit/logs"

# Filtrar por action
curl -H "X-API-Key: $API_KEY" "$BASE_URL/audit/logs?action=PUBLISH"

# Filtrar por productId
curl -H "X-API-Key: $API_KEY" "$BASE_URL/audit/logs?productId=$PRODUCT_ID"

# Filtrar por space
curl -H "X-API-Key: $API_KEY" "$BASE_URL/audit/logs?space=segittur"

# Filtrar por fecha (since)
curl -H "X-API-Key: $API_KEY" "$BASE_URL/audit/logs?since=2025-01-01T00:00:00Z"
```
Respuesta: `200 { "logs": [...] }`

---

## Respuestas HTTP
| Código | Descripción |
|--------|-------------|
| 200 | OK (normalize, publish, consume, audit) |
| 201 | Created (ingest) |
| 400 | validation_error, invalid_json, missing_product_id, missing_purpose |
| 401 | unauthorized (API Key inválida) |
| 403 | access_denied (policy denegó acceso) |
| 404 | not_found, connector_not_found, space_not_found, product_not_found |
| 500 | ingest_error, normalize_error, publish_error, consume_error |

## Ficheros persistidos
| Fichero | Contenido |
|---------|-----------|
| `server/storage/data/staging.json` | Raw ingest payloads |
| `server/storage/data/normalized_menu_items.json` | Menú canónico |
| `server/storage/data/normalized_occupancy_signals.json` | Ocupación canónica |
| `server/storage/data/data_products.json` | Data products creados |
| `server/storage/data/audit.json` | Eventos de auditoría |
| `server/storage/data/published_segittur_mock.json` | Publicados en Segittur |
| `server/storage/data/published_gaiax_mock.json` | Publicados en Gaia-X |

## Policy por defecto
- **allowedPurposes**: `discovery`, `recommendation`, `analytics`
- **allowedRoles**: `destination`, `marketplace`, `restaurant`
- **retentionDays**: 30
- **pii**: false (obligatorio)

## Spaces disponibles
- `segittur` — Mock adapter SEGITTUR
- `gaiax` — Mock adapter GAIA-X

## Troubleshooting

### 401 unauthorized

- **Síntoma**: respuestas 401.
- **Causa típica**: `X-API-Key` no coincide con `API_KEY`.
- **Solución**: revisa el valor de `API_KEY` en el entorno donde corre `netlify dev` y el input de API Key en el Data Hub.

### 403 access_denied (policy)

- **Síntoma**: `403` al consumir.
- **Causa típica**: `purpose` no permitido por policy o roles insuficientes.
- **Solución**: prueba con `purpose=discovery` y/o añade roles con `X-Roles` (ej. `destination`).

### 404 not_found

- **Síntoma**: `product_not_found` al publish/consume.
- **Causa típica**: `productId` incorrecto, o no se ha construido el data product.
- **Solución**: construye el producto (Data Hub → Build) y/o lista data products para copiar un `id` válido.

### Netlify Dev

- El API se sirve en: `http://localhost:8888/.netlify/functions/api`
- Si el front no apunta al API local, configura `VITE_API_BASE_URL` (ver README).

## Notas
- Los conectores registrados se resuelven por `source` (`menu`, `occupancy`).
- Deduplicación en normalizados: (restaurantId, id) para menú; (restaurantId, ts) para ocupación.
- Policy enforcement: purpose + roles + pii=false.
