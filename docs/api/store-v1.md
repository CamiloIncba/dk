# API v1 - Store (Fase 1)

Endpoints publicos para Web Store.

## Base URL

- Local: `http://localhost:3010`

## GET `/api/v1/store/menu`

Retorna catalogo por categorias activas.

### Response 200 (ejemplo)

```json
{
  "categories": [
    {
      "id": 1,
      "name": "Pizzas",
      "products": [
        {
          "id": 10,
          "name": "Pizza Muzzarella",
          "price": "12990.00",
          "description": "Salsa, muzza y oregano"
        }
      ]
    }
  ]
}
```

## GET `/api/v1/store/products/:productId/extras`

Retorna grupos de extras y opciones disponibles para el producto (mismas reglas que `menu/products/:id/extras`, pero bajo prefijo versionado).

## POST `/api/v1/store/orders`

Crea un pedido desde Web Store.

### Request body (ejemplo)

```json
{
  "items": [
    { "productId": 10, "quantity": 1 },
    { "productId": 22, "quantity": 2, "extras": [{ "optionId": 4, "quantity": 1 }] }
  ],
  "customer": {
    "name": "Juan Perez",
    "phone": "+56911111111",
    "address": "Av Siempre Viva 123"
  },
  "paymentMethod": "transfer",
  "note": "Dejar en conserjeria"
}
```

### Response 201

Retorna la orden creada con items y total.

## GET `/api/v1/store/orders/:id/status`

Retorna estado y seguimiento para el cliente (sin exponer nota interna).

Incluye:

- `paymentLabel`, `kitchenLabel`: textos amigables
- `timeline`: pasos con `done` / `current`
- `lineItems`: resumen de productos y extras (nombres y cantidades)

### Response 200 (ejemplo)

```json
{
  "id": 145,
  "status": "PAID",
  "kitchenStatus": "IN_PREPARATION",
  "totalAmount": "18990.00",
  "createdAt": "2026-03-27T14:00:00.000Z",
  "updatedAt": "2026-03-27T14:03:10.000Z",
  "paymentLabel": "Pagado",
  "kitchenLabel": "En preparación",
  "timeline": [
    { "id": "placed", "label": "Pedido recibido", "done": true, "current": false },
    { "id": "payment", "label": "Pago confirmado", "done": true, "current": false },
    { "id": "cooking", "label": "En preparación", "done": false, "current": true }
  ],
  "lineItems": [
    {
      "quantity": 1,
      "productName": "Pizza Muzzarella",
      "extras": [{ "name": "Extra queso", "quantity": 1 }]
    }
  ]
}
```
