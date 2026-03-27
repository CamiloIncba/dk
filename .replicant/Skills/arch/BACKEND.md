# 🏗️ ARCH: BACKEND — Estándar de Arquitectura Backend

## Stack Estándar

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Express | 5.x | Web framework |
| TypeScript | 5.x (ESM) | Type safety |
| Mongoose | 9.x | ODM MongoDB |
| Zod | 4.x | Validación de schemas |
| express-jwt + jwks-rsa | latest | Auth0 JWT validation |
| tsx | latest | Dev runner (watch mode) |

## Estructura de Directorios

```
src/
├── app.ts                 # Entry point: Express setup + start
├── config/
│   ├── env.ts             # Typed environment variables
│   ├── database.ts        # MongoDB connection
│   └── index.ts           # Re-exports
├── middleware/
│   ├── auth.ts            # JWT validation (Auth0)
│   ├── errorHandler.ts    # Global error handler + AppError
│   ├── roles.ts           # resolveUser + requireRole (from DB)
│   ├── validate.ts        # Zod validation middleware
│   └── index.ts           # Re-exports
├── models/
│   ├── user.model.ts      # User schema (auth0Id, role, active)
│   └── index.ts           # Re-exports
├── routes/
│   ├── health.routes.ts   # GET /api/health
│   ├── user.routes.ts     # GET /api/users/me
│   └── index.ts           # Router composition
├── controllers/           # Request handlers (optional)
├── services/              # Business logic
├── utils/                 # Shared utilities
└── validators/            # Zod schemas
```

## Convenciones

### Rutas
- Prefijo `/api` para todas las rutas
- `GET /api/health` siempre disponible sin auth
- `GET /api/users/me` — identidad + rol del usuario actual

### Middleware Order
1. `helmet()` — Security headers
2. `cors()` — CORS config
3. `express.json()` — Body parsing
4. `morgan()` — Request logging
5. Routes (con `authMiddleware` y `resolveUser` por ruta)
6. `notFoundHandler` — 404 catch-all
7. `errorHandler` — Global error handler

### Error Handling
- Usar `createError(message, statusCode, details?)` para errores tipados
- En dev mode, incluir stack trace en la respuesta
- En producción, solo message + statusCode

### Environment Variables
- Tipadas con `as const` en `env.ts`
- Defaults sensatos para desarrollo
- `SKIP_AUTH=true` para desarrollo sin Auth0

### Scripts en package.json
```json
{
  "dev": "tsx watch src/app.ts",
  "build": "tsc",
  "start": "node dist/app.js",
  "lint": "eslint src/ --fix"
}
```

---

*Estándar INCBA — Express + TypeScript + Mongoose.*
