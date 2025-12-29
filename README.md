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

## Policy por defecto
- **allowedPurposes**: discovery, recommendation, analytics
- **allowedRoles**: destination, marketplace, restaurant
- **pii**: false (obligatorio)
