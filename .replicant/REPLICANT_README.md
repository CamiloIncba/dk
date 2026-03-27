# REPLICANT 2049

> Sistema de documentación inteligente y scaffolding full-stack para proyectos INCBA. Analiza código fuente, genera documentos con GitHub Models (SRS, PLAN, README, etc.), exporta a HTML y MP4, y audita estándares de calidad.

---

## ✅ Funcionalidades Implementadas

### 📁 Comandos CLI

| Comando | Descripción | Estado |
|---------|-------------|--------|
| `replicant init` | Scaffolding de documentación para nuevos proyectos | ✅ Completo |
| `replicant sync` | Verificación de estado y progreso de documentación | ✅ Completo |
| `replicant generate` | Generación automática de documentos con GitHub Models | ✅ Completo |
| `replicant export` | Exportar Markdown a HTML (`--html` ✅), MP4 (`--video` 🚧) | ⚠️ Parcial |
| `replicant audit` | Auditoría de estándares del proyecto (27 checks) | ✅ Completo |

### 🤖 Generación con IA (GitHub Models)
- ✅ Análisis automático de backend y frontend (controllers, models, componentes)
- ✅ Generación de documentos finales basados en código real
- ✅ Soporte batch: múltiples proyectos en una ejecución
- ✅ $0 costo adicional (incluido en suscripción GitHub Copilot)
- ✅ Modelo configurable vía `--model` (OpenAI GPT-4.1-mini default)

### 🌐 Exportación HTML (`--html`)
- ✅ Markdown → HTML fragment para embedding in-app
- ✅ Imágenes como rutas relativas (no base64, con lazy loading)
- ✅ Generación de TOC JSON (scroll-spy ready)
- ✅ Metadata JSON (título, versión, fecha, contadores)
- ✅ Copia automática de imágenes al directorio destino

### 🎥 Exportación Video (`--video`) — 🚧 En desarrollo

> **Estado: Dev** — La funcionalidad básica existe pero el resultado no cumple expectativas de calidad. Faltan transiciones, música y animaciones. Usar con precaución.

- 🚧 Markdown → slides HTML renderizados con Playwright
- 🚧 Slides estáticos convertidos a clips MP4 vía FFmpeg
- 🚧 Concatenación de clips en video final (hard-cut, sin transiciones)
- 🚧 Cursor visual overlay para grabaciones

### 📸 Pipeline de Capturas
- ✅ Integración con script de capturas (Playwright)
- ✅ Validación de app corriendo antes de capturar
- ✅ Flag `--skip-capture` para usar imágenes existentes
- ✅ Configuración via `capture.script` en tutorial.config.js

### 📋 Auditoría de Estándares (`audit`)
- ✅ 27 estándares obligatorios en 5 categorías (DOC, UX, FEAT, ARCH, QA)
- ✅ Auto-detección de estructura proyecto (backend/frontend/more)
- ✅ Reporte con colores y progress bar (✅/⚠️/❌)
- ✅ Modo `--json` para uso programático
- ✅ Modo `--verbose` para detalles de estándares que pasan
- ✅ Exit code 1 en failures (compatible CI)

### 📁 Skills Templates
- ✅ SRS (IEEE 830), PLAN, CLAUDE, README, LOVABLE-PROMPT, ERASER-DSL, DESIGN
- ✅ TUTORIAL_GUIDE con guía de estructura
- ✅ STANDARDS.md con 29 estándares verificables
- ✅ Estándares de arquitectura (`Skills/arch/AUTH.md`, `BACKEND.md`, `FRONTEND.md`, `SECURITY.md`)

### 🛠️ Skills de Proceso (Development Workflow)
- ✅ **DEVELOPMENT-WORKFLOW.md** — Workflow completonSpec → Plan → Execute con 7 fases
- ✅ **BRAINSTORMING.md** — Diálogo socrático, 2-3 enfoques, diseño en secciones, spec aprobado
- ✅ **GIT-WORKFLOW.md** — Ramas dev/main, HARD-GATE: preguntar antes de commit/push
- ✅ **WRITING-PLANS.md** — Planes con tareas bite-sized (2-5 min), paths exactos, código completo
- ✅ **SUBAGENT-DEVELOPMENT.md** — Subagente por tarea + review 2 etapas (spec → calidad)
- ✅ **TEST-DRIVEN-DEVELOPMENT.md** — RED-GREEN-REFACTOR estricto, Iron Law, anti-racionalización
- ✅ **CODE-REVIEW.md** — Review de 2 etapas: spec compliance + code quality
- ✅ **FINISHING-BRANCH.md** — Verificar tests, opciones merge/PR/keep/discard
- ✅ **SYSTEMATIC-DEBUGGING.md** — 4 fases: root cause → pattern → hypothesis → implementation
- ✅ **VERIFICATION-BEFORE-COMPLETION.md** — Iron Law: evidencia antes de claims
- ✅ **WRITING-SKILLS.md** — TDD para documentación de procesos
- ✅ **DISPATCHING-PARALLEL-AGENTS.md** — Coordinación de subagentes paralelos

