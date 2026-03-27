# API v1 - Admin Orders

Endpoint administrativo versionado para listar pedidos con filtros por canal y estado de cocina.

## Base URL

- Local: `http://localhost:3010`

## GET `/api/v1/admin/orders`

Lista pedidos para panel/admin. Requiere header `X-API-KEY`.

### Query params opcionales

- `channel`: filtra por canal detectado desde `note` (ej: `WEB_STORE`, `UNKNOWN`).
- `kitchenStatus`: filtra por estado de cocina (`PENDING`, `IN_PREPARATION`, `READY`, `DELIVERED`, `CANCELLED`).
- `limit`: cantidad maxima de resultados (1 a 100, default 50).

### Ejemplo request

```bash
curl -H "X-API-KEY: <tu-api-key>" \
  "http://localhost:3010/api/v1/admin/orders?channel=WEB_STORE&kitchenStatus=READY&limit=20"
```

### Response 200 (ejemplo)

```json
[
  {
    "id": 245,
    "status": "PAID",
    "kitchenStatus": "READY",
    "createdAt": "2026-03-27T13:40:02.000Z",
    "updatedAt": "2026-03-27T13:52:11.000Z",
    "totalAmount": 18990,
    "receiptCode": "a81dk220",
    "note": "[CHANNEL:WEB_STORE] | Cliente: Juan Perez | Pago: transfer",
    "channel": "WEB_STORE"
  },
  {
    "id": 244,
    "status": "PENDING",
    "kitchenStatus": "READY",
    "createdAt": "2026-03-27T13:35:10.000Z",
    "updatedAt": "2026-03-27T13:35:10.000Z",
    "totalAmount": 12990,
    "receiptCode": null,
    "note": "Pedido presencial sin prefijo",
    "channel": "UNKNOWN"
  }
]
```

### Notas de contrato

- `channel` es derivado de `note` buscando el patron `[CHANNEL:<VALOR>]`.
- Si el patron no existe, `channel` se informa como `UNKNOWN`.
- Para compatibilidad, no se modifica el formato de `note`; solo se agrega el campo derivado `channel` en respuestas admin de listado.
