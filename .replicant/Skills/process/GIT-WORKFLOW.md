# Git Workflow — Ramas dev/main

> Workflow de Git con ramas `dev` y `main`. El agente SIEMPRE debe preguntar y esperar indicación del usuario antes de hacer commit o push.

---

## Cuándo Usar

- Al inicio de cualquier tarea de implementación
- Antes de hacer cualquier commit
- Al finalizar una rama de desarrollo
- Cuando se necesita mergear cambios

---

## Hard Gates

<HARD-GATE>
1. NUNCA hacer commit sin preguntar al usuario primero
2. NUNCA hacer push sin preguntar al usuario primero
3. NUNCA trabajar directamente en `main` sin consentimiento explícito del usuario
4. NUNCA hacer merge de `dev` a `main` sin aprobación del usuario
</HARD-GATE>

---

## El Proceso

### 1. Verificar Estado Actual

Antes de empezar cualquier trabajo:

```bash
git status
git branch --show-current
git log --oneline -5
```

Reportar al usuario:
- Rama actual
- Si hay cambios sin commit
- Último commit

### 2. Preparar Rama de Trabajo

**Si no estás en `dev`:**

> "Actualmente estamos en la rama `{rama}`. ¿Querés que cambie a `dev` para empezar a trabajar?"

Esperar confirmación. Luego:

```bash
git checkout dev
git pull origin dev
```

**Si `dev` no existe:**

> "La rama `dev` no existe. ¿Querés que la cree desde `main`?"

```bash
git checkout -b dev
```

### 3. Verificar Baseline

Antes de empezar código:

```bash
# Verificar que tests pasan
npm test

# Verificar que no hay errores de lint
npm run lint
```

Si algo falla, reportar al usuario antes de continuar.

### 4. Commits Durante Desarrollo

**Gate obligatorio antes de CADA commit:**

> "Completé [descripción del cambio]. ¿Querés que haga commit con el mensaje: `[mensaje sugerido]`?"

Esperar respuesta. Solo hacer commit con aprobación explícita.

**Formato de commits:**
```
tipo: descripción breve

Tipos: feat, fix, docs, style, refactor, test, chore
```

### 5. Push a Remote

**Gate obligatorio antes de CADA push:**

> "Hay [N] commits locales listos. ¿Querés que haga push a `origin/dev`?"

Esperar respuesta. Solo hacer push con aprobación explícita.

### 6. Finalizar Rama de Desarrollo

Cuando todas las tareas estén completas:

1. Verificar que TODOS los tests pasan
2. Verificar que no hay errores de lint
3. Presentar opciones al usuario:

> "Desarrollo completado en `dev`. Opciones:
> 1. **Merge a main** — Mergear dev→main y push
> 2. **Pull Request** — Crear PR de dev→main
> 3. **Mantener** — Dejar en dev por ahora
> 4. **Descartar** — Descartar los cambios
>
> ¿Qué preferís?"

Esperar decisión del usuario.

**Si elige Merge:**
```bash
git checkout main
git pull origin main
git merge dev
# Preguntar antes de push
```

**Si elige PR:**
```bash
# Crear PR via CLI o indicar cómo hacerlo manualmente
```

---

## Reglas de Oro

| Regla | Detalle |
|-------|---------|
| **Preguntar antes de commit** | Siempre. Sin excepciones. |
| **Preguntar antes de push** | Siempre. Sin excepciones. |
| **Trabajar en dev** | Nunca en main directamente. |
| **Pull antes de empezar** | Siempre sincronizar con remote. |
| **Tests antes de merge** | No mergear si los tests fallan. |

---

## Tablas Anti-Racionalización

| Excusa | Realidad |
|--------|----------|
| "Es un cambio chico, puedo commitear directo" | Todo commit necesita aprobación. Sin excepciones. |
| "Ya sé que el usuario quiere esto commiteado" | Preguntar cuesta 5 segundos. Asumir cuesta revertir. |
| "Voy a pushear rápido y listo" | Push sin aprobación puede causar conflictos irreversibles. |
| "Puedo trabajar en main, es más rápido" | Main es producción. Dev existe por una razón. |
| "Los tests tardan mucho, los salto" | Tests que no se corren son bugs que no se encuentran. |

---

## Red Flags — STOP

- A punto de hacer `git commit` sin haber preguntado
- A punto de hacer `git push` sin haber preguntado
- Trabajando en `main` sin consentimiento explícito
- Mergeando sin verificar tests
- Haciendo force push

**Todos estos significan: STOP. Preguntá al usuario.**
