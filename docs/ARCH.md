## Arquitectura DK (v0.2)

### Principios
- No romper el sistema base heredado (kiosko Casa Rica).
- Contract-first para APIs nuevas (versionadas).
- Integraciones externas idempotentes y auditables.

### Módulos (alto nivel)
- **Core Orders**: creación y gestión de pedidos; campo `channel` (`OrderChannel` enum) para trazabilidad.
- **Payments**: Mercado Pago (QR, Point, webhooks) + `PaymentLinksService` para links remotos.
- **Channels** (`src/channels/`): módulo multi-canal:
  - `pedidosya/` — webhook + servicio + DTOs para PedidosYa.
  - `ubereats/` — webhook + servicio + DTOs para Uber Eats.
  - `whatsapp/` — webhook + conversational engine + DTOs (Cloud API).
- **Store** (`src/store/`): API pública `/api/v1/store` para dk-frontend y web-store.
- **Kitchen & Ops**: estados de producción y despacho.
- **Receipts**: comprobantes y tickets.

### Entornos y despliegue

- **Desarrollo actual**: los servicios (backend, web store, PWAs, etc.) se ejecutan **en local** en la máquina del desarrollador. PostgreSQL puede ser una instalación local, `docker-compose.dev.yml` u otro host; la cadena de conexión vive en `backend/.env` (no versionar credenciales reales).

- **Producción (implementación futura)**: el sistema se **desplegará en un servidor dedicado**. Allí se configurará `DATABASE_URL` (y el resto de variables) en el entorno del proceso o en un `.env` propio del servidor, apuntando a la instancia PostgreSQL accesible desde ese host (misma máquina, red privada o servicio gestionado, según la infraestructura elegida).

### Web Store (Fersot + Stone Fungus)

- **Web Store (cliente público)**: el despliegue operativo de la tienda Stone Fungus es **[dk-frontend](https://github.com/CamiloIncba/dk-frontend)** (build estático + `VITE_API_URL`). El `web-store` del monorepo queda como hub multi-marca y tienda Fersot; Stone Fungus se enlaza o redirige con `VITE_STONE_FUNGUS_STORE_URL` hacia el origen servido por dk-frontend.
- **Visual**: tema CSS por marca (`data-brand` en el layout) sin duplicar bundles; dominios distintos en producción pueden servir la misma app enrutando al prefijo correspondiente o vía configuración de host.
- **Carrito**: `localStorage` aislado por marca (`dk-web-store-cart-{slug}`).
- **API**: un solo backend; `POST /api/v1/store/orders` acepta `storeBrand: "fersot" | "sf"` y lo vuelca en la nota interna (`Marca: …`) para operaciones.
- **Stone Fungus (UX / contenido)**: especificación en [`docs/PLAN.md`](PLAN.md) (*Tienda web Stone Fungus*); implementación en **[dk-frontend](https://github.com/CamiloIncba/dk-frontend)**.

