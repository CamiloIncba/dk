# 📋 Estándares Obligatorios de Proyecto

## Propósito

Este documento define los **estándares mínimos obligatorios** que todo sistema desarrollado
por el equipo debe cumplir antes de considerarse listo para release.

Cada estándar tiene:
- **Código** único (DOC-XX, UX-XX, FEAT-XX, QA-XX)
- **Criterios de verificación** que el comando `audit` verifica automáticamente
- **Justificación** del por qué es obligatorio

> Los estándares aplican a **todos** los proyectos. Si un estándar no aplica al tipo
> de proyecto (ej: PWA en una API pura), el audit lo marca como ⚠️ WARNING.

---

## DOC — Documentación

### DOC-01 · CLAUDE.md (Context Hub)
**Descripción:** Archivo central de contexto del proyecto para agentes AI.  
**Verificación:**
- Existe `{PROJECT}-more/CLAUDE.md`
- Tiene más de 500 caracteres de contenido real
- No contiene placeholders `{{PROYECTO}}`
- Contiene secciones: Arquitectura, Tech Stack, API Endpoints

**Justificación:** Sin CLAUDE.md, los agentes AI no tienen contexto del proyecto y generan código inconsistente.

---

### DOC-02 · SRS (Especificación de Requisitos)
**Descripción:** Documento de requisitos funcionales y no funcionales.  
**Verificación:**
- Existe `{PROJECT}-more/SRS.md` o `{PROJECT}-more/SRS-{PROJECT}.md`
- Contiene secciones de RF (Requisitos Funcionales) y RNF (Requisitos No Funcionales)
- Tiene más de 1000 caracteres

**Justificación:** Sin SRS no hay trazabilidad de lo que se debe construir.

---

### DOC-03 · README Técnico
**Descripción:** Documentación técnica para desarrolladores.  
**Verificación:**
- Existe `README.md` en el backend y/o frontend
- Contiene secciones: instalación, ejecución, variables de entorno
- Tiene más de 300 caracteres

**Justificación:** Un nuevo desarrollador debe poder levantar el proyecto leyendo solo el README.

---

### DOC-04 · Plan de Trabajo
**Descripción:** Plan con sprints y tareas organizadas.  
**Verificación:**
- Existe `{PROJECT}-more/PLAN.md` o `{PROJECT}-more/PLAN-{PROJECT}.md`
- Tiene más de 500 caracteres

**Justificación:** Sin plan no hay visibilidad del progreso ni asignación de tareas.

---

### DOC-05 · Tutorial Completo con Capturas
**Descripción:** Tutorial de usuario con screenshots de cada funcionalidad.  
**Verificación:**
- Existe `{PROJECT}-more/TUTORIAL*.md`
- Directorio `{PROJECT}-more/SS/` con al menos 10 imágenes
- Existe script de captura `{PROJECT}-more/SCRIPT/capture-tutorial.mjs`
- El tutorial referencia imágenes con `![...](SS/...)`

**Justificación:** Todo sistema debe tener documentación visual para el usuario final.

---

### DOC-06 · Tutorial In-App
**Descripción:** Página `/tutorial` dentro de la aplicación que muestra el tutorial con formato y capturas.  
**Verificación:**
- Existe archivo de página `Tutorial.tsx` o `tutorial.tsx` en `src/pages/`
- Ruta `/tutorial` registrada en el router principal
- Directorio `public/tutorial/` con `tutorial-content.html`, `tutorial-toc.json`, `tutorial-meta.json`
- Link al tutorial accesible desde el menú de usuario

**Justificación:** El usuario debe poder consultar el tutorial sin salir de la aplicación.

---

## UX — Experiencia de Usuario

### UX-01 · Modales de Confirmación
**Descripción:** Toda acción destructiva o cambio de estado debe pedir confirmación al usuario.  
**Verificación:**
- Existen componentes `ConfirmDialog`, `ConfirmDeleteDialog`, o `AlertDialog` en el frontend
- Se usan en al menos 2 lugares (imports detectados en otros componentes)

**Justificación:** Previene acciones accidentales del usuario (eliminar, cambiar estado, etc.).

---

