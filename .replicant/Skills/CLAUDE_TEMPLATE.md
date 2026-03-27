# Skill: Generación de CLAUDE.md (Hub Central)

> **Propósito:** Guía para que Claude/Copilot genere el contexto principal del proyecto, actuando como hub de documentación y log de desarrollo.

---

## Instrucciones para el Agente

Cuando el usuario solicite crear un CLAUDE.md:

1. **Recopilar contexto** del proyecto existente
2. **Generar CLAUDE.md** como hub central
3. **Mantener actualizado** con cada cambio significativo
4. **Este documento SÍ se modifica** durante el desarrollo

---

## Plantilla CLAUDE.md

```markdown
# {{PROYECTO}} — Context Hub

> Hub central de documentación y desarrollo. Este archivo contiene el contexto que Claude/Copilot necesita para entender el proyecto.

## 📁 Documentos Relacionados

| Documento | Estado | Descripción |
|-----------|--------|-------------|
| [SRS.md](./SRS.md) | ✅ Aprobado | Especificación de requisitos (inmutable) |
| [PLAN.md](./PLAN.md) | ✅ Aprobado | Plan de trabajo (inmutable) |
| [TUTORIAL.md](./TUTORIAL.md) | 🔄 En progreso | Guía de usuario |
| [README.md](../{{PROYECTO}}-backend/README.md) | ✅ Actualizado | Setup técnico |

---

## 🎯 Estado Actual

### Sprint: {{SPRINT_ACTUAL}}

**Enfoque:** {{OBJETIVO_SPRINT}}

### Progress Tracking

| RF | Descripción | Progress |
|----|-------------|----------|
| RF-001 | {{Descripción}} | ██████████ 100% |
| RF-002 | {{Descripción}} | ████████░░ 80% |
| RF-003 | {{Descripción}} | ████░░░░░░ 40% |
| RF-004 | {{Descripción}} | ░░░░░░░░░░ 0% |

**Overall:** {{PORCENTAJE_TOTAL}}% completado

---

## 🏗️ Arquitectura Quick Reference

```
Frontend (React + Vite) → Backend (NestJS/Express) → MongoDB Atlas
                              ↓
                           Auth0 (JWT)
```

**Repos:**
- Backend: `{{PROYECTO}}-backend/`
- Frontend: `{{PROYECTO}}-frontend/`
- Docs: `{{PROYECTO}}-more/`

---

## 🔑 Convenciones del Proyecto

### Naming

- **Componentes:** PascalCase → `PaymentCard.tsx`
- **Hooks:** camelCase con prefix → `usePayments.ts`
- **API routes:** kebab-case → `/api/pending-payments`
- **DB collections:** plurales → `pendingPayments`

### Estructura de Commits

```
type(scope): descripción

feat(payments): agregar filtro por fecha
fix(auth): corregir token refresh
docs(claude): actualizar progress tracking
```

---

## 📋 Development Log

### {{FECHA}}

{{Resumen de lo trabajado hoy, cambios realizados, decisiones tomadas.}}

**Cambios:**
- ✅ {{Cambio 1}}
- ✅ {{Cambio 2}}
- 🔄 {{En progreso}}

**Next:**
- [ ] {{Siguiente tarea}}

---

### {{FECHA_ANTERIOR}}

{{Log de sesión anterior...}}

---

## 🐛 Issues Conocidos

| # | Issue | Severidad | Estado |
|---|-------|-----------|--------|
| 1 | {{Descripción}} | 🔴 Alta | Abierto |
| 2 | {{Descripción}} | 🟡 Media | En progreso |
| 3 | {{Descripción}} | 🟢 Baja | Cerrado |

---

## 🔧 Quick Commands

```bash
# Backend
cd {{PROYECTO}}-backend && npm run dev

# Frontend  
cd {{PROYECTO}}-frontend && npm run dev

# Tests
npm run test

