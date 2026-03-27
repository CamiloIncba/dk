# Skill: Generación de LOVABLE-PROMPT.md

> **Propósito:** Guía para que Claude/Copilot genere prompts optimizados para crear mockups en lovable.dev

---

## Instrucciones para el Agente

Cuando el usuario solicite crear un prompt para Lovable:

1. **Leer el SRS.md** del proyecto para entender HUs y RFs
2. **Generar LOVABLE-PROMPT.md** con secciones iterativas
3. **El usuario copiará manualmente** cada sección a lovable.dev

---

## Plantilla LOVABLE-PROMPT.md

```markdown
# {{PROYECTO}} — Lovable.dev Prompts

> Prompts optimizados para generar mockups en [lovable.dev](https://lovable.dev).  
> Copiar cada sección por separado para mejor resultado.

---

## 🎨 Tech Stack Requerido

Antes de empezar, asegurar que Lovable use:

- React 18 + TypeScript + Vite
- TailwindCSS
- shadcn/ui (importar componentes necesarios)
- Lucide React para iconos
- TanStack Query para data fetching

---

## Prompt 1: Setup Inicial

```text
Crear una aplicación React + Vite + TypeScript para {{DESCRIPCION_CORTA}}.

Stack:
- TailwindCSS para estilos
- shadcn/ui para componentes
- Lucide React para iconos

Página inicial: Login con Auth0 (solo UI, sin integración real).
Después del login, dashboard vacío con sidebar de navegación.

Tema: {{TEMA}} (claro/oscuro con toggle).
Colores principales: {{COLOR_PRIMARIO}}, {{COLOR_SECUNDARIO}}.
```

---

## Prompt 2: Layout Principal

```text
Crear el layout principal con:

1. **Header:**
   - Logo a la izquierda: "{{PROYECTO}}"
   - Centro: Breadcrumb con ruta actual
   - Derecha: Notificaciones (campana con badge), Avatar de usuario con dropdown

