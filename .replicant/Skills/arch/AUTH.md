# 🔐 ARCH: AUTH — Estándar de Autenticación y Autorización

## Principio

> **Auth0 solo AUTENTICA (verifica identidad). La BD AUTORIZA (asigna permisos).**

## Flujo

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │────▶│  Auth0   │────▶│ Backend  │────▶│ MongoDB  │
│          │     │(JWT only)│     │GET /me   │     │User.role │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                                  │
     │◀──── { role, email, ... } ──────│
```

1. Usuario hace login con Auth0 → obtiene JWT con `sub` (auth0Id)
2. Frontend llama `GET /api/users/me` con Bearer token
3. Backend valida JWT (solo autenticidad), extrae `sub`
4. Backend busca en MongoDB: `User.findOne({ auth0Id: sub })`
5. Backend responde con `{ id, email, nombre, role, ... }`
6. Frontend usa `role` para mostrar/ocultar UI

## Implementación

### Backend

| Archivo | Responsabilidad |
|---------|----------------|
| `middleware/auth.ts` | Valida JWT, extrae `sub`. NO lee roles del JWT. |
| `middleware/roles.ts` | `resolveUser()` busca en MongoDB. `requireRole()` verifica `user.role`. |
| `routes/user.routes.ts` | `GET /me` — endpoint central de identidad + rol. |
| `models/user.model.ts` | Schema con `auth0Id`, `email`, `name`, `role`, `active`. |

### Frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `hooks/use-current-user.ts` | Llama `GET /users/me` con TanStack Query. Expone `role`, `isAdmin`, `canWrite`. |
| `hooks/use-api.ts` | Inyecta Bearer token automáticamente. |
| `components/auth/RoleGuard.tsx` | Renderiza children solo si el usuario tiene el rol requerido. |

## Anti-patrones

| ❌ Anti-patrón | ✅ Correcto |
|----------------|-------------|
| Leer roles de `auth0User[namespace/roles]` | Leer roles de `GET /users/me` |
| Configurar Auth0 Actions/Rules para roles | Solo usar Auth0 para autenticar |
| Hardcodear roles en el frontend | Roles vienen del backend vía API |
| Guardar roles en localStorage | Cada request resuelve el rol fresco |

## Justificación

- **Un solo punto de verdad**: MongoDB es la fuente de roles
- **Sin dependencia de Auth0 dashboard**: No necesitas Actions/Rules
- **Más fácil de debuggear**: `db.users.find()` muestra todos los roles
- **Portabilidad**: Si cambias de Auth0, solo cambias la autenticación
- **Consistente**: Mismo patrón en todos los proyectos del equipo

---

*Estándar INCBA — Aplica a todos los proyectos con Auth0.*
