# 📘 Guía de Uso — Replicant 2049

> Guía práctica para el equipo de desarrollo INCBA. Cubre los objetivos del sistema, los escenarios de uso más comunes y ejemplos paso a paso.

---

## 🎯 Objetivos del Sistema

Replicant-2049 es un sistema de **documentación inteligente y scaffolding full-stack** diseñado para:

### 1. Estandarizar la documentación de proyectos
Genera automáticamente SRS, PLAN, README, CLAUDE.md y tutoriales para cada proyecto usando templates (Skills) y análisis real del código fuente. Esto asegura que todos los proyectos del equipo tengan la misma estructura y calidad de documentación.

### 2. Generación de documentos con IA
Analiza controllers, schemas, componentes y hooks del código real, y llama a GitHub Models API (gratis con suscripción Copilot) para generar documentos completos — no genéricos, sino basados en el código actual del proyecto.

### 3. Exportar tutoriales para usuarios finales
Convierte Markdown con capturas de pantalla a:
- **HTML** — Fragmento listo para embedding in-app en una página `/tutorial`
- **Video MP4** — Slides renderizados con Playwright + FFmpeg

### 4. Captura automatizada de screenshots
Pipeline que ejecuta un script Playwright para navegar la app en múltiples roles y secciones, tomando 70+ screenshots automáticamente antes de exportar.

### 5. Scaffolding full-stack
Genera boilerplate completo para nuevos proyectos:
- **Backend**: Express 5 + TypeScript + Mongoose + Auth0 middleware
- **Frontend**: React + Vite + shadcn/ui + Auth0 SDK + 3 temas
- Con provisioning automático de **MongoDB Atlas** (`--atlas`) y **Auth0** (`--auth0`)

### 6. Auditoría de estándares de calidad
Verifica **27 estándares obligatorios** en 5 categorías (DOC, UX, FEAT, ARCH, QA) contra cualquier proyecto, reportando cumplimiento con un score porcentual y detalle por estándar.

---

## 📦 Prerequisitos

```bash
# Instalar Replicant globalmente (una sola vez)
npm install -g replicant-2049

# Para video export: instalar Chromium de Playwright (una sola vez)
npx playwright install chromium

# Para generación con IA: tener un GitHub Token
# Crear en: https://github.com/settings/tokens
```

---

## 🔰 Escenario 1: Proyecto nuevo desde cero

**Situación:** Tenés un repo vacío y necesitás arrancar un proyecto con toda la estructura.

### Opción A: Full-stack (backend + frontend + docs)

```bash
# Ir a la carpeta del cliente
cd C:\Proyectos\NOR-PAN

# Scaffolding completo
npx replicant init --project MI-PROYECTO --client NOR-PAN --full
```

**Resultado:** 3 carpetas listas:
```
MI-PROYECTO-backend/    ← Express 5 + TypeScript + Mongoose + Auth0
MI-PROYECTO-frontend/   ← React + Vite + shadcn/ui + Auth0 + 3 temas
MI-PROYECTO-more/       ← CLAUDE.md, SRS.md, PLAN.md, TUTORIAL.md (templates)
```

Para instalar dependencias y arrancar:
```bash
cd MI-PROYECTO-backend && npm install && npm run dev
cd MI-PROYECTO-frontend && npm install && npm run dev
```

### Opción B: Full-stack con infraestructura automática

```bash
# Con MongoDB Atlas + Auth0 automáticos
npx replicant init --project MI-PROYECTO --client NOR-PAN --full --atlas --auth0
```

Prerequisitos para esta opción:
```bash
# MongoDB Atlas CLI (una sola vez)
winget install MongoDB.MongoDBAtlasCLI
atlas auth login

# Auth0 CLI (una sola vez)
# Descargar: https://github.com/auth0/auth0-cli/releases
auth0 login --domain mi-proyecto.us.auth0.com
```

