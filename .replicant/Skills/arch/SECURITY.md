# 🔒 ARCH: SECURITY — Estándar de Seguridad

## Principios

1. **Never trust the client** — Validar todo en backend
2. **Least privilege** — Roles mínimos necesarios
3. **Defense in depth** — Múltiples capas de protección

## Capas de Seguridad

### 1. Transport
- HTTPS obligatorio en producción
- `helmet()` middleware para security headers
- CORS configurado con `origin` específico (no `*`)

### 2. Authentication (Auth0)
- JWT RS256 con JWKS verification
- Token expiration: 24h (configurable en Auth0)
- `cacheLocation: 'localstorage'` para SPAs
- Refresh tokens habilitados

### 3. Authorization (MongoDB)
- 3 roles base: `admin`, `operador`, `lector`
- Roles resueltos desde MongoDB, NO desde JWT claims
- `resolveUser()` middleware en cada ruta protegida
- `requireRole()` factory para verificar roles

### 4. Input Validation
- Zod schemas en backend para body/query/params
- Validación en middleware (antes del controller)
- Sanitización automática (parse → output limpio)

### 5. Error Handling
- NO exponer stack traces en producción
- Errores tipados con `AppError` (statusCode + message)
- Logs detallados en servidor, mensajes genéricos al cliente

## Variables de Entorno

### Backend (.env)
```
MONGODB_URI=...         # Connection string (nunca commitear)
AUTH0_DOMAIN=...        # Tenant domain
AUTH0_AUDIENCE=...      # API identifier
SKIP_AUTH=false         # Solo true en dev local
CORS_ORIGIN=...        # URL del frontend
```

### Frontend (.env)
```
VITE_AUTH0_DOMAIN=...      # Público (safe)
VITE_AUTH0_CLIENT_ID=...   # Público (safe)
VITE_AUTH0_AUDIENCE=...    # Público (safe)
VITE_API_URL=...           # Backend URL
VITE_SKIP_AUTH=false       # Solo true en dev local
```

### Reglas
- `.env` en `.gitignore` — NUNCA commitear
- `.env.example` commiteado con valores placeholder
- Secrets solo en variables de entorno, nunca en código

## Dev Mode (SKIP_AUTH)

El flag `SKIP_AUTH` existe **exclusivamente** para desarrollo local:

- Backend: `authMiddleware` adjunta user mock con `sub: 'dev|local-admin'`
- Frontend: `MockAuth0Provider` simula Auth0 context
- Frontend: `useCurrentUser` retorna mock con rol configurable via `window.__MOCK_ROLE__`

⚠️ **Nunca** habilitar SKIP_AUTH en staging o producción.

---

*Estándar INCBA — Seguridad por capas.*
