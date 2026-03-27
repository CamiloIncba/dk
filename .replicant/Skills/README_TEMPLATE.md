# Skill: Generación de README.md (Técnico)

> **Propósito:** Guía para que Claude/Copilot genere un README técnico para desarrolladores con setup rápido y referencia.

---

## Instrucciones para el Agente

Cuando el usuario solicite crear un README:

1. **Detectar si es backend o frontend** por la estructura de carpetas
2. **Generar README.md** específico para ese repo
3. **Mantener conciso** — solo lo esencial para empezar

---

## Plantilla README.md — Backend

```markdown
# {{PROYECTO}}-backend

> Backend API para {{DESCRIPCION_CORTA}}

## Quick Start

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Desarrollo
npm run dev

# Build
npm run build

# Producción
npm run start:prod
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno | `development` |
| `MONGODB_URI` | Conexión MongoDB | `mongodb+srv://...` |
| `AUTH0_DOMAIN` | Dominio Auth0 | `tenant.us.auth0.com` |
| `AUTH0_AUDIENCE` | Audience del API | `https://api.proyecto.com` |

## API Reference

Base URL: `http://localhost:3000/api`

### Endpoints principales

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/{{MODULO}}` | Listar recursos |
| `POST` | `/{{MODULO}}` | Crear recurso |
| `GET` | `/{{MODULO}}/:id` | Obtener por ID |
| `PUT` | `/{{MODULO}}/:id` | Actualizar |
| `DELETE` | `/{{MODULO}}/:id` | Eliminar |

Ver documentación completa: [SRS.md](../{{PROYECTO}}-more/SRS.md)

## Project Structure

```
src/
├── config/          # Configuración
├── common/          # Guards, filters, decorators
├── database/        # Schemas/entities
└── modules/         # Feature modules
    └── {{modulo}}/
        ├── {{modulo}}.controller.ts
        ├── {{modulo}}.service.ts
        └── {{modulo}}.module.ts
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server con hot reload |
| `npm run build` | Compilar TypeScript |
| `npm run start:prod` | Iniciar en producción |
| `npm run test` | Ejecutar tests |
| `npm run test:cov` | Tests con coverage |

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** NestJS / Express
- **Language:** TypeScript
- **Database:** MongoDB (Mongoose)
- **Auth:** Auth0 JWT

---

*INCBA — {{YEAR}}*
```

---

## Plantilla README.md — Frontend

```markdown
# {{PROYECTO}}-frontend

> Frontend web para {{DESCRIPCION_CORTA}}

## Quick Start

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Desarrollo
npm run dev

# Build
npm run build

# Preview build
npm run preview
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | URL del backend | `http://localhost:3000/api` |
| `VITE_AUTH0_DOMAIN` | Dominio Auth0 | `tenant.us.auth0.com` |
| `VITE_AUTH0_CLIENT_ID` | Client ID Auth0 | `abc123xyz` |
| `VITE_AUTH0_AUDIENCE` | Audience del API | `https://api.proyecto.com` |

## Project Structure

```
src/
├── components/      # Componentes reutilizables
│   ├── ui/          # shadcn/ui components
│   └── auth/        # Componentes de auth
├── pages/           # Vistas principales
├── hooks/           # Custom hooks
├── lib/             # Utilidades
├── types/           # TypeScript types
└── providers/       # Context providers
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server con HMR |
| `npm run build` | Build para producción |
| `npm run preview` | Preview del build |
| `npm run lint` | Lint con ESLint |
| `npm run test` | Ejecutar tests |

## Tech Stack

- **Build:** Vite
- **Framework:** React 18
- **Language:** TypeScript
- **Styles:** TailwindCSS
- **UI:** shadcn/ui
- **Data:** TanStack Query
- **Auth:** Auth0 SPA SDK

## Components

Usamos [shadcn/ui](https://ui.shadcn.com/) para componentes base.

Para agregar un nuevo componente:

```bash
npx shadcn-ui@latest add [component-name]
```

---

*INCBA — {{YEAR}}*
```

---

## Variables a Reemplazar

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{PROYECTO}}` | Nombre del proyecto | APP-PAGOS |
| `{{DESCRIPCION_CORTA}}` | Una línea | Sistema de pagos pendientes |
| `{{MODULO}}` | Módulo principal | payments |
| `{{YEAR}}` | Año actual | 2025 |

---

## Checklist de Calidad

Antes de marcar como completo:

- [ ] Quick start funciona (probado)
- [ ] Variables de entorno documentadas
- [ ] Estructura de carpetas actualizada
- [ ] Scripts listados
- [ ] Tech stack correcto

---

*Skill para Replicant-2049 — INCBA*