### UX-02 · Error Boundary
**Descripción:** Componente que captura errores de React y muestra UI de fallback.  
**Verificación:**
- Existe `ErrorBoundary.tsx` o `error-boundary.tsx` en `src/components/`
- Se usa como wrapper en `App.tsx`

**Justificación:** Un error en un componente no debe crashear toda la aplicación.

---

### UX-03 · Tema Claro / Oscuro
**Descripción:** El sistema debe soportar al menos modo claro y oscuro.  
**Verificación:**
- Existe `ThemeProvider` o equivalente en el proyecto
- Existe componente de toggle (`theme-toggle`, `ThemeToggle`, etc.)
- Se usa clase `dark:` en al menos 5 archivos

**Justificación:** Mejora la experiencia visual y accesibilidad en diferentes condiciones de uso.

---

### UX-04 · Estados de Carga (Loading States)
**Descripción:** Toda operación asíncrona debe mostrar un indicador de carga.  
**Verificación:**
- Existen componentes `LoadingState`, `Skeleton`, o `Loader` en el frontend
- Se usa `Loader2` de lucide-react o spinner equivalente

**Justificación:** El usuario debe saber que algo está procesándose.

---

### UX-05 · Estados Vacíos (Empty States)
**Descripción:** Cuando no hay datos, se muestra un mensaje informativo con acción sugerida.  
**Verificación:**
- Existe componente `EmptyState` o equivalente
- Se usa en al menos 1 vista principal

**Justificación:** Una tabla vacía sin mensaje confunde al usuario.

---

### UX-06 · Notificaciones Toast
**Descripción:** Feedback visual de acciones del usuario (éxito, error, info).  
**Verificación:**
- Existe `Toaster` o `Sonner` configurado en `App.tsx`
- Se usa `useToast` o `toast()` en al menos 3 componentes

**Justificación:** El usuario necesita feedback inmediato de sus acciones.

---

## FEAT — Funcionalidades Obligatorias

### FEAT-01 · Centro de Notificaciones
**Descripción:** Panel que muestra notificaciones del sistema al usuario.  
**Verificación:**
- Existe componente `NotificationsDropdown` o `NotificationCenter` en frontend
- Existe módulo/endpoint de notificaciones en backend (`/notifications` o `/api/notifications`)
- Endpoint para marcar como leídas

**Justificación:** Los usuarios necesitan enterarse de eventos relevantes sin tener que buscarlos.

---

### FEAT-02 · Centro de Actividad
**Descripción:** Panel con historial de acciones realizadas en el sistema.  
**Verificación:**
- Existe componente `ActivityPanel` o `ActivityLog` en frontend
- Existe módulo/endpoint de actividad en backend (`/activity` o `/api/activity`)

**Justificación:** Auditoría y trazabilidad de quién hizo qué y cuándo.

---

### FEAT-03 · Notificaciones Push
**Descripción:** Sistema de notificaciones push vía service worker.  
**Verificación:**
- Existe componente `PushNotification` o hook `use-push-notifications` en frontend
- Existe endpoint para suscripción push en backend
- Service worker registrado

**Justificación:** Notificaciones importantes deben llegar incluso cuando la app no está abierta.

---

### FEAT-04 · PWA Ready
**Descripción:** La aplicación debe funcionar como Progressive Web App.  
**Verificación:**
- Existe configuración de PWA (`vite-plugin-pwa`, `manifest.json`, o `pwa-assets.config`)
- Existe service worker (`sw.js`, `sw.ts`, o `service-worker.js`)
- Existe `manifest.json` o equivalente con `name`, `icons`

**Justificación:** Permite instalación en dispositivos y funcionamiento offline parcial.

---

### FEAT-05 · Exportar Reportes
**Descripción:** El sistema debe permitir exportar datos en al menos 2 formatos.  
**Verificación:**
- Existe hook o utilidad de exportación (`use-export`, `export-utils`, etc.)
- Soporta al menos 2 formatos (Excel/CSV/PDF — buscar `xlsx`, `csv`, `jspdf`, `blob`)

**Justificación:** Los datos del sistema deben poder consultarse fuera de la aplicación.

---

## QA — Calidad

