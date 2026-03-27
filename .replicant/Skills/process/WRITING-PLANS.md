# Writing Plans — Planes de Implementación

> Crear planes de implementación detallados con tareas bite-sized asumiendo que el ejecutor tiene cero contexto del codebase.

---

## Cuándo Usar

- Cuando tenés un spec o requisitos aprobados para una tarea multi-paso
- Después de que el skill BRAINSTORMING produjo un diseño aprobado
- Antes de tocar código

---

## Overview

Escribir planes de implementación asumiendo que el ingeniero tiene cero contexto del codebase y gusto cuestionable. Documentar TODO lo que necesita saber: qué archivos tocar para cada tarea, código, testing, docs que podría necesitar revisar, cómo testear. DRY. YAGNI. TDD. Commits frecuentes.

Asumir que es un desarrollador hábil, pero no sabe casi nada de nuestro toolset o dominio.

**Guardar planes en:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

---

## Scope Check

Si el spec cubre múltiples subsistemas independientes, debería haberse dividido durante brainstorming. Si no se hizo, sugerir dividir en planes separados — uno por subsistema.

---

## File Structure

Antes de definir tareas, mapear qué archivos se crearán o modificarán y qué hace cada uno:

- Diseñar unidades con límites claros e interfaces bien definidas
- Preferir archivos pequeños y enfocados sobre archivos grandes
- Archivos que cambian juntos deberían vivir juntos
- En codebases existentes, seguir patrones establecidos

---

## Granularidad: Tareas Bite-Sized

**Cada paso es UNA acción (2-5 minutos):**

- "Escribir el test que falla" — paso
- "Correrlo para verificar que falla" — paso
- "Implementar el código mínimo para que pase" — paso
- "Correr los tests y verificar que pasan" — paso
- "Commit" — paso

---

## Header del Plan

Todo plan DEBE empezar con:

```markdown
# [Feature Name] — Plan de Implementación

**Objetivo:** [Una oración describiendo qué construye]

**Arquitectura:** [2-3 oraciones sobre el enfoque]

**Tech Stack:** [Tecnologías/librerías clave]

**Spec:** [Link al design doc]

---
```

---

## Estructura de Tareas

````markdown
### Tarea N: [Nombre del Componente]

**Archivos:**
- Crear: `ruta/exacta/al/archivo.ts`
- Modificar: `ruta/exacta/al/existente.ts:123-145`
- Test: `tests/ruta/exacta/al/test.ts`

- [ ] **Paso 1: Escribir el test que falla**

```typescript
test('comportamiento específico', async () => {
    const result = funcion(input);
    expect(result).toBe(expected);
});
```

- [ ] **Paso 2: Correr test para verificar que falla**

Correr: `npm test -- ruta/test.ts`
Esperado: FAIL con "funcion is not defined"

- [ ] **Paso 3: Implementar código mínimo**

```typescript
function funcion(input) {
    return expected;
}
```

- [ ] **Paso 4: Correr test para verificar que pasa**

Correr: `npm test -- ruta/test.ts`
Esperado: PASS

- [ ] **Paso 5: Commit**

```bash
git add tests/ruta/test.ts src/ruta/archivo.ts
git commit -m "feat: agregar feature específica"
```
````

---

## Plan Review Loop

Después de escribir el plan completo:

1. Revisar el plan contra el spec — ¿cubre todos los requisitos?
2. Verificar que cada tarea tiene: archivos exactos, código completo, comandos de verificación
3. Verificar que sigue TDD (test primero en cada tarea)
4. Si hay gaps, corregir y re-revisar

---

## Handoff de Ejecución

Después de guardar el plan, ofrecer opciones:

> "Plan completo y guardado en `docs/plans/<filename>.md`. Opciones de ejecución:
>
> **1. Ejecución con subagentes (recomendado)** — Despacho un subagente por tarea, review entre tareas
>
> **2. Ejecución inline** — Ejecuto las tareas en esta sesión con checkpoints
>
> ¿Qué enfoque preferís?"

---

## Recordar

- Paths exactos de archivos siempre
- Código completo en el plan (no "agregar validación")
- Comandos exactos con output esperado
- DRY, YAGNI, TDD, commits frecuentes
- Preguntar al usuario antes de cada commit (ver GIT-WORKFLOW)
