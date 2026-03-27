# 🏪 Kiosko Autoservicio - Documentación de Instalación y Configuración

> **Guía completa para el equipo de IT**  
> Sistema de autoservicio con integración de Mercado Pago Point Smart

---

## 📋 Índice

1. [Descripción del Sistema](#-descripción-del-sistema)
2. [Arquitectura](#-arquitectura)
3. [Requisitos](#-requisitos)
4. [Instalación Rápida](#-instalación-rápida)
5. [Instalación Paso a Paso](#-instalación-paso-a-paso)
6. [Configuración de Mercado Pago](#-configuración-de-mercado-pago)
7. [Configuración de Webhooks (Cloudflare Tunnel)](#-configuración-de-webhooks-cloudflare-tunnel)
8. [Variables de Entorno](#-variables-de-entorno)
9. [Ejecución del Sistema](#-ejecución-del-sistema)
10. [Troubleshooting](#-troubleshooting)
11. [Mantenimiento](#-mantenimiento)

---

## 📖 Descripción del Sistema

**Kiosko Autoservicio** es un sistema de punto de venta (POS) que permite a los clientes:

1. **Hacer pedidos** en un kiosko táctil (tablet/PC)
2. **Pagar con tarjeta** usando terminal Point Smart de Mercado Pago
3. **Pagar con QR** escaneando código desde la app de Mercado Pago
4. **Ver el estado** del pedido en pantalla de cocina

### Componentes del Sistema

| Componente | Descripción | Puerto |
|------------|-------------|--------|
| **Backend (NestJS)** | API REST + Base de datos | 3010 |
| **Kiosko PWA** | Interfaz para clientes (pedidos) | 5173 |
| **Cashier PWA** | Interfaz para cajero (pagos) | 5174 |
| **Kitchen PWA** | Pantalla de cocina | 5175 |
| **Android App** | Versiones móviles de las PWAs | - |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │   Mercado Pago   │    │   Cloudflare Tunnel (opcional)   │   │
│  │   - API          │    │   - Expone backend a internet    │   │
│  │   - Webhooks     │───▶│   - Recibe webhooks de MP        │   │
│  │   - Point Smart  │    └──────────────────────────────────┘   │
│  └──────────────────┘                    │                       │
└──────────────────────────────────────────│───────────────────────┘
                                           │
┌──────────────────────────────────────────▼───────────────────────┐
│                      RED LOCAL                                    │
│                                                                   │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │                   SERVIDOR PRINCIPAL                        │ │
│   │  ┌─────────────────────────────────────────────────────┐   │ │
│   │  │                 Backend NestJS                       │   │ │
│   │  │  - API REST (puerto 3010)                           │   │ │
│   │  │  - Base de datos SQLite                             │   │ │
│   │  │  - Integración Mercado Pago                         │   │ │
│   │  │  - Webhooks                                         │   │ │
│   │  └─────────────────────────────────────────────────────┘   │ │
│   │                                                             │ │
│   │  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │ │
│   │  │  Kiosko PWA     │ │  Cashier PWA    │ │ Kitchen PWA  │  │ │
│   │  │  (5173)         │ │  (5174)         │ │ (5175)       │  │ │
│   │  └─────────────────┘ └─────────────────┘ └──────────────┘  │ │
│   └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│   │   Kiosko    │    │   Cajero    │    │  Pantalla Cocina    │  │
│   │   (Tablet)  │    │   (PC/Tab)  │    │  (Monitor/Tablet)   │  │
│   └─────────────┘    └──────┬──────┘    └─────────────────────┘  │
│                             │                                     │
│                    ┌────────▼────────┐                           │
│                    │  Point Smart    │                           │
│                    │  (Terminal)     │                           │
│                    └─────────────────┘                           │
└───────────────────────────────────────────────────────────────────┘
```

---

## 📋 Requisitos

### Hardware Mínimo (Servidor)
- **CPU**: Intel i3 / AMD Ryzen 3 o superior
- **RAM**: 4 GB mínimo (8 GB recomendado)
- **Almacenamiento**: 10 GB disponibles
- **Red**: Conexión a internet (para pagos)

### Software
- **Sistema Operativo**: Windows 10/11 (64-bit)
- **Node.js**: v18 o superior (v20 LTS recomendado)
- **Navegador**: Chrome/Edge (para PWAs)

### Mercado Pago
- **Cuenta de vendedor** verificada
- **Terminal Point Smart** (Smart 1 o Smart 2)
- **Credenciales de producción** (Access Token)

---

## ⚡ Instalación Rápida

Para instalar todo automáticamente:

```powershell
# 1. Clonar o copiar el proyecto
cd D:\PROYECTOS
git clone <url-del-repositorio> kiosko-autoservicio

# 2. Ejecutar instalador
cd kiosko-autoservicio\scripts
.\install.bat
```

El instalador:
- ✅ Verifica/instala Node.js
- ✅ Instala dependencias
- ✅ Configura base de datos
- ✅ Crea archivo .env
- ✅ Compila el proyecto

---

## 📝 Instalación Paso a Paso

### 1. Instalar Node.js

Descargar desde: https://nodejs.org/

```powershell
# Verificar instalación
node --version   # Debería mostrar v18.x o superior
npm --version    # Debería mostrar 9.x o superior
```

### 2. Clonar el Proyecto

```powershell
cd D:\PROYECTOS
git clone <url-del-repositorio> kiosko-autoservicio
cd kiosko-autoservicio
```

### 3. Instalar Dependencias del Backend

```powershell
cd backend
npm install
```

### 4. Configurar Variables de Entorno

Crear archivo `backend/.env`:

```env
# Base de datos
DATABASE_URL="file:./dev.db"

# Puerto del servidor
PORT=3010

# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-xxxxxxxx-xxxxx-xxxxx-xxxxx-xxxxxxxxxxxx

# ID del Point Smart (obtener con la API)
MP_POINT_DEVICE_ID=NEWLAND_N950__N950NCC804XXXXXX
```

### 5. Inicializar Base de Datos

```powershell
# Generar cliente Prisma
npx prisma generate

# Aplicar migraciones
npx prisma migrate deploy

# (Opcional) Ver la base de datos
npx prisma studio
```

### 6. Compilar y Ejecutar

```powershell
# Modo desarrollo (con hot-reload)
npm run start:dev

# Modo producción
npm run build
npm run start:prod
```

---

## 💳 Configuración de Mercado Pago

### 1. Crear Aplicación

1. Ir a https://developers.mercadopago.com/panel/app
2. Click en "Crear aplicación"
3. Nombre: "Kiosko Autoservicio"
4. Seleccionar: "Pagos en línea" + "Point integrado"
5. Guardar

### 2. Obtener Credenciales

1. En la aplicación creada, ir a "Credenciales"
2. Seleccionar "Credenciales de producción"
3. Copiar el **Access Token**
4. Guardar en `backend/.env` como `MP_ACCESS_TOKEN`

### 3. Vincular Point Smart

El Point Smart debe estar:
1. Encendido y conectado a WiFi
2. Logueado con la misma cuenta de MP
3. En modo **PDV** (no Standalone)

Para obtener el ID del dispositivo:

```powershell
# Desde PowerShell
$token = "APP_USR-xxxxxxxx..."
Invoke-RestMethod -Uri "https://api.mercadopago.com/point/integration-api/devices" `
  -Headers @{ Authorization = "Bearer $token" }
```

O usar el endpoint de la API:
```
GET http://localhost:3010/api/payments/mp/point/devices
```

### 4. Configurar Modo PDV

En la terminal Point Smart:
1. Ir a Configuración
2. Modo de operación: **PDV**
3. Esto permite recibir pagos desde la API

---

## 🔗 Configuración de Webhooks (Cloudflare Tunnel)

Para que Mercado Pago notifique automáticamente sobre pagos, necesitas exponer tu backend a internet.

### Opción 1: Cloudflare Tunnel (Recomendado - Gratis)

```powershell
# Ejecutar instalador
cd scripts
.\install-cloudflare-tunnel.ps1
```

El script:
1. Descarga e instala `cloudflared`
2. Te autentica con Cloudflare
3. Crea un túnel
4. Configura DNS automáticamente
5. Lo instala como servicio de Windows

**Requisitos:**
- Cuenta de Cloudflare (gratis)
- Un dominio registrado en Cloudflare (o usar el gratuito de CF)

### Opción 2: ngrok (Para desarrollo/testing)

```powershell
# Instalar ngrok
winget install ngrok

# Autenticar
ngrok authtoken <tu-token>

# Crear túnel
ngrok http 3010
```

### Configurar Webhook en Mercado Pago

1. Ir a https://developers.mercadopago.com/panel/app
2. Seleccionar tu aplicación
3. Ir a "Webhooks"
4. Configurar:

| Campo | Valor |
|-------|-------|
| URL Producción | `https://tu-subdominio.tu-dominio.com/api/payments/mp/webhook` |
| Eventos | ✅ Pagos (payment) |
| | ✅ Integraciones Point (point_integration_wh) |

---

## 🔧 Variables de Entorno

### Archivo `backend/.env`

```env
# =============================================================================
# BASE DE DATOS
# =============================================================================
# SQLite (por defecto)
DATABASE_URL="file:./dev.db"

# PostgreSQL (opcional, para producción)
# DATABASE_URL="postgresql://user:pass@localhost:5432/kiosko?schema=public"

# =============================================================================
# SERVIDOR
# =============================================================================
PORT=3010

# =============================================================================
# MERCADO PAGO
# =============================================================================

# Access Token de producción
MP_ACCESS_TOKEN=APP_USR-xxxxxxxx-xxxxx-xxxxx-xxxxx-xxxxxxxxxxxx

# ID del dispositivo Point Smart
MP_POINT_DEVICE_ID=NEWLAND_N950__N950NCC804XXXXXX

# =============================================================================
# WEBHOOKS (después de configurar Cloudflare Tunnel)
# =============================================================================

# URL pública del backend
WEBHOOK_URL=https://api.tudominio.com

# =============================================================================
# OPCIONALES
# =============================================================================

# Tiempo de expiración de QR (ms) - default: 5 minutos
QR_EXPIRATION_MS=300000

# Tiempo de espera para Point (segundos) - default: 60s
POINT_TIMEOUT_SECONDS=60
```

---

## 🚀 Ejecución del Sistema

### Scripts de Inicio (carpeta `scripts/`)

| Script | Descripción |
|--------|-------------|
| `start-dev.bat` | Inicia backend en modo desarrollo |
| `start-prod.bat` | Inicia backend en modo producción |

### Comandos Manuales

```powershell
# Backend - Desarrollo
cd backend
npm run start:dev

# Backend - Producción
cd backend
npm run build
npm run start:prod

# Frontend Kiosko (en otra terminal)
cd cashier-pwa  # o kiosko-pwa, kitchen-pwa
npm run dev
```

### Acceso a las Aplicaciones

| Aplicación | URL |
|------------|-----|
| Backend API | http://localhost:3010/api |
| Swagger Docs | http://localhost:3010/api/docs (si está habilitado) |
| Kiosko | http://localhost:5173 |
| Cajero | http://localhost:5174 |
| Cocina | http://localhost:5175 |
| Prisma Studio | `npx prisma studio` → http://localhost:5555 |

---

## 🔍 Troubleshooting

### El Point no recibe el pago

1. **Verificar modo de operación:**
   - Debe estar en modo **PDV**, no Standalone
   - Verificar en: Configuración → Modo de operación

2. **Verificar conexión:**
   ```powershell
   # Consultar dispositivos vinculados
   curl http://localhost:3010/api/payments/mp/point/devices
   ```

3. **Verificar estado del dispositivo:**
   ```powershell
   curl http://localhost:3010/api/payments/mp/point/status/DEVICE_ID
   ```

### Error 405 al consultar estado del pago

Esto es **esperado**. La API de MP no permite consultar el estado de payment_intents.
Por eso usamos webhooks para recibir notificaciones.

**Solución:** Configurar webhooks con Cloudflare Tunnel.

### El webhook no llega

1. **Verificar URL en MP:**
   - Debe ser HTTPS
   - Debe ser accesible desde internet
   - Probar con: `curl https://tu-url/api/payments/mp/webhook`

2. **Verificar túnel:**
   ```powershell
   cloudflared tunnel info kiosko-autoservicio
   ```

3. **Ver logs del backend:**
   - Buscar "Webhook Mercado Pago recibido" en la consola

4. **Simular webhook (desde MP):**
   - En el panel de MP, hay botón para simular notificación

### La base de datos no se crea

```powershell
cd backend

# Regenerar cliente Prisma
npx prisma generate

# Forzar sincronización
npx prisma db push --force-reset
```

### Error de permisos en Windows

Ejecutar PowerShell como Administrador:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🔧 Mantenimiento

### Backup de Base de Datos

```powershell
# El archivo SQLite está en backend/dev.db
Copy-Item backend\dev.db backend\backup\dev_$(Get-Date -Format "yyyyMMdd_HHmmss").db
```

### Actualizar el Sistema

```powershell
# Obtener últimos cambios
git pull

# Reinstalar dependencias
cd backend
npm install

# Aplicar nuevas migraciones
npx prisma migrate deploy

# Recompilar
npm run build

# Reiniciar
npm run start:prod
```

### Logs del Sistema

```powershell
# Ver logs de Cloudflare Tunnel
Get-EventLog -LogName Application -Source Cloudflared -Newest 50

# Ver servicio de Windows
Get-Service Cloudflared
```

### Comandos de Prisma Útiles

```powershell
# Ver base de datos visualmente
npx prisma studio

# Ver estado de migraciones
npx prisma migrate status

# Generar migración después de cambios en schema.prisma
npx prisma migrate dev --name descripcion_del_cambio
```

---

## 📞 Soporte

Para problemas con:
- **Mercado Pago**: https://developers.mercadopago.com/support
- **Cloudflare Tunnel**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

---

*Documentación generada automáticamente - Última actualización: $(Get-Date)*