# Build
npm run build
```

---

## 📝 Notas para el Agente

### Contexto de Negocio

{{Explicar el contexto del negocio, quién usa el sistema, qué problema resuelve.}}

### Decisiones de Diseño

| Decisión | Razón |
|----------|-------|
| {{Decisión}} | {{Razón}} |

### Archivos Críticos

Antes de modificar estos archivos, verificar dependencias:

- `src/app.module.ts` — Módulo principal
- `src/auth/` — Configuración de Auth0
- `src/config/` — Variables de entorno

---

## 🚀 Release Checklist

Antes de deploy a producción:

- [ ] Todos los RF al 100%
- [ ] Tests pasando
- [ ] TUTORIAL.md actualizado
- [ ] Variables de entorno configuradas en AWS
- [ ] Capacitación al cliente completada

---

*Este documento se actualiza durante el desarrollo — INCBA*
```

---

## Variables a Reemplazar

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{PROYECTO}}` | Nombre corto del proyecto | APP-PAGOS, TC |
| `{{SPRINT_ACTUAL}}` | Sprint en curso | Sprint 2 |
| `{{OBJETIVO_SPRINT}}` | Meta del sprint | Dashboard de reportes |
| `{{PORCENTAJE_TOTAL}}` | Avance general | 65 |
| `{{FECHA}}` | Fecha del log entry | 2025-02-25 |

---

## Reglas de Actualización

### Cuándo actualizar CLAUDE.md

1. **Al iniciar sesión de trabajo** — Agregar nuevo entry en Development Log
2. **Al completar un RF** — Actualizar Progress Tracking
3. **Al encontrar un bug** — Agregar a Issues Conocidos
4. **Al tomar decisión técnica** — Documentar en Notas para el Agente
5. **Al cerrar sesión** — Resumen de cambios y next steps

### Qué NO incluir en CLAUDE.md

- Código largo (mejor referenciar el archivo)
- Credenciales o secrets
- Discusiones largas (resumir la decisión final)

---

## Checklist de Calidad

Antes de marcar como completo:

- [ ] Enlaces a otros documentos funcionan
- [ ] Progress tracking refleja estado real
- [ ] Development log tiene al menos un entry
- [ ] Quick commands probados
- [ ] Release checklist actualizado

---

## Sección a incluir en CLAUDE.md generados

El template debe incluir la siguiente sección obligatoria en cada CLAUDE.md generado. Esto garantiza que los agentes que trabajen en el proyecto sigan las reglas de desarrollo:

```markdown
---

## 🛡️ Reglas de Desarrollo (Mandatory)

> Reglas obligatorias para todo agente que trabaje en este proyecto. Basadas en el workflow Superpowers adaptado por Replicant-2049.

### TDD Obligatorio
- NO hay código de producción sin test que falle primero
- Si escribiste código antes del test → borralo y empezá de nuevo
- No mantenerlo como "referencia", no "adaptarlo" — borrar significa borrar
- Ver `Skills/process/TEST-DRIVEN-DEVELOPMENT.md` para el proceso completo

| Excusa | Realidad |
|--------|----------|
| "Muy simple para testear" | Código simple se rompe. Test toma 30 segundos. |
| "Voy a testear después" | Tests que pasan inmediatamente no prueban nada. |
| "Es sobre el espíritu, no el ritual" | Tests-después son bias de implementación. Tests-primero fuerzan diseño. |
| "TDD me va a hacer más lento" | TDD es más rápido que debugging. |

### Verificación Antes de Claims
- NO declarar "listo", "funciona", "terminado" sin ejecutar tests y mostrar output
- Evidencia > Confianza. Ejecutá el comando, leé el output, RECIÉN AHÍ declarà
- "Debería funcionar" → EJECUTÁ la verificación

### Git Workflow
- SIEMPRE preguntar al usuario antes de commit o push
- Trabajar en rama `dev`, mergear a `main` solo con aprobación del usuario
- NUNCA hacer force push
- Ver `Skills/process/GIT-WORKFLOW.md` para el proceso completo

### Debugging
- SIEMPRE encontrar causa raíz antes de intentar fixes
- Fase 1: Investigar → Fase 2: Analizar patrones → Fase 3: Hipótesis → Fase 4: Implementar
- Si 3+ fixes fallaron: STOP y cuestionar la arquitectura con el usuario
```

---

*Skill para Replicant-2049 — INCBA*