### 🛡️ Anti-Racionalización Integrada
- ✅ Tablas "Excusa vs Realidad" en cada skill de proceso
- ✅ Listas de Red Flags para auto-chequeo del agente
- ✅ Hard Gates que bloquean acción sin aprobación
- ✅ Sección obligatoria en CLAUDE.md generados con reglas TDD + Git + Verificación

### 🔄 Plan Review Loop
- ✅ Self-review automático en `generate`: doc generado se revisa contra template
- ✅ Corrige secciones faltantes, placeholders sin reemplazar, contenido genérico
- ✅ Best-effort (si falla review, usa documento original)

### 🏗️ Scaffolding Full-Stack (`init --full`)
- ✅ Backend Express 5 + TypeScript + Mongoose (boilerplate listo)
- ✅ Frontend React + Vite + shadcn/ui + Auth0 (boilerplate listo)
- ✅ Patrón de autorización NOR-PAN: "Auth0 autentica, la BD autoriza"
- ✅ SKIP_AUTH para desarrollo local sin Auth0
- ✅ 3 temas (light, dark, dusk) con CSS variables
- ✅ Variables de template (`{{PROYECTO}}`, `{{CLIENTE}}`, etc.) reemplazadas automáticamente
- ✅ MongoDB Atlas automático con `--atlas` (proyecto + cluster M10 + user + .env)
- ✅ Auth0 automático con `--auth0` (SPA app + API + M2M + roles + .env)

---

## 🚧 Funcionalidades Pendientes

| Prioridad | Feature | Detalle |
|-----------|---------|---------|
| **P1** | Video — Transiciones | Los clips se concatenan con hard-cut (`-c copy`). Faltan filtros FFmpeg `xfade` para crossfade y fade-black. |
| **P2** | Video — Música de fondo | `config.video.backgroundMusic` se resuelve en el CLI pero nunca se usa en export-video.mjs. Falta `-i` + filtro de audio overlay. |
| **P3** | Video — Animaciones de slides | Los slides se capturan como screenshots estáticos. Falta renderizado por fases (text reveal, opacity transitions). |
| **P4** | sync `--update-progress` | El flag se parsea pero no tiene lógica. Debería reescribir las tablas de progreso en CLAUDE.md automáticamente. |
| **P5** | Modelos Anthropic directo | Solo funciona vía GitHub Models API proxy. No hay soporte para `ANTHROPIC_API_KEY` directo. El default real es `openai/gpt-4.1-mini`, no Sonnet 4 como dice la ayuda. |
| **P6** | Eliminar dep `fluent-ffmpeg` | Está en `dependencies` pero nunca se importa. export-video.mjs usa `child_process.spawn` + `ffmpeg-static` directamente. |
| **P7** | Token Efficiency en Skills | Optimizar el tamaño de los skills de proceso (<500 palabras). Cross-references en vez de repetición. Técnicas de CSO (Claude Search Optimization) para discovery automático de skills relevantes. |

## 📦 Instalación

```bash
# Global
npm install -g replicant-2049

# O como dev dependency
npm install -D replicant-2049

# Instalar navegadores de Playwright (primera vez, solo si usa --video)
npx playwright install chromium
```

## 🚀 Uso Rápido

### Inicializar nuevo proyecto

```bash
# Interactivo (solo documentación)
npx replicant init

# Con parámetros
npx replicant init --project TC --client NOR-PAN
```

Esto crea:
```
TC-more/
├── CLAUDE.md           ← Hub central de contexto
├── SRS.md              ← Especificación de requisitos
├── PLAN.md             ← Plan de trabajo
├── LOVABLE-PROMPT.md   ← Prompts para mockups
├── ERASER-DSL.md       ← DSL para diagramas
├── TUTORIAL.md         ← Tutorial de usuario
├── SS/                 ← Screenshots
└── diagrams/           ← Diagramas exportados

project.config.js       ← Configuración del proyecto
```

