# Smart Menu Semantic

Data product platform para menús y ocupación con policy enforcement y data spaces.

## Qué hace
- **Ingesta**: Menú y ocupación vía conectores JSON con validación Zod
- **Normalización**: Staging → entidades canónicas deduplicadas
- **Data Products**: Builders que generan productos con metadata y policy
- **Policy Engine**: Evaluación de acceso por purpose, roles y pii
- **Data Spaces**: Adapters mock para SEGITTUR y GAIA-X
- **Audit Trail**: Registro de PUBLISH/CONSUME con decisiones

## Quickstart
```bash
npm install
export API_KEY=mykey
npx netlify-cli dev
```

## Frontend + Data Hub

### Levantar UI + API en local

En una terminal:

```bash
export API_KEY=mykey
npm run dev:api
```

En otra terminal (para que el front apunte al API local):

```bash
export VITE_API_BASE_URL="http://localhost:8888/.netlify/functions/api"
npm run dev
```

### Cómo usar la pestaña Data Hub

- **API Key**: la misma que `API_KEY` en el entorno del backend (ej. `mykey`).
- **OrgId**: opcional. Si lo pones, el backend aísla staging por organización.
- **RestaurantId**: id lógico del restaurante para ingest/normalizados (por defecto `resto-1`).
- **Currency**: moneda para el payload de menú (por defecto `EUR`).

Acciones:

- **Run demo (menu+occupancy+normalize)**: ejecuta ingest de menú (desde el editor), ingest de ocupación (demo) y normaliza.
- **Ver staging / Ver normalizados**: inspección de solo lectura del almacenamiento (top 5 + conteo).

## Demo rápida
```bash
export BASE_URL="http://localhost:8888/.netlify/functions/api"

# 1. Ingest menu
curl -X POST -H "Content-Type: application/json" -H "X-API-Key: $API_KEY" \
  -d '{"restaurantId":"r1","currency":"EUR","items":[{"id":"i1","name":"Dish","price":10,"allergens":[],"glutenFree":false}]}' \
  "$BASE_URL/ingest/menu"

# 2. Normalize
curl -X POST -H "X-API-Key: $API_KEY" "$BASE_URL/normalize/run"

# 3. Ver audit logs
curl -H "X-API-Key: $API_KEY" "$BASE_URL/audit/logs"
```

**Ver [docs/runbook.md](docs/runbook.md) para demo completa con publish/consume y policy.**

## Tests
```bash
npm test
```

## Estructura
```
server/
  adapters/        # SpaceAdapter + mocks (Segittur, GaiaX)
  connectors/      # Conectores JSON + registry + fixtures
  domain/          # Schemas Zod (menu, occupancy, policy, dataProduct, audit)
  policy/          # evaluateAccess engine
  products/        # Builders (buildMenuProduct, buildOccupancyProduct)
  storage/         # Repos JSON (staging, normalized, dataProducts, audit, published)
  tests/           # Vitest tests
netlify/functions/ # API endpoints
docs/              # Runbook con curls completos
```

## Auth
| Header | Descripción |
|--------|-------------|
| `X-API-Key` | Requerido, debe coincidir con `API_KEY` en entorno |
| `X-Org-Id` | Opcional, aísla datos por organización |
| `X-Roles` | Opcional, roles del actor (comma-separated) |

## Endpoints
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/ingest/menu` | Ingesta menú |
| POST | `/ingest/occupancy` | Ingesta ocupación |
| POST | `/normalize/run` | Normaliza staging |
| POST | `/publish/:space` | Publica data product |
| POST | `/consume/:space/:productId` | Consume con policy check |
| GET | `/audit/logs` | Lista auditoría |
| GET | `/debug/staging?source=menu\|occupancy` | Debug: staging (solo lectura) |
| GET | `/debug/normalized?type=menu\|occupancy&restaurantId=...` | Debug: normalizados (solo lectura) |

## Policy por defecto
- **allowedPurposes**: discovery, recommendation, analytics
- **allowedRoles**: destination, marketplace, restaurant
- **pii**: false (obligatorio)
