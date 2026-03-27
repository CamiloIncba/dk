# Dispatching Parallel Agents — Despacho de Agentes en Paralelo

> Coordinar múltiples subagentes trabajando en tareas independientes simultáneamente.

---

## Cuándo Usar

- Múltiples tareas verdaderamente independientes (sin dependencias entre sí)
- Tareas que no modifican los mismos archivos
- Cuando la velocidad de ejecución importa

**NO usar cuando:**
- Las tareas tienen dependencias entre sí
- Las tareas modifican los mismos archivos (conflictos)
- Las tareas requieren coordinación de estado
- No estás seguro si son independientes (entonces NO son paralelas)

---

## Principio Core

**Paralelismo solo para tareas VERDADERAMENTE independientes.** Si hay duda, ejecutar en serie.

---

## El Proceso

### 1. Identificar Tareas Paralelas

Del plan de implementación, identificar tareas que:
- [ ] No comparten archivos de escritura
- [ ] No dependen del output de otra tarea
- [ ] No modifican estado compartido (DB, config)
- [ ] Pueden testearse independientemente

### 2. Preparar Contexto por Agente

Para cada subagente:
- Texto completo de SU tarea (no del plan entero)
- Archivos relevantes a SU tarea
- Instrucciones claras de scope (NO tocar archivos fuera de su tarea)
- Contexto del proyecto suficiente para entender dónde encaja

### 3. Despachar

- Despachar todos los subagentes
- Cada uno trabaja en su tarea aislada
- Reportan status al completar

### 4. Recolectar y Verificar

- Verificar que cada subagente completó su tarea
- Verificar que no hay conflictos entre los cambios
- Correr tests completos (no solo los de cada tarea)
- Si hay conflictos: resolver manualmente, no re-despachar

---

## Adaptación VS Code

En VS Code con Copilot, las limitaciones son:
- `runSubagent` es secuencial (no hay paralelismo real)
- Pero el principio de **contexto aislado por tarea** sigue siendo valioso
- Despachar subagentes secuencialmente con contexto limpio = mejor calidad que resolver todo en una sesión contaminada

---

## Red Flags — STOP

- Tareas "paralelas" que comparten archivos de escritura
- Tareas "paralelas" que dependen del output de otra
- No verificar conflictos después de juntar cambios
- Despachar sin contexto suficiente
- Asumir que tareas son independientes sin verificar

---

## Tablas Anti-Racionalización

| Excusa | Realidad |
|--------|----------|
| "Son bastante independientes" | Bastante ≠ completamente. Si duda → serie. |
| "Puedo resolver conflictos después" | Conflictos de merge son más caros que ejecución serie. |
| "Es más rápido en paralelo" | Solo si no hay conflictos. Si hay → más lento. |
| "Cada uno trabaja en su parte" | Verificar que las "partes" realmente no se superponen. |