### Scaffolding completo (`--full`)

Genera documentación **+ backend + frontend** listos para desarrollar:

```bash
# Full stack con defaults
npx replicant init --project TC --client NOR-PAN --full

# Solo backend
npx replicant init --project TC --client NOR-PAN --backend

# Solo frontend
npx replicant init --project TC --client NOR-PAN --frontend

# Con puertos y BD personalizados
npx replicant init --project TC --client NOR-PAN --full \
  --port-backend 3002 --port-frontend 5175 --db-name tc_prod
```

Esto crea la estructura completa:
```
TC-backend/
├── src/
│   ├── app.ts                  ← Entry point Express
│   ├── config/                 ← env.ts, database.ts
│   ├── middleware/             ← auth, roles, validation, errors
│   ├── models/                 ← user.model.ts
│   └── routes/                 ← health, users (GET /me)
├── .env                        ← Generado desde .env.example
├── package.json
└── tsconfig.json

TC-frontend/
├── src/
│   ├── components/
│   │   ├── auth/               ← ProtectedRoute, RoleGuard, UserMenu
│   │   ├── layout/             ← AppLayout, Sidebar, Header
│   │   └── ui/                 ← shadcn components
│   ├── hooks/                  ← use-api, use-current-user
│   ├── pages/                  ← Dashboard, Login, AuthCallback
│   ├── providers/              ← Auth0Provider
│   ├── config/                 ← auth0.config, skip-auth
│   └── App.tsx
├── .env                        ← Generado desde .env.example
├── package.json
└── vite.config.ts

TC-more/                        ← Documentación (siempre se crea)
```

#### Opciones de `--full`

| Flag | Default | Descripción |
|------|---------|-------------|
| `--full` | — | Scaffolding backend + frontend + docs |
| `--backend` | — | Solo backend + docs |
| `--frontend` | — | Solo frontend + docs |
| `--port-backend` | `3001` | Puerto del backend Express |
| `--port-frontend` | `5174` | Puerto del frontend Vite |
| `--db-name` | `{proyecto}_db` | Nombre de la base de datos MongoDB |
| `--atlas` | — | Crear proyecto + cluster + user en MongoDB Atlas automáticamente |
| `--atlas-org` | auto-detect | Atlas Organization ID |
| `--atlas-provider` | `AWS` | Cloud provider: AWS, AZURE, GCP |
| `--atlas-region` | `SA_EAST_1` | Región del cluster |
| `--auth0` | — | Configurar Auth0: SPA app, API, M2M, roles |
| `--auth0-domain` | auto-detect | Auth0 tenant domain |
| `--auth0-audience` | `https://api.{project}.norpan.com` | Custom API audience |

#### MongoDB Atlas automático (`--atlas`)

