## PR Checklist (obligatorio)

### Alcance y seguridad
- [ ] El PR tiene **un objetivo** claro (no mezcla features).
- [ ] No incluye secretos (`.env`, tokens, credenciales, etc.).
- [ ] Cambios en contratos API están documentados (DTO + ejemplo).

### Calidad
- [ ] Lint pasa.
- [ ] Typecheck pasa.
- [ ] Tests relevantes pasan.

### Experiencia
- [ ] Estados de carga y error (si aplica UI).
- [ ] Confirmación antes de acciones destructivas (si aplica UI).

### Observabilidad
- [ ] Logs estructurados (si aplica backend).
- [ ] Manejo de errores consistente.

