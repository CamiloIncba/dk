# Systematic Debugging — Debugging Sistemático

> SIEMPRE encontrar la causa raíz antes de intentar fixes. Fixes de síntomas son fallas.

---

## Cuándo Usar

Usar para CUALQUIER issue técnico:
- Tests fallando
- Bugs en producción
- Comportamiento inesperado
- Problemas de performance
- Build failures
- Issues de integración

**Usar ESPECIALMENTE cuando:**
- Bajo presión de tiempo (las emergencias hacen tentador adivinar)
- "Solo un fix rápido" parece obvio
- Ya intentaste múltiples fixes
- El fix anterior no funcionó

---

## La Ley de Hierro

```
NO HAY FIXES SIN INVESTIGACIÓN DE CAUSA RAÍZ PRIMERO
```

Si no completaste la Fase 1, NO podés proponer fixes.

---

## Las Cuatro Fases

### Fase 1: Investigación de Causa Raíz

**ANTES de intentar CUALQUIER fix:**

1. **Leer mensajes de error cuidadosamente**
   - No saltar errores o warnings
   - A menudo contienen la solución exacta
   - Leer stack traces completos
   - Anotar líneas, paths, códigos de error

2. **Reproducir consistentemente**
   - ¿Podés triggerearlo de forma confiable?
   - ¿Cuáles son los pasos exactos?
   - Si no es reproducible → juntar más datos, no adivinar

3. **Verificar cambios recientes**
   - ¿Qué cambió que podría causar esto?
   - Git diff, commits recientes
   - Nuevas dependencias, cambios de config

4. **Trazar flujo de datos**
   - ¿Dónde origina el valor incorrecto?
   - ¿Qué lo llamó con el valor incorrecto?
   - Seguir trazando hasta encontrar la fuente
   - Arreglar en la fuente, no en el síntoma

### Fase 2: Análisis de Patrones

1. **Encontrar ejemplos funcionales**
   - Localizar código similar que funciona
   - ¿Qué funciona que es similar a lo que está roto?

2. **Comparar contra referencias**
   - Si estás implementando un patrón, leer la referencia COMPLETA
   - No skimear — leer cada línea

3. **Identificar diferencias**
   - ¿Qué es diferente entre lo que funciona y lo que está roto?
   - Listar CADA diferencia, por pequeña que sea
   - No asumir "eso no puede importar"

### Fase 3: Hipótesis y Testing

1. **Formar UNA hipótesis**
   - Declarar claramente: "Creo que X es la causa raíz porque Y"
   - Ser específico, no vago

2. **Testear mínimamente**
   - Hacer el cambio MÁS PEQUEÑO posible para testear la hipótesis
   - Una variable a la vez
   - No arreglar múltiples cosas a la vez

3. **Verificar antes de continuar**
   - ¿Funcionó? Sí → Fase 4
   - ¿No funcionó? Formar NUEVA hipótesis
   - NO agregar más fixes encima

### Fase 4: Implementación

1. **Crear test case que falla**
   - Reproducción más simple posible
   - Test automatizado si es posible
   - DEBE existir antes de arreglar (ver skill TDD)

2. **Implementar UN fix**
   - Arreglar la causa raíz identificada
   - UN cambio a la vez
   - Sin mejoras "ya que estoy acá"

3. **Verificar fix**
   - ¿Test pasa ahora?
   - ¿Otros tests no se rompieron?
   - ¿Issue realmente resuelto?

4. **Si el fix no funciona**
   - STOP
   - Contar: ¿Cuántos fixes intentaste?
   - Si < 3: Volver a Fase 1, re-analizar
   - **Si ≥ 3: STOP y cuestionar la arquitectura**
   - NO intentar Fix #4 sin discusión con el usuario

5. **Si 3+ fixes fallaron: Cuestionar Arquitectura**
   - ¿Este patrón es fundamentalmente correcto?
   - ¿Estamos persistiendo por inercia?
   - ¿Deberíamos refactorear vs. seguir parcheando?
   - **Discutir con el usuario antes de intentar más fixes**

---

## Racionalizaciones Comunes

| Excusa | Realidad |
|--------|----------|
| "El issue es simple, no necesito proceso" | Issues simples también tienen causa raíz. Proceso es rápido para bugs simples. |
| "Emergencia, no hay tiempo" | Debugging sistemático es MÁS RÁPIDO que adivinar. |
| "Probemos esto primero" | El primer fix fija el patrón. Empezá bien. |
| "Voy a escribir el test después de confirmar que funciona" | Fixes sin test no persisten. Test primero. |
| "Múltiples fixes a la vez ahorra tiempo" | No podés aislar qué funcionó. Causa nuevos bugs. |
| "Ya vi el problema, dejame arreglarlo" | Ver síntomas ≠ entender causa raíz. |
| "Un fix más" (después de 2+ fallos) | 3+ fallos = problema arquitectural. |

---

## Red Flags — STOP

- "Fix rápido para ahora, investigar después"
- "Probemos cambiar X a ver si funciona"
- Proponiendo soluciones antes de trazar flujo de datos
- "Un intento más de fix" (cuando ya intentaste 2+)
- Cada fix revela nuevo problema en lugar diferente

**TODOS estos significan: STOP. Volver a Fase 1.**

---

## Referencia Rápida

| Fase | Actividades Clave | Criterio de Éxito |
|------|-------------------|-------------------|
| **1. Causa Raíz** | Leer errores, reproducir, revisar cambios | Entender QUÉ y POR QUÉ |
| **2. Patrón** | Encontrar ejemplos funcionales, comparar | Identificar diferencias |
| **3. Hipótesis** | Formar teoría, testear mínimamente | Confirmada o nueva hipótesis |
| **4. Implementación** | Crear test, arreglar, verificar | Bug resuelto, tests pasan |