### Opción C: Solo documentación (ya tenés tu propio stack)

```bash
npx replicant init --project MI-PROYECTO --client NOR-PAN
# Solo crea MI-PROYECTO-more/ con templates de documentación
```

### Opciones disponibles para `init`

| Flag | Default | Descripción |
|------|---------|-------------|
| `--project` | (requerido) | Código del proyecto |
| `--client` | (requerido) | Carpeta del cliente |
| `--full` | — | Backend + frontend + docs |
| `--backend` | — | Solo backend + docs |
| `--frontend` | — | Solo frontend + docs |
| `--port-backend` | `3001` | Puerto del backend |
| `--port-frontend` | `5174` | Puerto del frontend |
| `--db-name` | `{proyecto}_db` | Nombre de la BD MongoDB |
| `--atlas` | — | Crear proyecto + cluster + user en MongoDB Atlas |
| `--auth0` | — | Configurar SPA app + API + M2M + roles en Auth0 |

---

## 🔍 Escenario 2: Auditar un proyecto existente

**Situación:** Tenés un proyecto en desarrollo y querés saber si cumple las buenas prácticas INCBA.

### Ejecutar la auditoría

```bash
# Apuntar al directorio padre que contiene {PROYECTO}-backend/, -frontend/, -more/
npx replicant audit --dir "C:\Proyectos\NOR-PAN" --verbose
```

El auditor auto-detecta la estructura `{PROYECTO}-backend/`, `{PROYECTO}-frontend/`, `{PROYECTO}-more/` y verifica los 27 estándares.

### Ejemplo de salida

```
╔══════════════════════════════════════════════════════════════╗
║          📋  AUDITORÍA DE ESTÁNDARES DE PROYECTO            ║
╚══════════════════════════════════════════════════════════════╝

  Proyecto:  APP-PAGOS-PENDIENTES
  Backend:    ✓
  Frontend:   ✓
  Docs (-more): ✓

  ═══ Documentación (5/7) ═══
    ✅ PASS  DOC-01 CLAUDE.md (Context Hub)
    ❌ FAIL  DOC-02 SRS (Requisitos)
    ⚠️  WARN  DOC-03 README Técnico
    ❌ FAIL  DOC-04 Plan de Trabajo
    ✅ PASS  DOC-05 Tutorial con Capturas
    ✅ PASS  DOC-06 Tutorial In-App
    ...

  ═══ RESULTADO ═══
    ✅ 17 pass  ⚠️ 2 warn  ❌ 2 fail  (27 total)   81%
```

### Modos de salida

```bash
# Reporte visual con colores (default)
npx replicant audit --dir .

# Con detalles de todo (incluyendo los que pasan)
npx replicant audit --dir . --verbose

# JSON para scripts o CI
npx replicant audit --dir . --json > audit-result.json

# El exit code es 1 si hay failures (útil para CI)
npx replicant audit --dir . && echo "Todo OK" || echo "Hay failures"
```

### Corregir lo que falta

Si el audit muestra documentos faltantes (SRS, PLAN, etc.), podés generarlos con IA:

```bash
# Configurar token (una vez por sesión)
$env:GITHUB_TOKEN = "ghp_..."   # PowerShell
export GITHUB_TOKEN="ghp_..."   # Linux/Mac

# Generar solo los docs que faltan
npx replicant generate --project MI-PROYECTO --docs SRS,PLAN

# O generar todos los documentos
npx replicant generate --project MI-PROYECTO

# Dry-run: ver qué haría sin llamar a la API
npx replicant generate --project MI-PROYECTO --dry-run
```

### Categorías de estándares verificados

