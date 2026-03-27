# SRS DK — Dark Kitchen (Empanadas y Pizzas) v0.1

> **Estado:** 🔄 Borrador (pendiente aprobación)  
> **Base:** `kiosko-autoservicio` (Casa Rica) se mantiene estable; DK evoluciona en este fork.

## 1. Propósito

Construir un sistema tipo Fudo para una **Dark Kitchen** (fábrica de empanadas y pizzas) orientada a **preparación y delivery**, centralizando pedidos provenientes de:

- **Fase 1**: Web propia (promoción + compra).
- **Fase 2**: Integraciones con **PedidosYa** y **Uber Eats**.
- **Fase 3**: **WhatsApp** (chatbot + cobro + generación de pedidos).

## 2. Alcance (alto nivel)

### Incluido (MVP fase 1)
- Catálogo público + carrito + checkout web.
- Creación de pedido en backend.
- Gestión operativa interna (producción/estados) reutilizando UX base existente donde aplique.

### Excluido (por fase)
- Integraciones PedidosYa/Uber Eats (fase 2).
- Chatbot WhatsApp + transferencias/links de pago (fase 3).

## 3. Actores
- **Cliente** (web/WhatsApp)
- **Operador Producción** (cocina)
- **Cajero / Administración** (auditoría, pagos manuales si aplica)
- **Reparto** (propio o externo; a definir en fases)

## 4. Requerimientos funcionales (semilla)

- **RF-001** Catálogo público navegable por categorías.
- **RF-002** Carrito con modificadores/extras por producto.
- **RF-003** Checkout y creación de pedido.
- **RF-004** Estados operativos del pedido (producción y despacho).
- **RF-005** Auditoría de cambios de estado.

## 5. Requerimientos no funcionales (semilla)
- **RNF-001** Respuesta API < 500ms p95 en operaciones comunes.
- **RNF-002** Seguridad: HTTPS; no exponer API admin sin autenticación/clave.
- **RNF-003** Observabilidad: logs y trazas mínimas de pedidos/pagos.

