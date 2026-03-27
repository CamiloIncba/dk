# 📋 Guía Rápida de Referencia - Kiosko Autoservicio

> **Tarjeta de referencia rápida para el equipo de IT**

---

## 🚀 Inicio Rápido

```powershell
# Iniciar en modo producción
cd D:\kiosko-autoservicio\scripts
.\start-prod.bat

# O manualmente
cd D:\kiosko-autoservicio\backend
npm run start:prod
```

---

## 🔗 URLs Importantes

| Recurso | URL |
|---------|-----|
| **Backend API** | http://localhost:3010/api |
| **Kiosko (clientes)** | http://localhost:5173 |
| **Cajero (pagos)** | http://localhost:5174 |
| **Cocina** | http://localhost:5175 |
| **Prisma Studio** | http://localhost:5555 |
| **Panel MP** | https://developers.mercadopago.com/panel/app |
| **Cloudflare** | https://dash.cloudflare.com |

---

## 📁 Ubicación de Archivos

```
D:\kiosko-autoservicio\
├── backend\
│   ├── .env              ← Variables de entorno
│   ├── dev.db            ← Base de datos SQLite
│   └── dist\             ← Código compilado
├── scripts\
│   ├── install.bat       ← Instalador principal
│   ├── start-prod.bat    ← Iniciar producción
│   └── start-dev.bat     ← Iniciar desarrollo
├── docs\
│   └── INSTALACION.md    ← Documentación completa
└── cashier-pwa\          ← Frontend cajero
```

---

## ⚙️ Variables de Entorno Críticas

Archivo: `backend\.env`

```env
MP_ACCESS_TOKEN=APP_USR-xxxxxxxx...    # Token de Mercado Pago
MP_POINT_DEVICE_ID=NEWLAND_N950__...   # ID del Point Smart
DATABASE_URL="file:./dev.db"            # Base de datos
PORT=3010                               # Puerto del backend
```

---

## 🔧 Comandos de Diagnóstico

```powershell
# Ver dispositivos Point vinculados
curl http://localhost:3010/api/payments/mp/point/devices

# Ver estado del Point
curl http://localhost:3010/api/payments/mp/point/status/DEVICE_ID

# Probar webhook
curl -X POST http://localhost:3010/api/payments/mp/webhook -H "Content-Type: application/json" -d '{}'

# Ver túnel de Cloudflare
cloudflared tunnel info kiosko-autoservicio

# Reiniciar túnel
Restart-Service Cloudflared
```

---

## 🚨 Solución de Problemas Rápida

| Problema | Solución |
|----------|----------|
| Point no recibe pago | Verificar modo PDV en la terminal |
| Error 405 en polling | Normal - usar webhooks |
| Webhook no llega | Verificar URL en panel de MP |
| Túnel caído | `Restart-Service Cloudflared` |
| BD corrupta | `npx prisma db push --force-reset` |
| Dependencias rotas | `npm install` |

---

## 📞 Escalamiento

1. **Mercado Pago**: https://developers.mercadopago.com/support
2. **Cloudflare**: https://dash.cloudflare.com → Support
3. **Logs del sistema**: Ver consola del backend

---

## 🔄 Actualizaciones

```powershell
git pull
cd backend
npm install
npx prisma migrate deploy
npm run build
# Reiniciar servicio
```
