# SRS DK — Dark Kitchen (Empanadas y Pizzas) v0.2

> **Estado:** ✅ Fases 1–3 implementadas  
> **Base:** `kiosko-autoservicio` (Casa Rica) se mantiene estable; DK evoluciona en este fork.

## 1. Propósito

Construir un sistema tipo Fudo para una **Dark Kitchen** (fábrica de empanadas y pizzas) orientada a **preparación y delivery**, centralizando pedidos provenientes de:

- **Fase 1**: Web propia (promoción + compra). ✅
- **Fase 2**: Integraciones con **PedidosYa** y **Uber Eats**. ✅
- **Fase 3**: **WhatsApp** (chatbot + cobro + generación de pedidos). ✅

## 2. Alcance (alto nivel)

### Fase 1 — Web Store (completada)
- **Sitio público Stone Fungus** (**[dk-frontend](https://github.com/CamiloIncba/dk-frontend)**): landing editorial, menú (categoría Stone Fungus), ficha de producto con **extras/modificadores**, carrito persistente, checkout en 3 pasos con **quote** servidor, seguimiento con **timeline** y polling. PWA con manifest y service worker. Deploy bajo `/sf/`.
- **Sitio público Fersot / hub** (`dk-dark-kitchen/web-store`): hub multi-marca, `/fersot`; enlaza a dk-frontend para Stone Fungus.
- **API** `/api/v1/store`: menú, extras por producto, cotización, creación de pedido, estado enriquecido.
- **Ops** (`cashier-pwa`): cocina con filtro multi-canal; badges de canal en todas las listas.
- **Pago Fase 1**: transferencia / confirmación manual.

### Fase 2 — Integraciones PedidosYa + Uber Eats (completada)
- **Modelo de datos**: columna `channel` (`OrderChannel` enum) en tabla `Order` — `IN_STORE`, `WEB_STORE`, `PEDIDOS_YA`, `UBER_EATS`, `WHATSAPP`.
- **PedidosYa**: webhook `POST /api/v1/channels/pedidosya/webhook` — recibe eventos `ORDER_NEW`, `ORDER_STATE_CHANGE`, `ORDER_CANCEL`; normaliza ítems → pedido interno con `channel: PEDIDOS_YA`.
- **Uber Eats**: webhook `POST /api/v1/channels/ubereats/webhook` — recibe `orders.notification`, `orders.cancel`; modelo pull (notificación + fetch).
- **Ops multi-canal**: cashier-pwa con filtros por canal (Web, PedidosYa, Uber, WhatsApp, Otros); badges de color por canal en todas las vistas.
- **Seguridad**: webhooks protegidos con `ApiKeyGuard`; signature validation preparada para credenciales reales.

### Fase 3 — Chatbot WhatsApp (completada)
- **WhatsApp Business API (Cloud API)**: webhook verificación `GET` + mensajes `POST /api/v1/channels/whatsapp/webhook`.
- **Motor de conversación**: máquina de estados (`IDLE` → `BROWSING_MENU` → `BUILDING_ORDER` → `AWAITING_ADDRESS` → `CONFIRMING` → `COMPLETED`); envía carta, acepta selección por número, confirma dirección, crea pedido con `channel: WHATSAPP`.
- **Payment links**: servicio `PaymentLinksService` genera preferencias Mercado Pago para pagos remotos (WhatsApp, email).
- **Variables de entorno**: `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `PEDIDOSYA_WEBHOOK_SECRET`, `UBEREATS_WEBHOOK_SECRET`.

## 3. Actores
- **Cliente** (web / WhatsApp / apps de delivery)
- **Operador Producción** (cocina)
- **Cajero / Administración** (auditoría, pagos manuales)
- **Reparto** (propio o externo)
- **Plataformas externas** (PedidosYa, Uber Eats, Meta/WhatsApp)

## 4. Requerimientos funcionales

- **RF-001** Catálogo público navegable por categorías. ✅
- **RF-002** Carrito con modificadores/extras por producto. ✅
- **RF-003** Checkout y creación de pedido (web + WhatsApp). ✅
- **RF-004** Estados operativos del pedido (producción y despacho). ✅
- **RF-005** Auditoría de cambios de estado. ✅
- **RF-006** Recepción de pedidos desde PedidosYa vía webhook. ✅
- **RF-007** Recepción de pedidos desde Uber Eats vía webhook. ✅
- **RF-008** Chatbot WhatsApp con flujo conversacional de pedido. ✅
- **RF-009** Generación de links de pago Mercado Pago. ✅
- **RF-010** PWA con cache offline para el frontend público. ✅

## 5. Requerimientos no funcionales
- **RNF-001** Respuesta API < 500ms p95 en operaciones comunes.
- **RNF-002** Seguridad: HTTPS; API admin protegida con `X-API-KEY`; webhooks con signature validation.
- **RNF-003** Observabilidad: logs por canal, trazas de pedidos/pagos (NestJS Logger).
- **RNF-004** CI: lint + typecheck + build en GitHub Actions (dk-frontend).