### QA-01 · Pre-commit Hooks
**Descripción:** Hooks de git que verifican el código antes de cada commit.  
**Verificación:**
- Existe directorio `.husky/` o configuración `lint-staged` en package.json
- Existe archivo `pre-commit` con al menos una verificación

**Justificación:** Previene que código roto o sin formato llegue al repositorio.

---

### QA-02 · Tests End-to-End
**Descripción:** Tests automatizados que verifican flujos completos.  
**Verificación:**
- Existe directorio `test/` o `e2e/` con archivos `*.e2e-spec.*` o `*.spec.*`
- Al menos 3 archivos de test

**Justificación:** Los flujos críticos deben tener cobertura de tests automatizados.

---

### QA-03 · Linting Configurado
**Descripción:** ESLint o equivalente configurado en frontend y backend.  
**Verificación:**
- Existe `eslint.config.*`, `.eslintrc.*`, o `eslint` en `package.json` (devDependencies)
- Existe script `lint` en package.json

**Justificación:** Código consistente y sin errores comunes.

---

### QA-04 · TypeScript Estricto
**Descripción:** TypeScript configurado con verificación de tipos.  
**Verificación:**
- Existe `tsconfig.json` en el proyecto
- `strict` está habilitado o al menos `strictNullChecks`

**Justificación:** TypeScript reduce errores en runtime y mejora la mantenibilidad.

---

## ARCH — Arquitectura

> Estándares de arquitectura del stack NOR-PAN. Referencia detallada en `Skills/arch/`.

### ARCH-01 · Auth0 Autentica, BD Autoriza
**Descripción:** Auth0 se usa exclusivamente para autenticación (identidad). Los roles y permisos se almacenan y consultan desde MongoDB, nunca desde claims del JWT.  
**Verificación:**
- `middleware/roles.ts` existe y contiene `resolveUser()` que consulta MongoDB
- NO hay lectura de roles desde `req.auth` o claims del token
- El modelo `User` tiene campo `role` en la base de datos

**Justificación:** Desacopla la lógica de autorización del proveedor de identidad. Permite cambiar roles sin re-emitir tokens. Ver `Skills/arch/AUTH.md`.

### ARCH-02 · Endpoint GET /users/me
**Descripción:** El backend expone `GET /users/me` que retorna el usuario actual con su rol resuelto desde la BD. Si el usuario no existe, lo crea automáticamente (first-login provisioning).  
**Verificación:**
- Existe `routes/user.routes.ts` con endpoint `GET /me`
- El endpoint usa middleware `checkJwt` + `resolveUser`
- Retorna `{ auth0Id, email, name, role }` desde MongoDB

**Justificación:** Centraliza la resolución de identidad+rol en un único punto. El frontend no necesita saber cómo se resuelven los roles.

### ARCH-03 · Roles desde MongoDB (Frontend)
**Descripción:** El frontend obtiene el rol del usuario llamando a `GET /users/me`, nunca leyendo claims del JWT.  
**Verificación:**
- `hooks/use-current-user.ts` usa `useQuery` para llamar a la API
- NO hay lectura de `user['roles']` ni `user['https://...']` desde el token Auth0
- `RoleGuard` consume el hook `useCurrentUser`, no el token

**Justificación:** Consistencia con el principio "Auth0 autentica, la BD autoriza". El frontend siempre refleja el estado real de la BD.

### ARCH-04 · SKIP_AUTH Dev Mode
**Descripción:** Backend y frontend soportan `SKIP_AUTH=true` para desarrollo local sin Auth0.  
**Verificación:**
- Backend: `middleware/auth.ts` tiene bypass condicional cuando `SKIP_AUTH=true`
- Frontend: `Auth0Provider` tiene `MockAuth0Provider` alternativo
- Frontend: `use-current-user.ts` retorna mock user cuando SKIP_AUTH activo
- `.env.example` documenta la variable `SKIP_AUTH`

**Justificación:** Permite desarrollo sin dependencia de Auth0. Reduce fricción al onboardear devs. Ver `Skills/arch/SECURITY.md`.

