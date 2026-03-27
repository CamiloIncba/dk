## Multi-agentes (DK)

Este repositorio se desarrolla con múltiples agentes especializados. El objetivo es **evitar solapamientos**, mantener **contratos estables** entre capas y acelerar la ejecución.

Además, uno de los objetivos explícitos del proyecto es **permitir que los agentes colaboren dinámicamente** (handoff y co-diseño) para converger en la solución **más evolucionada** posible, sin romper ownership ni contratos.

### Agentes y ownership

- **Agente Backend Core**
  - **Ownership**: `backend/`
  - **Responsable de**: dominio, DB (Prisma), contratos API, integraciones (pagos, plataformas, WhatsApp), auditoría de eventos y trazabilidad.
  - **Regla**: ningún frontend define lógica de negocio; consume contratos.

- **Agente Frontend Operativo (Ops)**
  - **Ownership**: `cashier-pwa/`, `public-display/` (operación)
  - **Responsable de**: UX de operación diaria (producción/cocina, estados, caja, alertas).
  - **Regla**: cambios de estados y reglas de negocio se piden al backend vía endpoints.

- **Agente Frontend Web Store (Marketing + Compra)**
  - **Ownership**: `web-store/` (nuevo)
  - **Responsable de**: sitio público, catálogo, carrito, checkout, SEO/performance, seguimiento de pedido para cliente.
  - **Regla**: no toca `cashier-pwa/` salvo coordinación explícita.

- **Agente Calidad (QA + Estándares)**
  - **Ownership**: tooling transversal (CI, linters, tests, templates, docs de proceso)
  - **Responsable de**: TDD donde aplique, contract tests, gates de PR, auditoría (27+ checks), seguridad básica, runbooks.

### Contratos y coordinación

- **Contract-first**: todo endpoint nuevo o cambio debe venir con contrato (DTO + ejemplos) y quedar documentado en `docs/api/`.
- **Versionado**: preferir `/api/v1/...` para lo nuevo. No romper rutas existentes del sistema base.
- **Idempotencia**: toda integración externa debe ser idempotente (dedupe por externalId).

### Colaboración dinámica (objetivo)

- **Handoff explícito**: si un agente se encuentra bloqueado o el impacto cruza ownership, abre un handoff breve en `docs/HANDOFFS.md` (qué intentó, qué falta, decisiones, links a archivos) y lo “entrega” al agente dueño.
- **Co-diseño antes de tocar contratos**: cambios de API/DB/estados requieren mini-spec en `docs/api/` + un ADR breve si hay trade-offs.
- **Propuestas con evidencia**: toda mejora debe venir con “cómo lo verifico” (tests, build, lint, reproducción).
- **No romper ownership**: la colaboración es para destrabar y elevar la calidad; la implementación final en un área la consolida el agente dueño o se coordina explícitamente.

### Workflow obligatorio (Replicant)

El workflow de referencia está en `.replicant/Skills/process/DEVELOPMENT-WORKFLOW.md` y se aplica a todos:

- Spec → Plan → Execute → Verify → Review → Finish

### Gates de merge (mínimos)

- Lint + typecheck pasan
- Tests pasan (unit/integration/e2e según módulo)
- No hay secretos en el diff
- Checklist de PR completada (ver `docs/PR_CHECKLIST.md`)

