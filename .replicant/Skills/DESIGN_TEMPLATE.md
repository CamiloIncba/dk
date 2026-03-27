# Skill: Generación de Design Document (Spec)

> **Propósito:** Template para documentos de diseño pre-implementación. Se usa durante la fase de BRAINSTORMING antes de escribir el plan de implementación.

---

## Instrucciones para el Agente

Cuando el usuario apruebe un diseño durante brainstorming:

1. **Usar este template** para estructurar el design doc
2. **Guardar** en `docs/specs/YYYY-MM-DD-<tema>-design.md`
3. **Hacer commit** (previa aprobación del usuario)
4. Este documento NO se modifica después de aprobado — es inmutable como referencia

---

## Plantilla Design Document

```markdown
# {{TITULO}} — Design Document

**Fecha:** {{FECHA}}
**Autor:** {{AUTOR}}
**Proyecto:** {{PROYECTO}}
**Estado:** Aprobado / En revisión

---

## 1. Problema / Contexto

### ¿Qué problema resuelve?
{{Descripción clara del problema o necesidad}}

### ¿Por qué es necesario ahora?
{{Contexto de urgencia o prioridad}}

### ¿Qué pasa si no lo hacemos?
{{Impacto de no resolver}}

---

## 2. Opciones Evaluadas

### Opción A: {{Nombre}} ⭐ Recomendada
**Descripción:** {{Cómo funciona}}

**Pros:**
- {{Pro 1}}
- {{Pro 2}}

**Contras:**
- {{Contra 1}}

**Esfuerzo estimado:** {{Horas/días}}

### Opción B: {{Nombre}}
**Descripción:** {{Cómo funciona}}

**Pros:**
- {{Pro 1}}

**Contras:**
- {{Contra 1}}
- {{Contra 2}}

**Esfuerzo estimado:** {{Horas/días}}

### Opción C: {{Nombre}} (opcional)
**Descripción:** {{Cómo funciona}}

---

## 3. Diseño Aprobado

### Resumen
{{1-2 oraciones describiendo la solución elegida}}

### Arquitectura

#### Componentes
| Componente | Responsabilidad | Archivos |
|------------|----------------|----------|
| {{Componente 1}} | {{Qué hace}} | `ruta/archivo.ts` |
| {{Componente 2}} | {{Qué hace}} | `ruta/archivo.ts` |

#### Data Flow
```
{{Input}} → {{Componente A}} → {{Componente B}} → {{Output}}
```

#### Interfaces
```typescript
// Interfaz principal
interface {{NombreInterfaz}} {
  {{campo}}: {{tipo}};
}
```

---

## 4. Manejo de Errores

| Error | Causa | Manejo |
|-------|-------|--------|
| {{Error 1}} | {{Cuándo ocurre}} | {{Qué hacer}} |
| {{Error 2}} | {{Cuándo ocurre}} | {{Qué hacer}} |

---

## 5. Testing Strategy

### Tests Unitarios
- {{Qué se testea a nivel de unidad}}

### Tests de Integración
- {{Qué se testea a nivel de integración}}

### Tests E2E
- {{Flujos end-to-end a cubrir}}

### Edge Cases
- {{Edge case 1}}
- {{Edge case 2}}

---

## 6. Out of Scope (YAGNI)

Explícitamente NO incluido en esta iteración:
- {{Feature que no se hace}}
- {{Optimización que no se hace}}
- {{Integración que no se hace}}

---

## 7. Criterios de Éxito

- [ ] {{Criterio 1 — cómo se verifica}}
- [ ] {{Criterio 2 — cómo se verifica}}
- [ ] {{Criterio 3 — cómo se verifica}}

---

## 8. Referencias

- Spec relacionado: {{link}}
- Plan de implementación: {{se creará después de aprobación}}
- Skills relevantes: {{links a skills que aplican}}
```

---

## Notas para el Agente

- **YAGNI:** La sección "Out of Scope" es obligatoria. Forzar a declarar explícitamente qué NO se hace.
- **Opciones:** Siempre presentar al menos 2 opciones con trade-offs. Nunca la "opción obvia" sola.
- **Testing:** La estrategia de testing se define ANTES de implementar, no después.
- **Inmutabilidad:** Una vez aprobado, el design doc no se modifica. Si cambian requisitos, crear nuevo spec.
