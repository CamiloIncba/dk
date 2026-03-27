# Finishing Branch — Finalizar Rama de Desarrollo

> Verificar trabajo completo, presentar opciones al usuario, ejecutar merge/PR/keep/discard.

---

## Cuándo Usar

- Cuando todas las tareas del plan están completadas
- Cuando se necesita integrar cambios de `dev` a `main`
- Al final de un ciclo de desarrollo

---

## El Proceso

### 1. Verificación Final

**OBLIGATORIO antes de cualquier acción:**

```bash
# Correr TODOS los tests
npm test

# Verificar lint
npm run lint

# Verificar build
npm run build
```

Reportar resultados al usuario:
- Tests: X/Y pasando
- Lint: N errores/warnings
- Build: éxito/fallo

**Si algo falla: STOP. Corregir antes de continuar.**

### 2. Revisión de Completitud

Verificar contra el plan original:

- [ ] Todas las tareas marcadas como completadas
- [ ] Todos los tests del plan escritos y pasando
- [ ] Documentación actualizada (si el plan lo requería)
- [ ] No hay TODOs o FIXMEs pendientes en el código nuevo

### 3. Presentar Opciones

> "Desarrollo completado en `dev`. Resumen:
> - [N] tareas completadas
> - [M] tests pasando
> - Build exitoso
> - Lint limpio
>
> Opciones:
> 1. **Merge a main** — `git checkout main && git merge dev && git push`
> 2. **Pull Request** — Crear PR de dev→main para revisión
> 3. **Mantener en dev** — Dejar en la rama dev por ahora
> 4. **Descartar** — Descartar los cambios (requiere confirmación doble)
>
> ¿Qué preferís?"

**Esperar respuesta del usuario. NO proceder sin aprobación.**

### 4. Ejecutar Decisión

**Merge:**
```bash
git checkout main
git pull origin main
git merge dev --no-ff
# PREGUNTAR antes de push
git push origin main
git checkout dev
```

**PR:**
- Si hay CLI de GitHub: `gh pr create --base main --head dev --title "..." --body "..."`
- Si no: indicar al usuario cómo crear el PR manualmente

**Mantener:**
- No hacer nada. Confirmar que los cambios están seguros en `dev`.

**Descartar:**
> "⚠️ Esto eliminará todo el trabajo en `dev`. ¿Estás seguro? (requiere confirmación explícita)"

Solo si confirma:
```bash
git checkout main
git branch -D dev
```

### 5. Cleanup

Después de merge exitoso:
- Verificar que `main` tiene todos los cambios
- Sincronizar `dev` con `main`:
```bash
git checkout dev
git merge main
```

---

## Tablas Anti-Racionalización

| Excusa | Realidad |
|--------|----------|
| "Los tests pasan, puedo mergear directo" | Preguntar al usuario es obligatorio. Siempre. |
| "Es obvio que el usuario quiere merge" | Nunca asumir. Preguntar. |
| "El PR es overkill para este cambio" | El usuario decide, no el agente. |
| "Puedo skipear la verificación final" | Verificación es el gate. Sin evidencia, no hay merge. |

---

## Red Flags — STOP

- Mergeando sin verificar tests
- Mergeando sin aprobación del usuario
- Haciendo push sin preguntar
- Force push en cualquier rama
- Borrando ramas sin confirmación doble
- Declarando "listo" sin evidencia

**Todos estos significan: STOP. Seguir el proceso.**