| Categoría | Cant. | Qué verifica |
|-----------|-------|-------------|
| **DOC** | 7 | CLAUDE.md, SRS, README, PLAN, Tutorial con capturas, Tutorial in-app |
| **UX** | 6 | Modales de confirmación, ErrorBoundary, tema dark/light, loading states, empty states, toast |
| **FEAT** | 5 | Notificaciones, actividad, push notifications, PWA, exportar reportes |
| **ARCH** | 5 | Auth0 + BD autoriza, SKIP_AUTH, rate limiting, logging, .env no committeado |
| **QA** | 4 | Pre-commit hooks, tests E2E, linting, TypeScript estricto |

Ver [Skills/STANDARDS.md](Skills/STANDARDS.md) para el detalle completo de cada estándar.

---

## 📄 Escenario 3: Generar página /tutorial para proyecto finalizado

**Situación:** El proyecto ya está completo y querés agregar una página `/tutorial` dentro de la app.

### Paso 1: Asegurar que exista la documentación

Si no tenés la carpeta `-more/` con el tutorial:

```bash
# Crear estructura de documentación
npx replicant init --project MI-PROYECTO --client NOR-PAN

# Generar el tutorial con IA analizando el código real
$env:GITHUB_TOKEN = "ghp_..."
npx replicant generate --project MI-PROYECTO --docs TUTORIAL
```

### Paso 2: Capturas de pantalla

**Opción A — Manual:** Capturar screenshots a mano y guardarlos en `MI-PROYECTO-more/SS/` con nombres como `01-login.png`, `02-dashboard.png`, etc.

**Opción B — Automatizada:** Crear un script Playwright en `MI-PROYECTO-more/SCRIPT/capture-tutorial.mjs` que navegue la app por roles y secciones. Ver `APP-PAGOS-PENDIENTES-more/SCRIPT/capture-tutorial.mjs` como referencia (~1000 líneas, 3 roles, 17 secciones, ~73 screenshots).

### Paso 3: Configurar el export

Crear `MI-PROYECTO-more/tutorial.config.js`:

```javascript
export default {
  input: './TUTORIAL-MI-PROYECTO.md',
  output: './TUTORIAL-MI-PROYECTO.html',
  imagesDir: './SS',

  // Directorio donde se copian los archivos HTML al frontend
  htmlOutputDir: '../MI-PROYECTO-frontend/public/tutorial',

  cover: {
    logo: './SS/logo.png',
    title: 'Tutorial de Uso\nMi Aplicación',
    subtitle: 'Guía completa del sistema',
    version: '1.0 · Marzo 2026',
    footer: 'NOR-PAN S.R.L.',
  },

  header: 'NOR-PAN · Mi Aplicación',
  theme: 'shadcn-dark',

  // (Opcional) Script de captura automatizada
  capture: {
    script: './SCRIPT/capture-tutorial.mjs',
    appUrl: 'http://localhost:5174',
  },
};
```

### Paso 4: Exportar HTML

```bash
cd MI-PROYECTO-more

# Con captura automática (la app debe estar corriendo en appUrl)
npx replicant export --config ./tutorial.config.js --html

# Sin captura (usar screenshots ya existentes en SS/)
npx replicant export --config ./tutorial.config.js --html --skip-capture
```

Esto genera en `MI-PROYECTO-frontend/public/tutorial/`:
```
tutorial/
├── tutorial-content.html    ← Contenido HTML (fragment, sin <html> wrapper)
├── tutorial-toc.json        ← Tabla de contenidos [{level, id, text}]
├── tutorial-meta.json       ← Metadata {title, version, imageCount, ...}
└── SS/                      ← Imágenes copiadas
    ├── 01-login.png
    ├── 02-dashboard.png
    └── ...
```

### Paso 5: Agregar la página al frontend

Necesitás 4 cosas en el frontend:

**1. Página `src/pages/Tutorial.tsx`**
- Fetch de `tutorial-content.html`, `tutorial-toc.json` y `tutorial-meta.json`
- Sidebar con TOC y scroll-spy (IntersectionObserver)
- Responsive: sidebar como overlay en mobile
- Dark mode via `prose dark:prose-invert`

