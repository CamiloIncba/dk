## Arquitectura DK (borrador)

### Principios
- No romper el sistema base heredado (kiosko Casa Rica).
- Contract-first para APIs nuevas (versionadas).
- Integraciones externas idempotentes y auditables.

### Módulos (alto nivel)
- **Core Orders**: creación y gestión de pedidos.
- **Payments**: Mercado Pago / transferencias / links (por fase).
- **Channels**: Store / PedidosYa / Uber / WhatsApp.
- **Kitchen & Ops**: estados de producción y despacho.
- **Receipts**: comprobantes y tickets.

