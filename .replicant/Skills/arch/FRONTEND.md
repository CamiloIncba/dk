# 🎨 ARCH: FRONTEND — Estándar de Arquitectura Frontend

## Stack Estándar

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| React | 18.x | UI framework |
| Vite | 5.x + SWC | Build tool |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first CSS |
| shadcn/ui | latest | Component library (copy-paste) |
| TanStack Query | 5.x | Server state management |
| React Router | 6.x | Routing |
| @auth0/auth0-react | 2.x | Authentication |
| next-themes | 0.3.x | Theme management |
| Sonner | latest | Toast notifications |
| Lucide React | latest | Icons |

## Estructura de Directorios

```
src/
├── main.tsx               # Entry point: render App
├── App.tsx                # Root: providers + routes
├── index.css              # Tailwind + CSS variables (3 themes)
├── vite-env.d.ts          # Vite type declarations
├── config/
│   ├── auth0.config.ts    # Auth0 domain, clientId, audience
│   └── skip-auth.ts       # SKIP_AUTH flag for dev mode
├── hooks/
│   ├── use-api.ts         # fetchWithAuth: auto Bearer token
│   └── use-current-user.ts # GET /users/me → role from MongoDB
├── types/
│   └── index.ts           # Role, CurrentUser, domain types
├── lib/
│   └── utils.ts           # cn() helper (clsx + tailwind-merge)
├── providers/
│   └── Auth0Provider.tsx  # Auth0 + MockAuth0 for SKIP_AUTH
├── components/
│   ├── ErrorBoundary.tsx  # React error boundary
│   ├── DevRibbon.tsx      # "Desarrollo" ribbon in dev mode
│   ├── theme-toggle.tsx   # Dark/Light/Dusk toggle
│   ├── auth/
│   │   ├── ProtectedRoute.tsx  # Auth guard
│   │   ├── RoleGuard.tsx       # Role-based rendering
│   │   ├── UserMenu.tsx        # User dropdown with logout
│   │   └── index.ts
│   ├── layout/
│   │   ├── AppLayout.tsx  # Sidebar + Header + Outlet
│   │   ├── Sidebar.tsx    # Collapsible nav with role-based items
│   │   ├── Header.tsx     # Top bar with theme toggle + user menu
│   │   └── index.ts
│   └── ui/                # shadcn/ui components (added via CLI)
└── pages/
    ├── Dashboard.tsx
    ├── Login.tsx
    ├── AuthCallback.tsx
    └── NotFound.tsx
```

## Convenciones

### Temas
- 3 temas: `dark`, `light`, `dusk` (azulado oscuro)
- CSS variables en `index.css` con pattern `hsl(var(--color))`
- Colores semánticos: `success`, `warning`, `info` además de shadcn defaults
- Sidebar tiene sus propias variables `--sidebar-*`

### Auth Pattern
- `useCurrentUser()` obtiene rol desde backend (`GET /users/me`)
- NO leer roles de JWT claims (anti-patrón)
- `SKIP_AUTH` mode para desarrollo sin Auth0
- `MockAuth0Provider` simula Auth0 context en skip mode

### Componentes shadcn/ui
- Instalados via `npx shadcn@latest add <component>`
- Configurados en `components.json` con alias `@/components/ui`
- No modificar los componentes ui/ directamente

### Vite Config
- Puerto definido en `vite.config.ts`
- Alias `@/` → `./src/`
- SWC para Fast Refresh

### Scripts en package.json
```json
{
  "dev": "vite",
  "build": "vite build",
  "lint": "eslint .",
  "test": "vitest run"
}
```

---

*Estándar INCBA — React + Vite + shadcn/ui + Auth0.*
