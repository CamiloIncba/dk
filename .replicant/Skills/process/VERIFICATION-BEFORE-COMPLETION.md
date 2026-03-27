# Verification Before Completion — Verificación Antes de Declarar Completo

> Declarar trabajo completo sin verificación es deshonestidad, no eficiencia.

---

## Cuándo Usar

**SIEMPRE antes de:**
- CUALQUIER variación de claims de éxito/completitud
- CUALQUIER expresión de satisfacción
- CUALQUIER declaración positiva sobre el estado del trabajo
- Hacer commit, crear PR, marcar tarea completa
- Moverse a la siguiente tarea
- Delegar a agentes

---

## La Ley de Hierro

```
NO HAY CLAIMS DE COMPLETITUD SIN EVIDENCIA DE VERIFICACIÓN FRESCA
```

Si no ejecutaste el comando de verificación en este mensaje, no podés declarar que pasa.

---

## La Función Gate

```
ANTES de declarar cualquier status o expresar satisfacción:

1. IDENTIFICAR: ¿Qué comando prueba este claim?
2. EJECUTAR: Ejecutar el comando COMPLETO (fresco, completo)
3. LEER: Output completo, verificar exit code, contar failures
4. VERIFICAR: ¿El output confirma el claim?
   - Si NO: Declarar status actual con evidencia
   - Si SÍ: Declarar claim CON evidencia
5. RECIÉN AHÍ: Hacer el claim

Saltear cualquier paso = mentir, no verificar
```

---

## Fallas Comunes

| Claim | Requiere | No Suficiente |
|-------|----------|---------------|
| Tests pasan | Output de test: 0 failures | Corrida anterior, "debería pasar" |
| Lint limpio | Output de lint: 0 errores | Check parcial, extrapolación |
| Build exitoso | Comando de build: exit 0 | Lint pasando, "se ve bien" |
| Bug arreglado | Testear síntoma original: pasa | Código cambiado, asumir que se arregló |
| Requisitos cumplidos | Checklist línea por línea | Tests pasando |
| Agente completó | VCS diff muestra cambios | Agente reporta "éxito" |

---

## Patrones Clave

**Tests:**
```
✅ [Correr comando de test]
   [Ver: 34/34 pass] "Todos los tests pasan"
❌ "Debería pasar ahora" / "Se ve correcto"
```

**Build:**
```
✅ [Correr build] [Ver: exit 0] "Build pasa"
❌ "Lint pasó" (lint no verifica compilación)
```

**Requisitos:**
```
✅ Re-leer plan → Crear checklist → Verificar cada uno → Reportar gaps o completitud
❌ "Tests pasan, fase completa"
```

**Delegación a agentes:**
```
✅ Agente reporta éxito → Verificar VCS diff → Verificar cambios → Reportar estado real
❌ Confiar en reporte del agente
```

---

## Racionalizaciones Comunes

| Excusa | Realidad |
|--------|----------|
| "Debería funcionar ahora" | EJECUTÁ la verificación |
| "Estoy seguro" | Seguridad ≠ evidencia |
| "Solo esta vez" | Sin excepciones |
| "Lint pasó" | Lint ≠ compilador |
| "El agente dijo que terminó" | Verificar independientemente |
| "Estoy cansado" | Cansancio ≠ excusa |
| "Verificación parcial es suficiente" | Parcial no prueba nada |

---

## Red Flags — STOP

- Usando "debería", "probablemente", "parece que"
- Expresando satisfacción antes de verificar ("Listo!", "Perfecto!", "Done!")
- A punto de commit/push/PR sin verificación
- Confiando en reportes de éxito de agentes
- Apoyándose en verificación parcial
- Pensando "solo esta vez"
- **CUALQUIER redacción que implique éxito sin haber ejecutado verificación**

---

## La Línea Final

**No hay atajos para verificación.**

Ejecutá el comando. Leé el output. RECIÉN AHÍ declarà el resultado.

Esto no es negociable.
