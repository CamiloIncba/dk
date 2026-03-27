# Code Review — Revisión de Código

> Revisión sistemática entre tareas contra el plan. Cada review verifica compliance con spec y calidad de código.

---

## Cuándo Usar

- Entre tareas de implementación
- Antes de marcar una tarea como completada
- Antes de merge a cualquier rama

---

## El Proceso

### Pre-Review Checklist

Antes de hacer review, verificar:

- [ ] Tests pasan (correr el comando, no asumir)
- [ ] Lint limpio (correr el comando)
- [ ] Build exitoso (si aplica)
- [ ] Cambios comiteados (diff limpio)

### Review de 2 Etapas

#### Etapa 1: Spec Compliance

Comparar cambios contra el spec/plan:

| Pregunta | Criterio |
|----------|----------|
| ¿Se implementó TODO lo del spec? | No missing requirements |
| ¿Se agregó algo que NO estaba en el spec? | No over-building |
| ¿Los edge cases del spec están cubiertos? | Completitud |
| ¿Las interfaces coinciden con el diseño? | Consistencia |

**Si hay issues:** Corregir antes de pasar a etapa 2.

#### Etapa 2: Code Quality

| Aspecto | Verificar |
|---------|-----------|
| **Naming** | Variables/funciones tienen nombres descriptivos |
| **DRY** | No hay duplicación de lógica |
| **YAGNI** | No hay código innecesario |
| **Error handling** | Errores se manejan, no se silencian |
| **Tests** | Cubren happy path + edge cases + errores |
| **Types** | TypeScript strict, no `any` innecesarios |
| **Security** | No secrets hardcoded, inputs validados |

**Severity de Issues:**

| Nivel | Descripción | Acción |
|-------|-------------|--------|
| **Critical** | Bug, security issue, data loss | Bloquea. Corregir inmediatamente. |
| **Important** | Code smell, missing test, naming | Corregir antes de merge. |
| **Suggestion** | Style, optimization | Registrar para futuro. |

---

## Formato de Reporte

```markdown
## Code Review — [Feature/Tarea]

### Spec Compliance
- ✅ Requisito A implementado correctamente
- ✅ Requisito B implementado correctamente
- ❌ Requisito C faltante: [detalle]

### Code Quality
**Strengths:**
- Tests completos con coverage de edge cases
- Naming claro y consistente

**Issues:**
- [Critical] Falta validación de input en X
- [Important] Número mágico en línea Y, extraer constante

### Resultado: ✅ Aprobado / ❌ Issues que resolver
```

---

## Tablas Anti-Racionalización

| Excusa | Realidad |
|--------|----------|
| "Es un cambio simple, no necesita review" | Cambios simples también tienen bugs. Review siempre. |
| "Ya lo revisé mientras codeaba" | Self-review durante coding está biased. Review formal. |
| "Los tests pasan, es suficiente" | Tests cubren lo que escribiste, no lo que olvidaste. |
| "Estamos apurados" | Review es más rápido que debugging en producción. |
| "Confío en el autor" | Confianza ≠ evidencia. Review siempre. |

---

## Red Flags — STOP

- Aprobar sin correr tests
- Aprobar sin verificar spec compliance
- Saltear etapa 1 e ir directo a calidad
- "LGTM" sin justificación
- Aprobar con issues critical abiertos

**Todos estos significan: STOP. Hacé el review completo.**
