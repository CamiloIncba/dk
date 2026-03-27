## PR Checklist (obligatorio)

### Alcance y seguridad
- [ ] El PR tiene **un objetivo** claro (no mezcla features).
- [ ] No incluye secretos (`.env`, tokens, credenciales, etc.).
- [ ] Cambios en contratos API están documentados (DTO + ejemplo).

### Calidad
- [ ] Lint pasa.
- [ ] Typecheck pasa.
- [ ] Tests relevantes pasan.
- [ ] Endpoints versionados (`/api/v1/*`) cubiertos por tests o checks de regresion.
- [ ] Flujos que crean orden validan el canal de origen en nota interna (ej: `[CHANNEL:WEB_STORE]`).

### Experiencia
- [ ] Estados de carga y error (si aplica UI).
- [ ] Confirmación antes de acciones destructivas (si aplica UI).

### Observabilidad
- [ ] Logs estructurados (si aplica backend).
- [ ] Manejo de errores consistente.

