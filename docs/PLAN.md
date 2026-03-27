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
- Endpoints `/api/v1/store/*` (catálogo, carrito/quote, create order, status).

### Frontend Ops
- Vista unificada de pedidos por canal (Store / PedidosYa / Uber / WhatsApp).
- Estados operativos: producción + despacho.

### Web Store
- Landing + catálogo + carrito + checkout (MVP).

### QA/Estándares
- CI: lint + typecheck + tests mínimos.
- Auditoría Replicant (27+ checks) como gate.

