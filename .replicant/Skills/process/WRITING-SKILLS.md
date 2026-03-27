# Writing Skills — TDD para Documentación

> Crear skills IS Test-Driven Development aplicado a documentación de procesos.

---

## Cuándo Usar

- Al crear nuevos skills
- Al editar skills existentes
- Al verificar que skills funcionan antes de deployment

---

## Overview

Escribís test cases (escenarios de presión con subagentes), los ves fallar (comportamiento baseline), escribís el skill (documentación), ves los tests pasar (agentes cumplen), y refactoreás (cerrás loopholes).

**Principio core:** Si no viste a un agente fallar sin el skill, no sabés si el skill enseña lo correcto.

---

## Mapeo TDD para Skills

| Concepto TDD | Creación de Skill |
|-------------|-------------------|
| **Test case** | Escenario de presión |
| **Código de producción** | Documento del skill (SKILL.md) |
| **Test falla (RED)** | Agente viola la regla sin skill (baseline) |
| **Test pasa (GREEN)** | Agente cumple con skill presente |
| **Refactor** | Cerrar loopholes manteniendo compliance |
| **Escribir test primero** | Correr escenario baseline ANTES de escribir skill |
| **Verlo fallar** | Documentar exactamente las racionalizaciones del agente |
| **Código mínimo** | Skill que aborda esas violaciones específicas |

---

## La Ley de Hierro (Igual que TDD)

```
NO HAY SKILL SIN UN TEST QUE FALLE PRIMERO
```

Esto aplica a skills NUEVOS Y EDICIONES a skills existentes.

¿Escribiste skill antes de testear? Borralo. Empezá de nuevo.

---

## RED-GREEN-REFACTOR para Skills

### RED: Escribir Test que Falla (Baseline)

Correr escenario de presión sin el skill. Documentar comportamiento exacto:
- ¿Qué decisiones tomó?
- ¿Qué racionalizaciones usó (verbatim)?
- ¿Qué presiones triggerearon violaciones?

### GREEN: Escribir Skill Mínimo

Skill que aborde esas racionalizaciones específicas. No agregar contenido extra para casos hipotéticos.

Correr mismos escenarios CON skill. Agente debería cumplir.

### REFACTOR: Cerrar Loopholes

¿Agente encontró nueva racionalización? Agregar counter explícito. Re-testear hasta bulletproof.

---

## Estructura de un Skill

```markdown
# Nombre del Skill

> Descripción de una línea.

## Cuándo Usar
[Condiciones que triggereean este skill]

## La Ley de Hierro
[Regla inquebrantable]

## El Proceso
[Pasos a seguir]

## Racionalizaciones Comunes
[Tabla de excusa vs realidad]

## Red Flags — STOP
[Señales de que estás violando el skill]
```

---

## Bulletproofing: Cerrar Loopholes

### Cerrar cada loophole explícitamente

No solo declarar la regla — prohibir workarounds específicos:

**Mal:**
```markdown
¿Escribiste código antes del test? Borralo.
```

**Bien:**
```markdown
¿Escribiste código antes del test? Borralo. Empezá de nuevo.

**Sin excepciones:**
- No lo mantengas como "referencia"
- No lo "adaptes" mientras escribís tests
- No lo mires
- Borrar significa borrar
```

### Construir tabla de racionalizaciones

Toda excusa que agentes hagan va a la tabla:

```markdown
| Excusa | Realidad |
|--------|----------|
| "Muy simple para testear" | Código simple se rompe. Test toma 30 segundos. |
```

### Crear lista de Red Flags

Hacer fácil que agentes se auto-chequeen:

```markdown
## Red Flags — STOP
- Código antes del test
- "Ya lo testeé manualmente"
- "Esto es diferente porque..."
```

---

## Cuándo Crear un Skill

**Crear cuando:**
- Técnica no era intuitivamente obvia
- Lo referenciarias de nuevo en otros proyectos
- El patrón aplica ampliamente
- Otros se beneficiarían

**No crear para:**
- Soluciones únicas
- Prácticas estándar bien documentadas en otro lado
- Convenciones específicas de proyecto (ponerlas en CLAUDE.md)
