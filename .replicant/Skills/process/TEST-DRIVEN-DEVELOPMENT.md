# Test-Driven Development (TDD)

> Escribir el test primero. Verlo fallar. Escribir código mínimo para que pase.

---

## Cuándo Usar

**Siempre:**
- Features nuevas
- Bug fixes
- Refactoring
- Cambios de comportamiento

**Excepciones (preguntar al usuario):**
- Prototipos descartables
- Código generado
- Archivos de configuración

¿Pensando "saltear TDD solo esta vez"? Pará. Eso es racionalización.

---

## La Ley de Hierro

```
NO HAY CÓDIGO DE PRODUCCIÓN SIN UN TEST QUE FALLE PRIMERO
```

¿Escribiste código antes del test? Borralo. Empezá de nuevo.

**Sin excepciones:**
- No lo mantengas como "referencia"
- No lo "adaptes" mientras escribís tests
- No lo mires
- Borrar significa borrar

Implementar fresco desde los tests. Punto.

**Violar la letra de las reglas ES violar el espíritu de las reglas.**

---

## Red-Green-Refactor

### RED — Escribir Test que Falla

Escribir UN test mínimo mostrando lo que debería pasar.

**Ejemplo bueno:**
```typescript
test('reintenta operaciones fallidas 3 veces', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };

  const result = await retryOperation(operation);

  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```
Nombre claro, testea comportamiento real, una sola cosa.

**Ejemplo malo:**
```typescript
test('retry funciona', async () => {
  const mock = jest.fn()
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce('success');
  await retryOperation(mock);
  expect(mock).toHaveBeenCalledTimes(2);
});
```
Nombre vago, testea mock no código.

**Requisitos:**
- Un comportamiento
- Nombre claro
- Código real (no mocks salvo que sea inevitable)

### Verificar RED — Verlo Fallar

**OBLIGATORIO. Nunca saltar.**

```bash
npm test ruta/al/test.ts
```

Confirmar:
- Test falla (no errores)
- Mensaje de fallo es el esperado
- Falla porque falta la feature (no por typos)

¿Test pasa? Estás testeando comportamiento existente. Arreglá el test.

### GREEN — Código Mínimo

Escribir el código más simple que haga pasar el test.

**Bien:** Solo lo suficiente para pasar.
**Mal:** Over-engineered con opciones, callbacks, configuración que nadie pidió (YAGNI).

No agregar features, refactorear otro código, ni "mejorar" más allá del test.

### Verificar GREEN — Verlo Pasar

**OBLIGATORIO.**

```bash
npm test ruta/al/test.ts
```

Confirmar:
- Test pasa
- Otros tests siguen pasando
- Output limpio (sin errores, warnings)

¿Test falla? Arreglá el código, no el test.
¿Otros tests fallan? Arreglá ahora.

### REFACTOR — Limpiar

Solo después de green:
- Remover duplicación
- Mejorar nombres
- Extraer helpers

Mantener tests en green. No agregar comportamiento.

### Repetir

Siguiente test que falla para la siguiente feature.

---

## Tests Buenos

| Calidad | Bien | Mal |
|---------|------|-----|
| **Mínimo** | Una cosa. "y" en el nombre? Dividilo. | `test('valida email y dominio y espacios')` |
| **Claro** | Nombre describe comportamiento | `test('test1')` |
| **Muestra intención** | Demuestra la API deseada | Obscurece lo que el código debería hacer |

---

## Por Qué el Orden Importa

**"Voy a escribir tests después para verificar que funciona"**

Tests escritos después pasan inmediatamente. Pasar inmediatamente no prueba nada:
- Podrían testear lo incorrecto
- Podrían testear implementación, no comportamiento
- Podrían perder edge cases
- Nunca viste que capture el bug

**"Borrar X horas de trabajo es un desperdicio"**

Falacia de costo hundido. El tiempo ya se fue. Tu decisión ahora:
- Borrar y reescribir con TDD (X horas más, alta confianza)
- Quedártelo y agregar tests después (30 min, baja confianza, probable bugs)

---

## Racionalizaciones Comunes

| Excusa | Realidad |
|--------|----------|
| "Muy simple para testear" | Código simple se rompe. Test toma 30 segundos. |
| "Voy a testear después" | Tests que pasan inmediatamente no prueban nada. |
| "Ya lo testeé manualmente" | Ad-hoc ≠ sistemático. Sin registro, no se puede re-correr. |
| "Borrar X horas es un desperdicio" | Falacia de costo hundido. Código no verificado es deuda técnica. |
| "TDD me va a hacer más lento" | TDD es más rápido que debugging. Pragmático = test-first. |
| "Esto es diferente porque..." | No es diferente. TDD aplica. |
| "Es sobre el espíritu, no el ritual" | No. Tests-después responden "¿qué hace esto?" Tests-primero responden "¿qué debería hacer?" |

---

## Red Flags — STOP y Empezar de Nuevo

- Código antes del test
- Test después de implementación
- Test pasa inmediatamente
- No podés explicar por qué el test falló
- Tests agregados "después"
- Racionalizando "solo esta vez"
- "Ya lo testeé manualmente"
- "Guardarlo como referencia"
- "TDD es dogmático, estoy siendo pragmático"
- "Esto es diferente porque..."

**TODOS estos significan: Borrá el código. Empezá de nuevo con TDD.**

---

## Checklist de Verificación

Antes de marcar trabajo como completo:

- [ ] Cada función/método nuevo tiene un test
- [ ] Vi cada test fallar antes de implementar
- [ ] Cada test falló por la razón esperada (feature faltante, no typo)
- [ ] Escribí código mínimo para pasar cada test
- [ ] Todos los tests pasan
- [ ] Output limpio (sin errores, warnings)
- [ ] Tests usan código real (mocks solo si es inevitable)
- [ ] Edge cases y errores cubiertos

¿No podés marcar todos? Salteaste TDD. Empezá de nuevo.
