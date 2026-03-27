## Web Store (Fase 1) — shadcn/ui

Sitio público (marketing + compra) para la Dark Kitchen. **Fase 1 funcional**: landing, menú, producto con extras, checkout por pasos, seguimiento con timeline.

### Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Landing |
| `/menu` | Catálogo por categorías |
| `/producto/:id` | Ficha + extras → agregar al carrito |
| `/checkout` | Carrito → datos → confirmación |
| `/seguimiento` y `/seguimiento/:id` | Estado del pedido |

### Stack
- React + Vite + TypeScript
- Tailwind CSS (v4)
- **shadcn/ui** (estándar visual)

### Requisitos locales
- Node.js + npm en el PATH

### Variables de entorno

- `VITE_API_URL` (opcional) — por defecto `http://localhost:3010`

### Comandos

```bash
# Dev server
npm run dev

# Lint
npm run lint

# Build producción
npm run build
```

### Notas (Tailwind v4)
- `src/index.css` usa `@import "tailwindcss";` + `@config "../tailwind.config.js";` para que Tailwind cargue la config correctamente.

### Ownership
- Agente: **Frontend Web Store**