**2. Ruta en `App.tsx`**
```tsx
import Tutorial from './pages/Tutorial';
// ...
<Route path="/tutorial" element={<ProtectedRoute><Tutorial /></ProtectedRoute>} />
```

**3. Link en menú de usuario**
```tsx
import { BookOpen } from 'lucide-react';
// En el dropdown menu:
<Link to="/tutorial"><BookOpen /> Tutorial</Link>
```

**4. Plugin Tailwind Typography**
```bash
npm install @tailwindcss/typography
```
```ts
// tailwind.config.ts
plugins: [require("@tailwindcss/typography")]
```

> **Nota:** Si el proyecto fue scaffoldeado con `replicant init --full`, la página Tutorial ya viene incluida en el boilerplate del frontend. Solo necesitás ejecutar el Paso 4 (exportar HTML) para generar el contenido.

---

## 🤖 Escenario 4: Generar documentos con IA

**Situación:** Necesitás SRS, PLAN, README u otros documentos basados en el código real del proyecto.

```bash
# Configurar token
$env:GITHUB_TOKEN = "ghp_..."

# Un proyecto específico (genera todos los docs faltantes)
npx replicant generate --project APP-PAGOS-PENDIENTES

# Solo ciertos documentos
npx replicant generate --project TC --docs SRS,PLAN

# Todos los proyectos de una carpeta
npx replicant generate --all --dir "C:\Proyectos\NOR-PAN"

# Dry-run (analiza el código sin llamar a la API)
npx replicant generate --project TC --dry-run

# Sobreescribir documentos existentes
npx replicant generate --project TC --force

# Usar un modelo específico
npx replicant generate --project TC --model claude-opus-4-20250514
```

El generador:
1. Escanea `{PROYECTO}-backend/` y `{PROYECTO}-frontend/` extrayendo endpoints, schemas, componentes, hooks
2. Carga el template del Skill correspondiente (e.g. `Skills/SRS_TEMPLATE.md`)
3. Arma un prompt con el contexto real del código + el template
4. Llama a GitHub Models API y escribe el documento final en `{PROYECTO}-more/`

---

## 🎥 Escenario 5: Generar video tutorial

> ⚠️ **Estado: Dev** — Esta funcionalidad está en desarrollo. El video se genera pero el resultado no cumple expectativas de calidad (sin transiciones, sin música, sin animaciones de slides). Usar solo para pruebas internas.

**Situación:** Querés crear un video MP4 con slides del tutorial.

```bash
cd MI-PROYECTO-more

# Generar video
npx replicant export --config ./tutorial.config.js --video

# Con captura de screenshots primero
npx replicant export --config ./tutorial.config.js --video

# Sin captura
npx replicant export --config ./tutorial.config.js --video --skip-capture
```

Prerequisito: `npx playwright install chromium` (una sola vez).

El video se genera como slides estáticos (cada sección H2/H3 = 1 slide) convertidos a clips MP4 y concatenados.

---

## 🛠️ Escenario 6: Development Workflow con Skills de Proceso

**Situación:** Querés que tu agente de IA siga un workflow disciplinado al desarrollar features (brainstorming → plan → TDD → review → merge).

### Paso 1: Verificar que los skills existen

Los skills de proceso viven en `Skills/process/` dentro de Replicant-2049:

```
Skills/process/
├── DEVELOPMENT-WORKFLOW.md    ← Flujo completo (referencia)
├── BRAINSTORMING.md           ← Idea → Diseño aprobado
├── GIT-WORKFLOW.md            ← dev/main, preguntar antes de commit
├── WRITING-PLANS.md           ← Diseño → Tareas bite-sized
├── SUBAGENT-DEVELOPMENT.md    ← Subagente por tarea + 2 reviews
├── TEST-DRIVEN-DEVELOPMENT.md ← RED-GREEN-REFACTOR obligatorio
├── CODE-REVIEW.md             ← Review spec + calidad
├── FINISHING-BRANCH.md        ← Merge/PR con aprobación
├── SYSTEMATIC-DEBUGGING.md    ← 4 fases de debugging
├── VERIFICATION-BEFORE-COMPLETION.md ← Evidencia antes de claims
├── WRITING-SKILLS.md          ← TDD para documentación
└── DISPATCHING-PARALLEL-AGENTS.md    ← Agentes paralelos
```

