# Skill: Generación de SRS (Especificación de Requisitos de Software)

> **Propósito:** Guía para que Claude/Copilot genere un documento SRS formal basado en IEEE 830, adaptado para proyectos INCBA.

---

## Instrucciones para el Agente

Cuando el usuario solicite crear un SRS, sigue estos pasos:

1. **Recopilar contexto** del proyecto:
   - Documentos existentes (especificaciones, notas, HU)
   - Código fuente si existe
   - Conversaciones previas

2. **Generar SRS.md** usando la plantilla de abajo

3. **Marcar como borrador** hasta aprobación de jefatura

4. **Una vez aprobado, el documento NO debe modificarse**

---

## Plantilla SRS.md

```markdown
# SRS {{PROYECTO}} v1.0

> **Identificador del documento:** SRS-{{PROYECTO_ID}}-{{AÑO}}  
> **Versión:** 1.0  
> **Fecha:** {{MES}} {{AÑO}}  
> **Cliente:** {{CLIENTE}}  
> **Elaborado por:** {{AUTOR}}  
> **Revisado por:** {{REVISOR}}  
> **Estado:** 🔄 Borrador (pendiente aprobación)

---

## Índice

1. [Introducción](#1-introducción)
2. [Descripción General](#2-descripción-general)
3. [Historias de Usuario](#3-historias-de-usuario)
4. [Requerimientos Funcionales](#4-requerimientos-funcionales)
5. [Requerimientos No Funcionales](#5-requerimientos-no-funcionales)
6. [Modelo de Datos](#6-modelo-de-datos)
7. [Restricciones y Supuestos](#7-restricciones-y-supuestos)
8. [Apéndices](#8-apéndices)

---

## 1. Introducción

### 1.1 Propósito

{{Describir qué problema resuelve el sistema y para quién. 1-2 párrafos.}}

### 1.2 Alcance

{{Qué incluye y qué NO incluye el sistema. Lista de funcionalidades principales.}}

### 1.3 Definiciones y Acrónimos

| Término | Definición |
|---------|-----------|
| {{TERMINO}} | {{DEFINICION}} |

### 1.4 Referencias

- {{Documentos fuente, planillas existentes, chats, etc.}}

### 1.5 Contexto del Negocio

{{Descripción de la empresa, usuarios, volumen operativo, horarios, problemas actuales.}}

---

## 2. Descripción General

### 2.1 Perspectiva del Producto

{{Sistema independiente o integrado? Reemplaza algo existente?}}

### 2.2 Funcionalidades del Producto

1. {{Funcionalidad principal 1}}
2. {{Funcionalidad principal 2}}
3. ...

### 2.3 Clases de Usuarios

| Actor | Cantidad | Descripción | Acceso |
|-------|----------|-------------|--------|
| **Administrador** | {{N}} | {{Descripción}} | Total |
| **Operador** | {{N}} | {{Descripción}} | Lectura + Escritura |
| **Lector** | {{N}} | {{Descripción}} | Solo lectura |

### 2.4 Entorno de Operación

| Componente | Tecnología |
|------------|------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express/NestJS, TypeScript |
| Base de datos | MongoDB Atlas |
| Autenticación | Auth0 (OAuth 2.0 + JWT) |
| Hosting | AWS (Amplify + Elastic Beanstalk) |

### 2.5 Alcance — Incluido (MVP)

1. {{Feature incluida en MVP}}
2. ...

### 2.6 Alcance — Excluido (segunda etapa)

- {{Feature excluida}}
- ...

---

## 3. Historias de Usuario

### Épica 1: {{Nombre de la épica}}

**HU-01: {{Título}}**
> Como **{{rol}}**, quiero {{acción}} para {{beneficio}}.

**Criterios de aceptación:**
- {{Criterio 1}}
- {{Criterio 2}}

---

## 4. Requerimientos Funcionales

| RF | Descripción | Prioridad | HU Relacionada |
|----|-------------|-----------|----------------|
| RF-01 | {{Descripción del requerimiento}} | Alta | HU-01 |
| RF-02 | {{Descripción}} | Media | HU-02 |

---

## 5. Requerimientos No Funcionales

### 5.1 Rendimiento

| RNF | Descripción | Métrica |
|-----|-------------|---------|
| RNF-01 | Tiempo de respuesta de API | < 500ms p95 |
| RNF-02 | Tiempo de carga inicial | < 3s en 3G |

### 5.2 Seguridad

| RNF | Descripción |
|-----|-------------|
| RNF-03 | Autenticación OAuth 2.0 vía Auth0 |
| RNF-04 | HTTPS obligatorio |
| RNF-05 | Tokens JWT con expiración de 24h |

### 5.3 Usabilidad

| RNF | Descripción |
|-----|-------------|
| RNF-06 | Responsive: desktop, tablet, mobile |
| RNF-07 | Soporte modo claro/oscuro |
| RNF-08 | Accesibilidad WCAG 2.1 AA |

### 5.4 Disponibilidad

| RNF | Descripción |
|-----|-------------|
| RNF-09 | Uptime 99.5% |
| RNF-10 | Backups diarios automáticos |

---

## 6. Modelo de Datos

### 6.1 Entidades Principales

```typescript
// {{Entidad principal}}
interface {{Entidad}} {
  id: string;
  // ... campos
  createdAt: Date;
  updatedAt: Date;
}
```

### 6.2 Diagrama ER

{{Referencia al diagrama en SS/ o descripción textual}}

---

## 7. Restricciones y Supuestos

### 7.1 Restricciones

- {{Restricción técnica o de negocio}}

### 7.2 Supuestos

- {{Supuesto que se asume como verdadero}}

### 7.3 Dependencias

- {{Dependencia externa (APIs, servicios, etc.)}}

---

## 8. Apéndices

### Apéndice A: Glosario extendido

{{Términos adicionales}}

### Apéndice B: Decisiones de diseño

| Fecha | Decisión | Razón |
|-------|----------|-------|
| {{Fecha}} | {{Decisión}} | {{Razón}} |

### Apéndice C: Historial de cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | {{Fecha}} | {{Autor}} | Versión inicial |
```

---

## Variables a Reemplazar

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{PROYECTO}}` | Nombre corto del proyecto | TC, Pagos Pendientes |
| `{{PROYECTO_ID}}` | ID para documentos | TC-NORPAN, PAGOS-NORPAN |
| `{{AÑO}}` | Año actual | 2026 |
| `{{MES}}` | Mes actual | Febrero |
| `{{CLIENTE}}` | Nombre del cliente | NOR-PAN S.R.L. |
| `{{AUTOR}}` | Quien elabora | Camilo Acencio |
| `{{REVISOR}}` | Quien revisa | Felipe Rebolledo |

---

## Ejemplo de Uso

**Input del usuario:**
> "Crea el SRS para una app de aprobaciones. El cliente es NOR-PAN, necesitan gestionar solicitudes de compra que pasan por varios niveles de aprobación."

**Output esperado:**
- Archivo `SRS.md` con la plantilla completa
- RFs extraídos de la descripción
- HUs inferidas del contexto
- Estado: Borrador

---

## Checklist de Calidad

Antes de marcar como completo, verificar:

- [ ] Todos los `{{variables}}` fueron reemplazados
- [ ] Al menos 10 RFs definidos
- [ ] Al menos 5 HUs definidas
- [ ] Modelo de datos incluye entidades principales
- [ ] Alcance incluido/excluido está claro
- [ ] No hay secciones vacías

---

*Skill para Replicant-2049 — INCBA*
