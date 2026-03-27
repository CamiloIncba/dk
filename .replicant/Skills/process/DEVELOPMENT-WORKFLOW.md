# Development Workflow — Spec → Plan → Execute

> Workflow completo de desarrollo recomendado para features. Define el flujo end-to-end desde la idea hasta el merge, integrando todos los skills de proceso.

---

## Cuándo Usar

- Toda feature nueva
- Todo cambio significativo de comportamiento
- Toda refactorización grande
- Todo bug complejo que requiere cambio arquitectural

Para fixes simples y cambios menores, el flujo puede ser más liviano pero NUNCA saltear TDD ni Git Workflow gates.

---

## El Flujo Completo

```
┌─────────────────┐
│  1. BRAINSTORMING │ ← Idea → Diseño aprobado
│     (BRAINSTORMING.md) │
└────────┬────────┘
         │ spec guardado en docs/specs/
         ▼
┌─────────────────┐
│  2. PLANNING     │ ← Diseño → Plan de tareas
│     (WRITING-PLANS.md) │
└────────┬────────┘
         │ plan guardado en docs/plans/
         ▼
┌─────────────────┐
│  3. GIT SETUP    │ ← Crear/verificar rama dev
│     (GIT-WORKFLOW.md)  │
└────────┬────────┘
         │ branch dev lista
         ▼
┌─────────────────┐
│  4. EXECUTION    │ ← Tareas del plan una por una
│     (SUBAGENT-DEVELOPMENT.md │
│      + TEST-DRIVEN-DEVELOPMENT.md) │
│                  │
│  Para cada tarea:│
│  ├─ RED: test que falla │
│  ├─ GREEN: código mínimo │
│  ├─ REFACTOR: limpiar │
│  ├─ REVIEW etapa 1: spec │
│  ├─ REVIEW etapa 2: calidad │
│  └─ Preguntar antes de commit │
└────────┬────────┘
         │ todas las tareas completas
         ▼
┌─────────────────┐
│  5. CODE REVIEW  │ ← Review final contra plan
│     (CODE-REVIEW.md)   │
└────────┬────────┘
         │ review aprobado
         ▼
┌─────────────────┐
│  6. VERIFICATION │ ← Tests, lint, build
│     (VERIFICATION-BEFORE-COMPLETION.md) │
└────────┬────────┘
         │ evidencia confirmada
         ▼
┌─────────────────┐
│  7. FINISH       │ ← Merge/PR/keep/discard
│     (FINISHING-BRANCH.md) │
└────────┬────────┘
         │ preguntar al usuario
         ▼
       DONE
```

---

## Resumen de Skills por Fase

| Fase | Skill | Input | Output |
|------|-------|-------|--------|
| 1. Brainstorming | `BRAINSTORMING.md` | Idea del usuario | Design spec en `docs/specs/` |
| 2. Planning | `WRITING-PLANS.md` | Design spec aprobado | Implementation plan en `docs/plans/` |
| 3. Git Setup | `GIT-WORKFLOW.md` | — | Rama `dev` lista con baseline limpio |
| 4. Execution | `SUBAGENT-DEVELOPMENT.md` + `TEST-DRIVEN-DEVELOPMENT.md` | Plan de tareas | Código implementado con tests |
| 5. Review | `CODE-REVIEW.md` | Código implementado | Review aprobado |
| 6. Verification | `VERIFICATION-BEFORE-COMPLETION.md` | Todo el trabajo | Evidencia de tests/lint/build |
| 7. Finish | `FINISHING-BRANCH.md` | Trabajo verificado | Merge/PR con aprobación del usuario |

---

## Skills de Soporte

Estos skills se usan CUANDO SE NECESITAN, no como paso obligatorio del flujo:

| Skill | Cuándo |
|-------|--------|
| `SYSTEMATIC-DEBUGGING.md` | Cuando hay bugs, tests fallando, comportamiento inesperado |
| `WRITING-SKILLS.md` | Cuando se necesita crear o editar un skill de proceso |

---

## Principios del Workflow

### 1. No se escribe código sin diseño aprobado
El brainstorming produce un spec. Sin spec aprobado → no hay plan → no hay código.

### 2. No se escribe código sin plan
El plan descompone el spec en tareas bite-sized. Sin plan → no hay implementación.

### 3. No se escribe código sin test que falle
TDD es obligatorio. Sin test → no hay código de producción.

### 4. No se hace commit sin preguntar
El usuario tiene control total sobre qué va al repositorio.

### 5. No se declara "listo" sin evidencia
Verification-before-completion es obligatorio. Sin evidencia → no hay claim.

### 6. No se mergea sin aprobación
El usuario decide cuándo y cómo integrar cambios.

---

## Flujo Abreviado (Para Cambios Menores)

Para fixes simples, cambios de config, o ajustes menores:

```
1. Describir el cambio al usuario
2. Confirmar enfoque (sin spec formal)
3. TDD: test → código → verify
4. Preguntar antes de commit
5. Preguntar antes de push
```

**Lo que NUNCA se puede saltear, incluso en flujo abreviado:**
- TDD (test primero)
- Preguntar antes de commit/push
- Verificación antes de declarar completo

---

## Tablas Anti-Racionalización

| Excusa | Realidad |
|--------|----------|
| "Es muy simple para todo este proceso" | El flujo abreviado existe para eso. Pero TDD + Git gates: obligatorios. |
| "El usuario tiene prisa" | Proceso es más rápido que rehacer. |
| "Ya sé lo que hay que hacer" | Saber ≠ diseño aprobado. |
| "Puedo saltear el plan para esto" | Sin plan → tareas olvidadas → bugs. |
| "Los tests son overkill" | TDD es más rápido que debugging. |
| "Voy a commitear todo junto al final" | Commits atómicos permiten revert. Commits frecuentes. |

---

## Documentos de Referencia

- Specs de diseño: `docs/specs/YYYY-MM-DD-<tema>-design.md`
- Planes de implementación: `docs/plans/YYYY-MM-DD-<feature-name>.md`
- Skills de proceso: `Skills/process/*.md`
- Estándares del proyecto: `Skills/STANDARDS.md`
- Arquitectura: `Skills/arch/*.md`