### Paso 2: Referenciar en CLAUDE.md del proyecto

Asegurate de que el `CLAUDE.md` de tu proyecto incluya la sección de "Reglas de Desarrollo (Mandatory)" que el template de Replicant genera automáticamente. Esto garantiza que cualquier agente que trabaje en el proyecto siga las reglas.

### Paso 3: El flujo en la práctica

Cuando le pedís al agente "agregá feature X", el flujo debería ser:

```
1. BRAINSTORMING → El agente pregunta, propone enfoques, presenta diseño
2. WRITING-PLANS → Descompone en tareas de 2-5 min con código completo
3. GIT-WORKFLOW → Verifica rama dev, baseline limpio
4. TDD por tarea → Test falla → Código mínimo → Test pasa → Commit (pregunta antes)
5. CODE-REVIEW → Spec compliance + Code quality
6. VERIFICATION → Correr tests, lint, build — evidencia real
7. FINISHING-BRANCH → Pregunta: merge/PR/keep/discard
```

### Principios clave

- **TDD obligatorio** — No hay código sin test que falle primero
- **Preguntar antes de commit/push** — El usuario controla qué va al repo
- **Evidencia antes de claims** — "Listo" solo si los tests pasan y lo demostrás
- **Anti-racionalización** — Cada skill tiene tablas "Excusa vs Realidad"

---

## 📋 Referencia rápida

| Necesito... | Comando |
|-------------|---------|
| Proyecto nuevo completo | `npx replicant init --project X --client Y --full` |
| Solo documentación | `npx replicant init --project X --client Y` |
| Auditar estándares | `npx replicant audit --dir . --verbose` |
| Generar docs con IA | `npx replicant generate --project X` |
| Generar docs específicos | `npx replicant generate --project X --docs SRS,PLAN` |
| Exportar tutorial HTML | `npx replicant export --config ./tutorial.config.js --html` |
| Exportar video MP4 🚧 | `npx replicant export --config ./tutorial.config.js --video` *(dev)* |
| Ver ayuda | `npx replicant --help` |
| Ver versión | `npx replicant --version` |

---

## ❓ Preguntas Frecuentes

### ¿Necesito Auth0 configurado para el scaffolding?
No. El boilerplate incluye `SKIP_AUTH=true` por defecto para desarrollo local sin Auth0. Cuando quieras integrar Auth0, usá `--auth0` al hacer init o configuralo manualmente.

### ¿Qué pasa si ya tengo un proyecto y quiero agregar documentación?
Usá `npx replicant init --project X --client Y` (sin `--full`) para crear solo la carpeta `-more/` con templates. Luego `npx replicant generate` para llenarlos con IA.

### ¿Cuánto cuesta la generación con IA?
$0 adicional. Usa GitHub Models API que viene incluida en la suscripción de GitHub Copilot.

### ¿Puedo personalizar los templates?
Sí. Los templates están en `Skills/` dentro de Replicant-2049. Modificá los `.md` según las necesidades del equipo.

### ¿El audit funciona con cualquier stack?
El audit verifica patrones genéricos (archivos, imports, configuraciones). Funciona con cualquier proyecto que siga la estructura `{PROYECTO}-backend/`, `{PROYECTO}-frontend/`, `{PROYECTO}-more/`.

### ¿Puedo ejecutar el audit en CI/CD?
Sí. Usá `npx replicant audit --dir . --json` — retorna JSON y exit code 1 si hay failures.

---

*Replicant-2049 — INCBA · Marzo 2026*
