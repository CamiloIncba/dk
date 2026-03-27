### Multiagentes (DK)

- **Ownership por agente**
  - Backend: `backend/`
  - Ops UI: `cashier-pwa/`, `public-display/`
  - Web store: `web-store/`
  - QA/estándares: tooling transversal + `docs/`

- **Objetivo de colaboración dinámica**
  - Se espera handoff y co-diseño entre agentes para converger en la solución más evolucionada posible.
  - Sin romper ownership: el agente dueño consolida cambios en su área.
  - Cambios de contrato (API/DB/estados): contract-first + ejemplos en `docs/` + (si aplica) ADR breve.

- **Contract-first**
  - Si cambias API, actualiza DTOs y agrega ejemplos en `docs/`.
  - Preferir nuevas rutas bajo `/api/v1/...`.

- **Gates**
  - No afirmar “listo” sin evidencia (tests/lints OK).
  - No introducir secretos.

- **Skills (Replicant)**
  - Workflow: `.replicant/Skills/process/DEVELOPMENT-WORKFLOW.md`
  - TDD: `.replicant/Skills/process/TEST-DRIVEN-DEVELOPMENT.md`
  - Code review: `.replicant/Skills/process/CODE-REVIEW.md`
  - Git workflow: `.replicant/Skills/process/GIT-WORKFLOW.md`

