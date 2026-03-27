# Skill: Generación de ERASER-DSL.md (Diagramas)

> **Propósito:** Guía para que Claude/Copilot genere código DSL para crear diagramas de arquitectura y flujo en [eraser.io](https://eraser.io).

---

## Instrucciones para el Agente

Cuando el usuario solicite crear diagramas:

1. **Leer SRS.md y PLAN.md** para entender la arquitectura
2. **Generar ERASER-DSL.md** con código DSL copiable
3. **El usuario copia manualmente** a eraser.io y exporta PNG

> **Nota:** Eraser.io no tiene API pública en el plan gratuito. El workflow es: generar DSL → copiar → exportar PNG.

---

## Plantilla ERASER-DSL.md

```markdown
# {{PROYECTO}} — Diagramas Eraser.io

> Código DSL para generar diagramas en [eraser.io](https://app.eraser.io).  
> Copiar cada bloque a un nuevo diagrama y exportar como PNG.

---

## 📐 Diagrama de Arquitectura

**Instrucciones:**
1. Ir a [eraser.io](https://app.eraser.io)
2. Crear nuevo diagrama → "Diagram from Code"
3. Copiar el código de abajo
4. Exportar como PNG a `{{PROYECTO}}-more/diagrams/`

### Código DSL

```eraser
// {{PROYECTO}} - Arquitectura del Sistema

// === Grupos ===
Frontend [icon: monitor] {
  React App [icon: react]
  Auth0 SPA [icon: lock]
}

Backend [icon: server] {
  API Gateway [icon: api]
  Auth Module [icon: key]
  Business Logic [icon: cpu]
}

Database [icon: database] {
  MongoDB Atlas [icon: mongodb]
}

External [icon: cloud] {
  Auth0 [icon: auth0]
}

// === Conexiones ===
React App --> API Gateway: HTTPS/REST
Auth0 SPA --> Auth0: OAuth 2.0
API Gateway --> Auth Module: JWT Validate
Auth Module --> Auth0: Verify Token
Auth Module --> Business Logic: Authorized Request
Business Logic --> MongoDB Atlas: CRUD
```

### Variante: Diagrama Cloud (AWS)

```eraser
// {{PROYECTO}} - Arquitectura AWS

// === AWS Cloud ===
AWS Cloud [icon: aws] {
  
  // Frontend
  Amplify [icon: aws-amplify] {
    React Build [icon: react]
    CloudFront [icon: aws-cloudfront]
  }
  
  // Backend  
  Elastic Beanstalk [icon: aws-elastic-beanstalk] {
    EC2 Instance [icon: aws-ec2]
    Node.js App [icon: nodejs]
  }
  
  // Security
  IAM [icon: aws-iam]
  Secrets Manager [icon: aws-secrets-manager]
}

// === Externos ===
MongoDB Atlas [icon: mongodb]
Auth0 [icon: auth0]
Users [icon: users]

// === Conexiones ===
Users --> CloudFront: HTTPS
CloudFront --> React Build
React Build --> Node.js App: API Calls
Node.js App --> MongoDB Atlas: Connection String
Node.js App --> Auth0: JWT Validation
IAM --> Elastic Beanstalk: Permissions
Secrets Manager --> Node.js App: Env Vars
```

---

## 🔄 Diagrama de Flujo — Login

### Código DSL

```eraser
// {{PROYECTO}} - Flujo de Autenticación

// === Nodos ===
start [shape: oval]: Inicio
user_action [shape: diamond]: Usuario en App
login_page [shape: rect]: Página de Login
auth0_redirect [shape: rect]: Redirect a Auth0
auth0_login [shape: rect]: Auth0 Login Form
callback [shape: rect]: Callback Handler
validate_token [shape: diamond]: Token válido?
dashboard [shape: rect]: Dashboard Principal
error_page [shape: rect]: Error de Auth
end_success [shape: oval]: Sesión Activa
end_error [shape: oval]: Acceso Denegado

// === Flujo ===
start --> user_action
user_action --> login_page: No autenticado
user_action --> dashboard: Ya autenticado
login_page --> auth0_redirect: Click Login
auth0_redirect --> auth0_login
auth0_login --> callback: Login exitoso
callback --> validate_token
validate_token --> dashboard: Sí
validate_token --> error_page: No
dashboard --> end_success
error_page --> end_error
```

---

## 🔄 Diagrama de Flujo — {{PROCESO_PRINCIPAL}}

### Código DSL

```eraser
// {{PROYECTO}} - Flujo de {{PROCESO_PRINCIPAL}}

// === Nodos ===
start [shape: oval]: Inicio
{{#each NODOS}}
{{id}} [shape: {{shape}}]: {{label}}
{{/each}}
end [shape: oval]: Fin

// === Flujo ===
start --> {{PRIMER_NODO}}
{{#each CONEXIONES}}
{{from}} --> {{to}}: {{label}}
{{/each}}
{{ULTIMO_NODO}} --> end
```

---

## 📊 Diagrama de Base de Datos (ER)

### Código DSL

```eraser
// {{PROYECTO}} - Modelo de Datos

// === Entidades ===
users [icon: user] {
  _id: ObjectId [pk]
  auth0Id: String [unique]
  email: String
  name: String
  role: String
  createdAt: Date
}

{{ENTIDAD_PRINCIPAL}} [icon: file] {
  _id: ObjectId [pk]
  {{#each CAMPOS}}
  {{nombre}}: {{tipo}}{{#if pk}} [pk]{{/if}}{{#if fk}} [fk]{{/if}}
  {{/each}}
}

{{ENTIDAD_SECUNDARIA}} [icon: folder] {
  _id: ObjectId [pk]
  {{#each CAMPOS}}
  {{nombre}}: {{tipo}}
  {{/each}}
}

// === Relaciones ===
users 1--* {{ENTIDAD_PRINCIPAL}}: crea
{{ENTIDAD_PRINCIPAL}} *--1 {{ENTIDAD_SECUNDARIA}}: pertenece a
```

---

## 🔧 Diagrama de Secuencia — API Call

### Código DSL

```eraser
// {{PROYECTO}} - Secuencia de API Call

// === Actores ===
Frontend [icon: monitor]
API [icon: server]
Auth0 [icon: lock]
Database [icon: database]

// === Secuencia ===
Frontend -> API: POST /api/{{RECURSO}}
API -> Auth0: Validate JWT
Auth0 -> API: Token Valid
API -> Database: Insert document
Database -> API: Document created
API -> Frontend: 201 Created + data
```

---

## 📝 Instrucciones de Uso

### Cómo crear un diagrama

1. **Abrir Eraser.io** — [app.eraser.io](https://app.eraser.io)
2. **Crear nuevo** — Click "New" → "Diagram"
3. **Escribir código** — Seleccionar "Code" mode y pegar DSL
4. **Ajustar** — Mover elementos si es necesario
5. **Exportar** — Export → PNG → Guardar en `{{PROYECTO}}-more/diagrams/`

### Tips para mejor resultado

- Usar **iconos** reconocidos: `aws`, `react`, `mongodb`, `nodejs`, `docker`
- Mantener **nombres cortos** para los nodos
- Agrupar con **llaves {}** elementos relacionados
- Usar **colores** con `[color: blue]` para destacar

### Referencia de formas

| Shape | Uso |
|-------|-----|
| `rect` | Proceso, acción |
| `diamond` | Decisión |
| `oval` | Inicio/Fin |
| `cylinder` | Base de datos |
| `parallelogram` | Input/Output |

### Referencia de iconos comunes

```
aws, react, nodejs, mongodb, postgresql, docker, kubernetes,
github, gitlab, slack, auth0, firebase, redis, elasticsearch,
user, users, server, database, api, lock, key, cloud, globe
```

---

## 📁 Organización de Archivos

Guardar los PNGs exportados en:

```
{{PROYECTO}}-more/
├── diagrams/
│   ├── arquitectura.png
│   ├── arquitectura-aws.png
│   ├── flujo-login.png
│   ├── flujo-{{proceso}}.png
│   ├── database-er.png
│   └── secuencia-api.png
├── ERASER-DSL.md  ← Este archivo
└── ...
```

---

*Diagramas DSL para Eraser.io — Replicant-2049 — INCBA*
```

---

## Variables a Reemplazar

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{PROYECTO}}` | Nombre del proyecto | TC, APP-PAGOS |
| `{{PROCESO_PRINCIPAL}}` | Flujo principal | Cambio de Divisa, Registro de Pago |
| `{{ENTIDAD_PRINCIPAL}}` | Entidad principal | operations, payments |
| `{{ENTIDAD_SECUNDARIA}}` | Entidad relacionada | clients, suppliers |
| `{{RECURSO}}` | Endpoint principal | operations, payments |
| `{{NODOS}}` | Lista de nodos del flujo | Array de {id, shape, label} |
| `{{CONEXIONES}}` | Lista de conexiones | Array de {from, to, label} |

---

## Checklist de Calidad

Antes de marcar como completo:

- [ ] Diagrama de arquitectura general
- [ ] Diagrama de arquitectura cloud (si aplica)
- [ ] Al menos un flujo del proceso principal
- [ ] Diagrama ER de base de datos
- [ ] Instrucciones de uso incluidas

---

*Skill para Replicant-2049 — INCBA*
