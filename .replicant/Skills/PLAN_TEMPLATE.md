# Skill: Generación de PLAN.md (Plan de Trabajo)

> **Propósito:** Guía para que Claude/Copilot genere un plan de trabajo estilo Kanban/Trello con arquitectura, sprints y estado del proyecto.

---

## Instrucciones para el Agente

Cuando el usuario solicite crear un PLAN, sigue estos pasos:

1. **Recopilar contexto** del proyecto:
   - SRS.md si existe
   - Stack tecnológico definido
   - Timeline y recursos disponibles

2. **Generar PLAN.md** usando la plantilla de abajo

3. **Marcar como borrador** hasta aprobación de jefatura

4. **Una vez aprobado, el documento NO debe modificarse**

---

## Plantilla PLAN.md

```markdown
# {{PROYECTO}} — {{NOMBRE_COMPLETO}}

## 📋 Resumen del Proyecto

{{Descripción de 1-2 párrafos sobre qué hace el sistema y qué problema resuelve.}}

**Cliente:** {{CLIENTE}}  
**Project Manager:** {{PM}}  
**Desarrollador:** {{DEV}}  
**Fecha objetivo:** {{FECHA_OBJETIVO}}  

---

## 🏗️ Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│    Database     │
│  React + Vite   │     │   Express/Nest  │     │  MongoDB Atlas  │
│  localhost:5173 │     │  localhost:3000 │     └─────────────────┘
└─────────────────┘     └─────────────────┘
                              │
                        ┌─────────┐
                        │  Auth0  │
                        │ JWT+SPA │
                        └─────────┘
```

---

## 📁 Estructura de Carpetas

```
{{PROYECTO}}-backend/
├── src/
│   ├── config/           # Configuración y env vars
│   ├── modules/          # Módulos por feature
│   ├── common/           # Guards, decorators, filters
│   └── database/         # Schemas/entities
└── .env

{{PROYECTO}}-frontend/
├── src/
│   ├── components/       # Componentes React
│   ├── pages/            # Vistas principales
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilidades
│   └── types/            # TypeScript types
└── .env

{{PROYECTO}}-more/
├── CLAUDE.md             # Hub central
├── SRS.md                # Especificación (inmutable)
├── PLAN.md               # Este archivo (inmutable)
├── TUTORIAL.md           # Guía de usuario
└── SS/                   # Screenshots
```

---

## 🔑 Tecnologías

| Capa | Stack |
|------|-------|
| **Frontend** | React 18, Vite, TailwindCSS, shadcn/ui, TanStack Query |
| **Backend** | Node.js, Express/NestJS, TypeScript |
| **Auth** | Auth0 (SPA + API) |
| **DB** | MongoDB Atlas |
| **Validación** | Zod |
| **Hosting** | AWS (Amplify + Elastic Beanstalk) |

---

## 👥 Roles y Permisos

| Rol | Permisos |
|-----|----------|
| `admin` | Acceso total, gestión de usuarios, configuración |
| `manager` | CRUD en su área, aprobar, autorizar |
| `operator` | Crear y ver en su área |

---

## 🗓️ Timeline

| Sprint | Duración | Objetivo |
|--------|----------|----------|
| Sprint 1 | 2 semanas | Setup + Auth + CRUD básico |
| Sprint 2 | 2 semanas | Features principales |
| Sprint 3 | 2 semanas | Dashboard + Reportes |
| Sprint 4 | 1 semana | Testing + Ajustes |
| Sprint 5 | 1 semana | Deploy + Capacitación |

**Total estimado:** {{TOTAL_SEMANAS}} semanas

---

## 📊 Estado del Proyecto

### Sprint Actual: {{SPRINT_ACTUAL}}

| Tarea | Estado | Asignado |
|-------|--------|----------|
| {{Tarea 1}} | ✅ Completado | {{Dev}} |
| {{Tarea 2}} | 🔄 En progreso | {{Dev}} |
| {{Tarea 3}} | ⏳ Pendiente | — |

### Backlog

| # | Feature | Prioridad | Sprint |
|---|---------|-----------|--------|
| 1 | {{Feature}} | Alta | Sprint 1 |
| 2 | {{Feature}} | Media | Sprint 2 |

---

## 🌐 API Endpoints

### {{Módulo 1}} `/api/{{modulo}}`

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| `GET` | `/` | Listar | todos |
| `GET` | `/:id` | Obtener por ID | todos |
| `POST` | `/` | Crear | admin, operator |
| `PUT` | `/:id` | Editar | admin |
| `DELETE` | `/:id` | Eliminar | admin |

---

## 🔧 Variables de Entorno

### Backend `.env`

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://...

# Auth0
AUTH0_DOMAIN={{tenant}}.us.auth0.com
AUTH0_AUDIENCE=https://api.{{proyecto}}.com
```

### Frontend `.env`

```bash
VITE_API_URL=http://localhost:3000/api
VITE_AUTH0_DOMAIN={{tenant}}.us.auth0.com
VITE_AUTH0_CLIENT_ID={{client_id}}
VITE_AUTH0_AUDIENCE=https://api.{{proyecto}}.com
```

---

## 📦 Scripts Disponibles

### Backend

```bash
npm run dev        # Desarrollo con hot reload
npm run build      # Compilar TypeScript
npm run start      # Producción
npm run test       # Tests
```

### Frontend

```bash
npm run dev        # Desarrollo
npm run build      # Build producción
npm run preview    # Preview del build
```

---

## 🚀 Deploy

### Backend (Elastic Beanstalk)

1. Configurar EB CLI
2. Variables de entorno en la consola AWS
3. `eb deploy`

### Frontend (Amplify)

1. Conectar repo de GitHub
2. Configurar variables de entorno
3. Deploy automático en push a main

---

## 📝 Notas de Implementación

### Decisiones técnicas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| {{Fecha}} | {{Decisión}} | {{Razón}} |

### Riesgos identificados

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| {{Riesgo}} | Alto/Medio/Bajo | {{Mitigación}} |

---

*Documento inmutable post-aprobación — INCBA*
```

---

## Variables a Reemplazar

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{PROYECTO}}` | Nombre corto | TC, APP-PAGOS |
| `{{NOMBRE_COMPLETO}}` | Nombre descriptivo | Sistema de Gestión de Cambio de Divisas |
| `{{CLIENTE}}` | Nombre del cliente | NOR-PAN S.R.L. |
| `{{PM}}` | Project Manager | Felipe Rebolledo |
| `{{DEV}}` | Desarrollador principal | Camilo Acencio |
| `{{FECHA_OBJETIVO}}` | Fecha de entrega | Abril 2026 |
| `{{TOTAL_SEMANAS}}` | Duración total | 8 |
| `{{SPRINT_ACTUAL}}` | Sprint en curso | Sprint 1 |

---

## Checklist de Calidad

Antes de marcar como completo, verificar:

- [ ] Arquitectura incluye diagrama ASCII
- [ ] Estructura de carpetas definida
- [ ] Stack tecnológico completo
- [ ] Timeline con sprints definidos
- [ ] Endpoints principales listados
- [ ] Variables de entorno documentadas
- [ ] Scripts disponibles

---

*Skill para Replicant-2049 — INCBA*