### ARCH-05 · Estructura Backend Estándar
**Descripción:** El backend sigue la estructura Express + TypeScript + Mongoose definida en el estándar.  
**Verificación:**
- Directorio `src/config/` con `env.ts` y `database.ts`
- Directorio `src/middleware/` con `auth.ts`, `roles.ts`, `errorHandler.ts`, `validate.ts`
- Directorio `src/models/` con al menos `user.model.ts`
- Directorio `src/routes/` con `index.ts` que registra todas las rutas
- `app.ts` en raíz de `src/` como entry point

**Justificación:** Estructura predecible reduce tiempo de onboarding. Ver `Skills/arch/BACKEND.md`.

### ARCH-06 · Estructura Frontend Estándar
**Descripción:** El frontend sigue la estructura React + Vite + shadcn/ui definida en el estándar.  
**Verificación:**
- Directorio `src/components/` con subdirectorios `auth/`, `layout/`, `ui/`
- Directorio `src/hooks/` con `use-api.ts` y `use-current-user.ts`
- Directorio `src/providers/` con `Auth0Provider.tsx`
- Directorio `src/pages/` con al menos `Dashboard.tsx`, `Login.tsx`
- Configuración de 3 temas (light, dark, dusk) en `index.css`
- `tailwind.config.ts` con sistema de colores HSL

**Justificación:** Estructura predecible reduce tiempo de onboarding. Ver `Skills/arch/FRONTEND.md`.

---

### QA-05 · Test Coverage Mínimo
**Descripción:** El proyecto debe tener scripts de test definidos y directorio de tests con archivos.  
**Verificación:**
- Existe script `test` en `package.json` del backend y/o frontend
- Directorio `test/`, `tests/`, `__tests__/`, o `src/**/*.spec.*` con archivos de test
- Al menos 1 archivo de test por directorio de código principal

**Justificación:** Sin tests automatizados no hay garantía de que el código funciona. TDD requiere que existan tests antes del código.

---

### QA-06 · Workflow de Desarrollo Documentado
**Descripción:** El proyecto referencia skills de proceso para guiar al agente de desarrollo.  
**Verificación:**
- `CLAUDE.md` del proyecto contiene referencia a skills de proceso o reglas de TDD
- Existe `Skills/process/` con al menos `TEST-DRIVEN-DEVELOPMENT.md` y `GIT-WORKFLOW.md` en el sistema Replicant

**Justificación:** Sin workflow documentado, los agentes improvisan y saltan pasos críticos (TDD, reviews, verificación).

---

## Resumen de Estándares

| Código | Nombre | Categoría |
|--------|--------|-----------|
| DOC-01 | CLAUDE.md (Context Hub) | Documentación |
| DOC-02 | SRS (Requisitos) | Documentación |
| DOC-03 | README Técnico | Documentación |
| DOC-04 | Plan de Trabajo | Documentación |
| DOC-05 | Tutorial con Capturas | Documentación |
| DOC-06 | Tutorial In-App | Documentación |
| UX-01 | Modales de Confirmación | UX |
| UX-02 | Error Boundary | UX |
| UX-03 | Tema Claro / Oscuro | UX |
| UX-04 | Loading States | UX |
| UX-05 | Empty States | UX |
| UX-06 | Toast Notifications | UX |
| FEAT-01 | Centro de Notificaciones | Feature |
| FEAT-02 | Centro de Actividad | Feature |
| FEAT-03 | Push Notifications | Feature |
| FEAT-04 | PWA Ready | Feature |
| FEAT-05 | Exportar Reportes | Feature |
| ARCH-01 | Auth0 Autentica, BD Autoriza | Arquitectura |
| ARCH-02 | Endpoint GET /users/me | Arquitectura |
| ARCH-03 | Roles desde MongoDB | Arquitectura |
| ARCH-04 | SKIP_AUTH Dev Mode | Arquitectura |
| ARCH-05 | Estructura Backend Estándar | Arquitectura |
| ARCH-06 | Estructura Frontend Estándar | Arquitectura |
| QA-01 | Pre-commit Hooks | Quality |
| QA-02 | Tests E2E | Quality |
| QA-03 | Linting | Quality |
| QA-04 | TypeScript Estricto | Quality |
| QA-05 | Test Coverage Mínimo | Quality |
| QA-06 | Workflow de Desarrollo Documentado | Quality |

**Total: 29 estándares obligatorios**
