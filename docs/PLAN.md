# DK — Plan de trabajo (borrador) v0.1

## Resumen

Fork de `kiosko-autoservicio` orientado a Dark Kitchen (empanadas/pizzas) con roadmap:

- **Fase 1**: Web store (promoción + compra).
- **Fase 2**: Integraciones PedidosYa + Uber Eats.
- **Fase 3**: Chatbot WhatsApp con cobro y generación de pedidos.

## Arquitectura (borrador)

- **Backend**: NestJS + Prisma (PostgreSQL) (heredado).
- **Ops UI**: `cashier-pwa/` + pantallas operativas (heredado).
- **Display público**: `public-display/` (heredado).
- **Web store (nuevo)**: React + Vite + Tailwind + **shadcn/ui**.

## Entregables inmediatos (para dividir entre agentes)

### Backend Core
- Definir modelo “Order DK” para web store (cliente, dirección, canal, pagos).
- Endpoints `/api/v1/store/*` (catálogo, **`POST .../quote`**, `POST .../orders`, estado de pedido).

### Frontend Ops
- Vista unificada de pedidos por canal (Store / PedidosYa / Uber / WhatsApp).
- Estados operativos: producción + despacho.

### Web Store
- **Fase 1 (cerrada para Stone Fungus)**: tienda pública en **[dk-frontend](https://github.com/CamiloIncba/dk-frontend)** — landing editorial, carta desde API, ficha **`/producto/:id`** con grupos de **extras** (`GET .../products/:id/extras`), carrito persistente, checkout en 3 pasos con **quote** servidor, seguimiento con polling, `base` **`/sf/`** para convivir con el hub del monorepo.
- **Fase 1 (Fersot / hub)**: `web-store` — hub, `/fersot`, menú con extras, mismos contratos API.
- **Mejora continua (todas las tiendas)**: SEO avanzado, PWA/offline, tests E2E, pipeline CI (dk-frontend ya incluye `npm run build` en GitHub Actions).

### Channels (Fase 2 + 3 — completado)
- **Migración DB**: enum `OrderChannel` (`IN_STORE`, `WEB_STORE`, `PEDIDOS_YA`, `UBER_EATS`, `WHATSAPP`) + columna `channel` en `Order` con default `IN_STORE`.
- **PedidosYa**: `POST /api/v1/channels/pedidosya/webhook` — eventos `ORDER_NEW`, `ORDER_STATE_CHANGE`, `ORDER_CANCEL`; servicio normaliza ítems a pedidos internos.
- **Uber Eats**: `POST /api/v1/channels/ubereats/webhook` — modelo notificación + pull; servicio crea pedidos internos.
- **WhatsApp**: `GET/POST /api/v1/channels/whatsapp/webhook` — verificación Meta + motor conversacional stateful (menú → selección → dirección → confirmación → pedido).
- **Payment Links**: `PaymentLinksService` genera preferencias Mercado Pago para cobros remotos (WhatsApp, email).
- **Cashier-pwa**: filtros por canal (Web, PedidosYa, Uber, WhatsApp, Otros); badges de color en KitchenView y OrderCard.
- **Variables de entorno** requeridas para producción: `PEDIDOSYA_WEBHOOK_SECRET`, `UBEREATS_WEBHOOK_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `MP_ACCESS_TOKEN`.

### QA/Estándares
- CI backend: unit tests + build en GitHub Actions (`dk-dark-kitchen`).
- CI frontend: lint + typecheck + build en GitHub Actions (`dk-frontend`).
- Unit tests: 9 suites / 13 tests para backend (store controller, servicios).
- E2E tests: 6 tests de integración real para endpoints `/api/v1/store/*`.
- Webhooks protegidos con `ApiKeyGuard`.
- Auditoría Replicant (27+ checks) como gate.

---

## Recomendaciones pendientes

Registradas el 2026-03-30. Prioridad sugerida de mayor a menor impacto operacional.

### R1 — Pagos reales (Mercado Pago / WebPay)
- **Impacto**: Alto — hoy el checkout usa "transferencia manual", lo que requiere verificación humana.
- **Acción**: Obtener access token de producción de Mercado Pago (o integrar WebPay Plus/OneClick); conectar `PaymentLinksService` con credenciales reales; testear flujo de pago completo → callback → actualización de estado de orden.
- **Dependencia**: Cuenta Mercado Pago verificada o contrato con Transbank.

### R2 — Branding a producción
- **Impacto**: Alto — la tienda necesita identidad visual definitiva.
- **Acción**: Elegir uno de los 10 enfoques generados (ver [galería de branding](https://camiloincba.github.io/dk-frontend/branding/_shared/preview.html)); aplicar tipografía, colores, logo y favicon al web store (`dk-frontend`); actualizar imágenes de producto con fotografía real.
- **Dependencia**: Decisión del equipo sobre el enfoque visual preferido.

### R3 — WhatsApp como canal prioritario
- **Impacto**: Alto — WhatsApp tiene el mayor alcance y menor costo en Chile vs. PedidosYa/Uber Eats (que cobran comisión ~30%).
- **Acción**: Crear cuenta Meta Business; solicitar acceso a WhatsApp Business API; configurar `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`; testear flujo conversacional completo (menú → selección → dirección → confirmación → pedido + link de pago).
- **Dependencia**: Cuenta de Meta Business verificada + número de teléfono dedicado.

---

## Tienda web Stone Fungus (`/sf`)

Referencia para alinear diseño, contenido y stack. **Solo modo oscuro** (sin toggle claro).

### Stack
- **React + TypeScript + Vite**, **Tailwind CSS**, **shadcn/ui** (Radix: Sheet, Dialog, ScrollArea, Separator, Button, Card, Badge).

### Identidad y diseño
- Sensación de **galería / museo de fotografía fina**: editorial + gastronomía; **no** landing de fast food.
- Paleta: negros profundos (`#0A0A0A`), carbones, piedra cálida, acentos tierra (dorados apagados, verde bosque, terracota). Sin primarios chillones ni “¡ordená ya!”.
- Tipografía: **serif refinada** en títulos (Playfair Display), **sans limpia** en cuerpo (DM Sans). Generoso espacio en blanco; la pizza como “obra” en la pared.
- Imágenes: layout **foto primero**, placeholders oscuros con nombre superpuesto hasta tener fotografía real.
- Animaciones suaves: entradas en fade, hint de scroll; **parallax sutil** opcional en hero; hovers discretos.

### Contenido (español Chile)
- **Hero**: viewport completo, overlay oscuro; nombre *Stone Fungus*; tagline: *El primer restaurante de hongos gourmet en Chile*; indicador de scroll sutil.
- **Historia**: biga neapolitana, horno de piedra; base común salsa pomodoro + mix de quesos. Hongos: Melena de León, Ostra, Shiitake; estacionales **Changle** y **Níscalo**.
- **Galería (menú)**: cada pizza como tarjeta grande dominada por imagen; nombre en serif; ingredientes en sans pequeño y espaciado; botón **Agregar** (outline/ghost) visible al hover; badge **Estacional** donde aplique (**Leonera**).
- **Variedades** (todas comparten base pomodoro + quesos + masa biga + horno de piedra): Enoki, Leonera, Porcina, Carnita, Veggie, Napolitana — alineadas con categoría API **`Stone Fungus`** y seed Prisma `category.id === 3`.
- **Carrito**: **Sheet** desde la derecha, tema oscuro; ítems, cantidades ±, subtotal, **Confirmar Pedido**; icono bolsa en navbar con **badge** de cantidad.
- **Detalle**: **Dialog** al pulsar una pizza (imagen grande, descripción extendida, agregar).
- **Footer**: nombre, Instagram, *Santiago, Chile*, nota *Hongos que varían con las estaciones*.

### Implementación en repo
- **Web Store en producción (Stone Fungus + API DK)**: **[CamiloIncba/dk-frontend](https://github.com/CamiloIncba/dk-frontend)** — frontend a desplegar con CI/CD (`npm run build`). Usa `VITE_API_URL`, menú `GET /api/v1/store/menu` (categoría **Stone Fungus**), `POST /api/v1/store/quote`, `POST /api/v1/store/orders` con `storeBrand: "sf"`, y seguimiento `GET /api/v1/store/orders/:id/status`.
- **Web store multi-marca** (`dk-dark-kitchen/web-store`): hub (`/`), Fersot (`/fersot`); con `VITE_STONE_FUNGUS_STORE_URL`, el hub y `/sf` enlazan o redirigen al origen público servido desde **dk-frontend** (ya no hay carpeta `web-store/src/sf/`).