Con `--atlas`, Replicant usa el [Atlas CLI](https://www.mongodb.com/docs/atlas/cli/current/) para crear toda la infraestructura de MongoDB:

```bash
# Prerequisitos (una sola vez)
winget install MongoDB.MongoDBAtlasCLI
atlas auth login

# Scaffolding con Atlas
npx replicant init --project TC --client NOR-PAN --full --atlas

# Con región específica (ej: São Paulo)
npx replicant init --project TC --client NOR-PAN --full --atlas --atlas-region SA_EAST_1
```

Esto crea automáticamente:
1. **Proyecto** en Atlas (o reutiliza existente)
2. **Cluster M10** (AWS São Paulo, 10GB — misma config que TC y APP-PAGOS)
3. **Equipo**: apps@nor-pan.com (GROUP_OWNER) + benjamin@incba.com.ar (GROUP_READ_ONLY)
4. **Usuario de BD** con password generado
5. **Access list** abierto para dev (0.0.0.0/0)
6. **Connection string** escrito en `.env` del backend

#### Auth0 automático (`--auth0`)

Con `--auth0`, Replicant usa el [Auth0 CLI](https://github.com/auth0/auth0-cli) para configurar un tenant previamente creado:

```bash
# Prerequisitos (una sola vez)
# Descargar Auth0 CLI: https://github.com/auth0/auth0-cli/releases
# Crear tenant manualmente en Auth0 Dashboard
auth0 login --domain mi-proyecto.us.auth0.com

# Scaffolding con Auth0
npx replicant init --project TC --client NOR-PAN --full --auth0

# Con Atlas + Auth0 juntos
npx replicant init --project TC --client NOR-PAN --full --atlas --auth0

# Con audience personalizado
npx replicant init --project TC --client NOR-PAN --full --auth0 \\
  --auth0-audience https://api.tc.norpan.com
```

Esto configura automáticamente:
1. **SPA Application** → CLIENT_ID para el frontend
2. **API / Resource Server** → AUDIENCE para JWT validation
3. **M2M Application** → CLIENT_ID + SECRET para Management API
4. **Roles**: admin, operador, lector (estándar NOR-PAN)
5. **Archivos .env** actualizados en frontend y backend

> **Paso manual requerido**: Autorizar la app M2M para la Management API en Auth0 Dashboard → APIs → Auth0 Management API → Machine to Machine Applications. Otorgar scopes: `read:users`, `create:users`, `delete:users`, `update:users`.

#### Estándares incluidos

Los boilerplates implementan los estándares de arquitectura NOR-PAN:

- **Auth0 autentica, la BD autoriza** — Roles en MongoDB, no en JWT claims
- **GET /users/me** — Auto-provisioning en primer login
- **SKIP_AUTH** — Desarrollo local sin Auth0
- **3 temas** — Light, Dark, Dusk con CSS variables
- **27 estándares verificables** — `replicant audit` valida cumplimiento

### Verificar documentación

```bash
# Verificar estado
npx replicant sync

# Solo check (sin modificar)
npx replicant sync --check
```

### Generar documentos con IA (GitHub Models)

Requiere `GITHUB_TOKEN` (Personal Access Token):

```bash
# Crear token en: https://github.com/settings/tokens
# Windows PowerShell:
$env:GITHUB_TOKEN = "ghp_..."
# Linux/Mac:
export GITHUB_TOKEN="ghp_..."
```

```bash
# Un proyecto específico
npx replicant generate --project APP-PAGOS-PENDIENTES

# Todos los proyectos de una carpeta
npx replicant generate --all --dir "C:\Proyectos\NOR-PAN"

# Solo ciertos documentos
npx replicant generate --project TC --docs SRS,PLAN

# Dry-run (analiza sin llamar a la API)
npx replicant generate --project TC --dry-run

# Usar Opus 4 (máxima calidad)
npx replicant generate --project TC --model claude-opus-4-20250514

# Usar GPT-4o
npx replicant generate --project TC --model gpt-4o

# Sobreescribir documentos existentes
npx replicant generate --project TC --force
```

Output al finalizar:
```
═══════════════════════════════════════════════════════════
 REPLICANT 2049 — Generación Completada
═══════════════════════════════════════════════════════════

 Proyectos procesados: 2
 ├── APP-PAGOS-PENDIENTES      ✓ 6 documentos
 └── TC                        ✓ 6 documentos

 Documentos generados: 12 total

═══════════════════════════════════════════════════════════
 CONSUMO
═══════════════════════════════════════════════════════════
 Input tokens:    104,280
 Output tokens:    21,460
 Modelo:          Claude Sonnet 4
 Tiempo:          85.3s
 Costo:           $0.00 (incluido en suscripción GitHub Copilot)
═══════════════════════════════════════════════════════════
```

#### Modelos disponibles

| Modelo | Proveedor | Uso recomendado |
|--------|-----------|-----------------|
| `claude-sonnet-4-20250514` | Anthropic | **Default** — Mejor calidad/velocidad |
| `claude-opus-4-20250514` | Anthropic | Máxima calidad |
| `claude-3-5-sonnet-20241022` | Anthropic | Alternativa estable |
| `gpt-4o` | OpenAI | Alternativa GPT |

### Exportar documentos

```bash
# HTML (default)
npx replicant export --config ./tutorial.config.js

# Video MP4
npx replicant export --config ./tutorial.config.js --video

# Todos los formatos
npx replicant export --html --video
```

## 📁 Estructura de Proyecto INCBA

```
C:/Proyectos/
└── CLIENTE/                    # Carpeta del cliente
    └── PROYECTO/               # Nombre del proyecto
        ├── PROYECTO-backend/   # Backend (NestJS/Express)
        ├── PROYECTO-frontend/  # Frontend (React + Vite)
        ├── PROYECTO-more/      # Documentación ← Replicant
        │   ├── CLAUDE.md
        │   ├── SRS.md
        │   ├── PLAN.md
        │   ├── TUTORIAL.md
        │   └── SS/
        └── project.config.js   # Config de Replicant
```

## 📋 Skills Templates

Los templates en `Skills/` guían la generación de documentos:

| Template | Propósito |
|----------|-----------|
| `SRS_TEMPLATE.md` | Especificación de requisitos (IEEE 830) |
| `PLAN_TEMPLATE.md` | Plan de trabajo con sprints |
| `CLAUDE_TEMPLATE.md` | Hub central de contexto y logs |
| `LOVABLE_PROMPT_TEMPLATE.md` | Prompts para mockups en lovable.dev |
| `ERASER_DSL_TEMPLATE.md` | DSL para diagramas en eraser.io |
| `README_TEMPLATE.md` | README técnico para repos |
| `STANDARDS.md` | 27 estándares verificables (DOC, UX, FEAT, ARCH, QA) |
| `arch/AUTH.md` | Estándar de autenticación/autorización NOR-PAN |
| `arch/BACKEND.md` | Estándar de arquitectura backend |
| `arch/FRONTEND.md` | Estándar de arquitectura frontend |
| `arch/SECURITY.md` | Estándar de seguridad por capas |

## ⚙️ Project Config

El archivo `project.config.js` centraliza la configuración del proyecto:

```javascript
export default {
  project: {
    code: 'TC',
    name: 'Sistema de Cambio de Divisas',
  },
  client: {
    name: 'NOR-PAN S.R.L.',
    folder: 'NOR-PAN',
  },
  team: {
    pm: 'Felipe Rebolledo',
    developer: 'Camilo Acencio',
  },
  progress: {
    requirements: [
      { code: 'RF-001', name: 'Autenticación', progress: 100 },
      { code: 'RF-002', name: 'CRUD Clientes', progress: 80 },
    ],
  },
};
```

Ver `project.config.example.js` para todas las opciones disponibles.

## 📄 Export Config (tutorial.config.js)

Para exportar documentos a HTML/Video:

```javascript
export default {
  input: './TUTORIAL.md',
  output: './TUTORIAL.html',
  imagesDir: './SS',
  
  cover: {
    logo: './SS/logo.png',
    title: 'Tutorial de Uso',
    subtitle: 'Guía completa',
    version: '1.0',
    footer: 'Mi Empresa',
  },
  
  header: 'Mi Empresa · Mi Sistema',
  theme: 'shadcn-dark',
  
  video: {
    output: './TUTORIAL.mp4',
    fps: 30,
    slideDuration: 6,
    transition: 'crossfade',
  },
};
```

### Opciones principales

| Opción | Tipo | Descripción |
|--------|------|-------------|
| `input` | `string` | Ruta al Markdown |
| `output` | `string` | Ruta del archivo generado |
| `imagesDir` | `string` | Carpeta de screenshots |
| `theme` | `string` | Tema para video slides (`shadcn-dark`) |

## 🎨 Temas

### Built-in: `shadcn-dark`

- Slides de video: fondo zinc-950, tipografía clara, bordes zinc-800
- Código: fondo dark con fuente monospace
- Tablas: headers oscuros, filas alternadas

### Tema personalizado

```javascript
// mi-tema.mjs
const CSS = `
  body { font-family: Georgia, serif; }
  .cover { background: #1a1a2e; }
`;
export default CSS;
```

## 📖 Uso como Módulo

```javascript
import { exportTutorialToHTML } from 'replicant-2049';
import { exportTutorialToVideo } from 'replicant-2049/video';

await exportTutorialToHTML(config);
await exportTutorialToVideo(config);
```

## 🔄 Progress Tracking

El comando `sync` lee `CLAUDE.md` y detecta el progreso de los RFs:

```bash
npx replicant sync
```

Output:
```
📊 Documentation Status Report

Documents:
  ✅ CLAUDE.md            Complete
  ✅ SRS.md               Complete
  ⚠️ PLAN.md              Template
  ⬜ TUTORIAL.md          Not created

RF Progress:
  RF-001 Autenticación      ██████████ 100%
  RF-002 CRUD Clientes      ████████░░  80%
  RF-003 Dashboard          ░░░░░░░░░░   0%

  Overall: ████████░░ 60%
```

Cuando todos los RFs llegan al 100%, se muestra:
```
🎉 ALL RFs COMPLETE! Ready for release.
```

## 📘 Guías

- [GUIDE.md](GUIDE.md) — Guía de uso práctica con escenarios y ejemplos paso a paso
- [Skills/STANDARDS.md](Skills/STANDARDS.md) — 27 estándares obligatorios verificables con `audit`

## 📄 Licencia

MIT © [CamiloIncba](https://github.com/CamiloIncba)