2. **Sidebar:**
   - Colapsable
   - Secciones:
     {{#each MENU_ITEMS}}
     - {{icon}} {{label}}
     {{/each}}
   - Footer: Versión de la app y copyright

3. **Main content area:**
   - Padding consistente
   - Scroll independiente del sidebar
   - Soporte para dark mode

Usar componentes de shadcn/ui existentes.
```

---

## Prompt 3: {{MODULO_1}} — Vista Principal

```text
Crear la vista de {{MODULO_1}}:

**Componentes:**

1. **FilterBar** (arriba):
   - Input de búsqueda con icono
   - Filtro por: {{FILTROS}}
   - Botón "Nuevo" alineado a la derecha

2. **Cards/Table:**
   - Vista toggle: Cards / Tabla
   - Datos a mostrar: {{CAMPOS}}
   - Estado visual con badges de colores
   - Acciones: Ver, Editar, Eliminar (con confirm dialog)

3. **Paginación** (abajo):
   - Mostrar X de Y resultados
   - Botones prev/next

Mock data: Generar 5-10 items de ejemplo.
```

---

## Prompt 4: {{MODULO_1}} — Formulario

```text
Crear modal/dialog para crear/editar {{MODULO_1}}:

**Campos:**
{{#each CAMPOS_FORM}}
- {{label}}: {{tipo}} {{#if required}}(requerido){{/if}}
{{/each}}

**Validaciones:**
- Campos requeridos con asterisco
- Mensajes de error inline
- Botón submit deshabilitado si hay errores

**Acciones:**
- Cancelar (cierra sin guardar)
- Guardar (muestra toast de éxito)

Usar Form de shadcn/ui con react-hook-form.
```

---

## Prompt 5: {{MODULO_2}} — Vista Principal

```text
{{Repetir estructura del Prompt 3 para el siguiente módulo}}
```

---

## Prompt 6: Dashboard

```text
Crear dashboard con:

1. **Summary Cards** (row de 4):
   {{#each SUMMARY_CARDS}}
   - {{titulo}}: número grande + icono + variación %
   {{/each}}

2. **Gráfico principal:**
   - Tipo: {{TIPO_GRAFICO}}
   - Datos: {{DESCRIPCION_DATOS}}
   - Usar Recharts

3. **Tabla de actividad reciente:**
   - Últimas 5 acciones
   - Columnas: Acción, Usuario, Fecha, Estado

4. **Accesos rápidos:**
   - 3-4 botones con las acciones más comunes
```

---

## Prompt 7: Configuración / Perfil

```text
Crear página de configuración con tabs:

**Tab 1 - Perfil:**
- Avatar editable
- Nombre, email (readonly)
- Cambiar contraseña (link a Auth0)

**Tab 2 - Preferencias:**
- Tema claro/oscuro toggle
- Idioma selector
- Notificaciones on/off

**Tab 3 - {{TAB_ADMIN}}** (solo admin):
- Gestión de usuarios
- Roles y permisos
```

---

## Prompt 8: Responsive + PWA

```text
Ajustar la aplicación para responsive:

**Mobile (< 768px):**
- Sidebar se convierte en drawer
- Cards en columna única
- Header simplificado
- Bottom navigation bar

**Tablet (768px - 1024px):**
- Sidebar colapsada por defecto
- Cards en grid de 2

Agregar manifest.json para PWA con:
- Nombre: "{{PROYECTO}}"
- Iconos: Generar placeholder
- Theme color: "{{COLOR_PRIMARIO}}"
```

---

## Prompt 9: Estados Vacíos y Errores

```text
Crear componentes para estados especiales:

1. **Empty State:**
   - Ilustración SVG sutil
   - Mensaje: "No hay {{ITEMS}} registrados"
   - CTA: "Crear el primero"

2. **Error State:**
   - Icono de alerta
   - Mensaje de error
   - Botón "Reintentar"

3. **Loading State:**
   - Skeleton loaders para cards/tabla
   - Spinner para acciones

4. **Not Found (404):**
   - Mensaje amigable
   - Botón "Volver al inicio"
```

---

## 📝 Notas para el Usuario

### Tips para mejores resultados en Lovable

1. **Un prompt a la vez** — No enviar todo junto
2. **Ser específico con colores** — Usar hex codes
3. **Referenciar componentes shadcn** — "Usar el Button de shadcn"
4. **Iterar** — Si algo no queda bien, pedir ajustes
5. **Exportar código** — Revisar y limpiar antes de integrar

### Después de generar en Lovable

- [ ] Exportar código
- [ ] Revisar y eliminar código innecesario
- [ ] Integrar con backend real
- [ ] Reemplazar mock data con TanStack Query

---

*Prompts para Lovable.dev — Replicant-2049 — INCBA*
```

---

## Variables a Reemplazar

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{PROYECTO}}` | Nombre del proyecto | TC, APP-PAGOS |
| `{{DESCRIPCION_CORTA}}` | Una línea del sistema | Gestión de cambio de divisas |
| `{{TEMA}}` | Tema visual | dark con accent azul |
| `{{COLOR_PRIMARIO}}` | Color principal | #3B82F6 |
| `{{COLOR_SECUNDARIO}}` | Color secundario | #10B981 |
| `{{MENU_ITEMS}}` | Items del sidebar | Lista con icon + label |
| `{{MODULO_1}}` | Primer módulo | Operaciones |
| `{{FILTROS}}` | Filtros disponibles | estado, fecha, tipo |
| `{{CAMPOS}}` | Campos a mostrar | id, cliente, monto |
| `{{CAMPOS_FORM}}` | Campos del formulario | Lista con tipo y required |
| `{{SUMMARY_CARDS}}` | Cards del dashboard | Lista con títulos |
| `{{TIPO_GRAFICO}}` | Tipo de chart | Line chart, Bar chart |

---

## Checklist de Calidad

Antes de marcar como completo:

- [ ] Prompts cubren todos los módulos del SRS
- [ ] Tech stack especificado claramente
- [ ] Cada prompt es independiente y copiable
- [ ] Colores y tema definidos
- [ ] Responsive considerado

---

*Skill para Replicant-2049 — INCBA*
