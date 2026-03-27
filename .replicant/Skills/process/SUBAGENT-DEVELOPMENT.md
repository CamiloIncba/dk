# Subagent-Driven Development — Desarrollo con Subagentes

> Ejecutar planes despachando un subagente fresco por tarea, con review de 2 etapas después de cada una: compliance con spec primero, calidad de código después.

---

## Cuándo Usar

- Cuando tenés un plan de implementación escrito (de WRITING-PLANS)
- Las tareas son mayormente independientes
- Querés mantener contexto limpio por tarea

---

## Principio Core

Subagente fresco por tarea + review de 2 etapas (spec → calidad) = alta calidad, iteración rápida.

**¿Por qué subagentes?** Delegás tareas a agentes con contexto aislado. Al construir instrucciones precisas, te asegurás que se mantengan enfocados. Nunca heredan tu historial de sesión — vos construís exactamente lo que necesitan.

---

## El Proceso

Para cada tarea del plan:

### 1. Preparar Contexto

- Leer el plan completo una vez
- Extraer TODAS las tareas con texto completo y contexto
- Crear lista de tracking con todas las tareas

### 2. Despachar Subagente Implementador

Para cada tarea:

- Proporcionar: texto completo de la tarea, contexto del proyecto, archivos relevantes
- El subagente implementa, testea, hace commit (previa autorización del usuario), y se auto-revisa
- Si el subagente tiene preguntas: responder antes de permitir que proceda

### 3. Review de Spec Compliance (Etapa 1)

Después de que el implementador termina:

- ¿El código cumple con TODOS los requisitos del spec?
- ¿Se agregó algo que NO estaba en el spec? (over-building)
- ¿Falta algo del spec? (under-building)

Si hay issues → el implementador corrige → re-review hasta aprobado.

### 4. Review de Code Quality (Etapa 2)

Solo después de que spec compliance pasa:

- ¿El código está limpio y es idiomático?
- ¿Los tests cubren los casos edge?
- ¿Hay code smells, números mágicos, duplicación?

Si hay issues → el implementador corrige → re-review hasta aprobado.

### 5. Marcar Tarea Completa

Solo cuando ambos reviews pasan → marcar como completada → siguiente tarea.

---

## Selección de Modelo

Usar el modelo menos potente que pueda manejar cada rol:

- **Tareas mecánicas** (funciones aisladas, specs claros, 1-2 archivos): modelo rápido/barato
- **Tareas de integración** (multi-archivo, coordinación): modelo estándar
- **Arquitectura, diseño, review**: modelo más capaz

---

## Manejo de Status del Implementador

| Status | Acción |
|--------|--------|
| **DONE** | Proceder a spec review |
| **DONE_WITH_CONCERNS** | Leer dudas antes de proceder. Si son sobre correctitud, resolver antes de review |
| **NEEDS_CONTEXT** | Proporcionar contexto faltante, re-despachar |
| **BLOCKED** | Evaluar blocker: contexto → re-despachar. Tarea grande → dividir. Plan incorrecto → escalar al usuario |

**NUNCA** ignorar una escalación o forzar al mismo modelo a reintentar sin cambios.

---

## Red Flags

**Nunca:**
- Empezar implementación en main sin consentimiento del usuario
- Saltear reviews (spec O calidad)
- Proceder con issues sin resolver
- Despachar múltiples subagentes en paralelo (conflictos)
- Hacer que el subagente lea el archivo del plan (proporcionar texto completo)
- Saltear contexto de escena (el subagente necesita entender dónde encaja la tarea)
- **Empezar code quality review antes de que spec compliance pase ✅**
- Moverse a la siguiente tarea mientras algún review tiene issues abiertos

---

## Adaptación VS Code

En VS Code con Copilot, los subagentes se despachan via `runSubagent`. Limitaciones:
- No se puede elegir modelo por subagente
- El subagente no tiene acceso al historial de la sesión (esto es deseable)
- Proporcionar contexto completo en el prompt del subagente

---

## Tablas Anti-Racionalización

| Excusa | Realidad |
|--------|----------|
| "El review lleva mucho tiempo" | Review es más barato que debugging. |
| "Ya lo revisé mentalmente" | Review mental ≠ review sistemático. |
| "Es un cambio simple, no necesita 2 reviews" | Simple ≠ correcto. 2 reviews siempre. |
| "El subagente dijo que terminó" | Verificar independientemente. Siempre. |
| "Puedo hacer las 2 tareas juntas" | Contexto mezclado = errores mezclados. Una tarea a la vez. |
