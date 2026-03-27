# Brainstorming — Ideas a Diseños

> Refinar ideas a través de diálogo colaborativo antes de escribir código.

---

## Cuándo Usar

**SIEMPRE** antes de cualquier trabajo creativo:
- Crear features nuevas
- Construir componentes
- Agregar funcionalidad
- Modificar comportamiento existente

<HARD-GATE>
NO invocar ningún skill de implementación, escribir código, scaffold, ni tomar
ninguna acción de implementación hasta que hayas presentado un diseño y el
usuario lo haya aprobado. Esto aplica a TODO proyecto sin importar simplicidad percibida.
</HARD-GATE>

## Anti-Patrón: "Esto es muy simple para necesitar diseño"

Todo proyecto pasa por este proceso. Un TODO list, una utilidad de una función, un cambio de config — todos. Los proyectos "simples" son donde las suposiciones no examinadas causan más trabajo desperdiciado. El diseño puede ser corto (unas oraciones para proyectos verdaderamente simples), pero DEBÉS presentarlo y obtener aprobación.

---

## Checklist

Completar en orden:

1. **Explorar contexto del proyecto** — revisar archivos, docs, commits recientes
2. **Hacer preguntas clarificadoras** — una a la vez, entender propósito/restricciones/criterios de éxito
3. **Proponer 2-3 enfoques** — con trade-offs y tu recomendación
4. **Presentar diseño** — en secciones según complejidad, obtener aprobación del usuario después de cada sección
5. **Escribir design doc** — guardar en `docs/specs/YYYY-MM-DD-<tema>-design.md`
6. **Review del spec** — revisar contra el template, corregir inconsistencias
7. **Usuario revisa spec escrito** — pedir al usuario que revise antes de continuar
8. **Transición a implementación** — invocar WRITING-PLANS para crear plan

---

## El Proceso

**Entendiendo la idea:**

- Revisar el estado actual del proyecto (archivos, docs, commits recientes)
- Evaluar scope: si el request describe múltiples subsistemas independientes, señalarlo inmediatamente
- Si el proyecto es demasiado grande para una sola spec, ayudar al usuario a descomponer en sub-proyectos
- Preguntar una cosa a la vez para refinar la idea
- Preferir preguntas de opción múltiple cuando sea posible
- Una sola pregunta por mensaje
- Foco en entender: propósito, restricciones, criterios de éxito

**Explorando enfoques:**

- Proponer 2-3 enfoques diferentes con trade-offs
- Presentar opciones conversacionalmente con tu recomendación y razonamiento
- Liderar con tu opción recomendada y explicar por qué

**Presentando el diseño:**

- Cuando creas entender lo que se está construyendo, presentar el diseño
- Escalar cada sección a su complejidad: pocas oraciones si es directo, hasta 200-300 palabras si es complejo
- Preguntar después de cada sección si se ve bien hasta ahora
- Cubrir: arquitectura, componentes, flujo de datos, manejo de errores, testing
- Estar listo para volver y clarificar si algo no tiene sentido

**Diseñar para aislamiento y claridad:**

- Dividir el sistema en unidades que tengan un propósito claro, se comuniquen por interfaces bien definidas, y puedan entenderse y testearse independientemente
- Unidades más pequeñas y bien delimitadas son más fáciles para trabajar

**Trabajando en codebases existentes:**

- Explorar la estructura actual antes de proponer cambios. Seguir patrones existentes.
- Donde el código existente tiene problemas que afectan el trabajo, incluir mejoras focalizadas como parte del diseño
- No proponer refactoring no relacionado. Mantenerse enfocado en el objetivo actual.

---

## Después del Diseño

**Documentación:**

- Escribir el diseño validado (spec) en `docs/specs/YYYY-MM-DD-<tema>-design.md`
- Hacer commit del documento

**Review:**

- Revisar el spec contra los criterios originales
- Si hay inconsistencias, corregir y revisar de nuevo

**Gate del Usuario:**

> "Spec escrito y guardado en `<path>`. Por favor revisalo y decime si querés hacer cambios antes de empezar con el plan de implementación."

Esperar la respuesta del usuario. Solo proceder cuando el usuario apruebe.

**Implementación:**

- Invocar el skill WRITING-PLANS para crear el plan detallado
- NO invocar ningún otro skill. WRITING-PLANS es el siguiente paso.

---

## Principios Clave

- **Una pregunta a la vez** — No abrumar con múltiples preguntas
- **Opción múltiple preferida** — Más fácil de responder que preguntas abiertas
- **YAGNI implacable** — Remover features innecesarias de todos los diseños
- **Explorar alternativas** — Siempre proponer 2-3 enfoques antes de decidir
- **Validación incremental** — Presentar diseño, obtener aprobación antes de avanzar

---

## Tablas Anti-Racionalización

| Excusa | Realidad |
|--------|----------|
| "Es muy simple para necesitar diseño" | Proyectos simples son donde las suposiciones no examinadas causan más trabajo desperdiciado. |
| "Ya sé lo que hay que hacer" | Saber qué hacer ≠ tener diseño aprobado. Presentá el diseño. |
| "El usuario tiene prisa" | Diseñar primero es más rápido que rehacer después. |
| "Es solo un cambio de una línea" | El cambio puede ser simple, el impacto no. Diseñá. |
| "Puedo empezar y ajustar después" | Ajustar = rehacer. Diseñá primero. |

---

## Red Flags — STOP

- Empezar a codear sin diseño aprobado
- Escribir código "exploratorio" que se va a quedar
- Saltear preguntas porque "ya entendés"
- No proponer alternativas
- No guardar el spec

**Todos estos significan: STOP. Volvé al paso 1.**
