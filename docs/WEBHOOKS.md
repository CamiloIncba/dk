# 💳 Configuración de Webhooks de Mercado Pago

> **Guía paso a paso para configurar notificaciones automáticas**

---

## 🎯 ¿Por qué necesitamos webhooks?

Cuando un cliente paga con Point Smart, necesitamos saber automáticamente si:
- ✅ El pago fue **aprobado**
- ❌ El pago fue **rechazado**
- ⏰ El pago **expiró** (timeout)
- 🚪 El cliente **canceló** en la terminal

Sin webhooks, el sistema no sabe qué pasó con el pago a menos que el cajero lo verifique manualmente.

---

## 📝 Paso 1: Exponer el Backend a Internet

El backend corre en `localhost:3010`, pero Mercado Pago necesita una URL pública.

### Opción A: Cloudflare Tunnel (Recomendado - Gratis)

```powershell
# Ejecutar el instalador automático
cd D:\kiosko-autoservicio\scripts
.\install-cloudflare-tunnel.ps1
```

Al finalizar tendrás una URL como:
```
https://api.tudominio.com
```

### Opción B: ngrok (Solo para pruebas)

```powershell
ngrok http 3010
# Genera URL temporal como: https://abc123.ngrok.io
```

---

## 📝 Paso 2: Configurar en Panel de Mercado Pago

1. Ir a: https://developers.mercadopago.com/panel/app

2. Seleccionar tu aplicación "Kiosko Autoservicio"

3. Click en **"Webhooks"** en el menú lateral

4. Configurar:

### URL de Producción
```
https://TU-DOMINIO.com/api/payments/mp/webhook
```

### Eventos a Activar

| Evento | Activar | Descripción |
|--------|---------|-------------|
| **Pagos** (payment) | ✅ SÍ | Notifica cuando se crea/actualiza un pago |
| **Integraciones Point** | ✅ SÍ | Notifica eventos de Point Smart |
| Órdenes comerciales | ❌ | No necesario |
| Chargebacks | ⚪ Opcional | Notifica contracargos |
| Planes y suscripciones | ❌ | No usado |

5. Click en **"Guardar"**

---

## 📝 Paso 3: Verificar Configuración

### Probar que el endpoint responde

```powershell
# Desde cualquier PC con internet
curl https://TU-DOMINIO.com/api/payments/mp/webhook -X POST

# Debería responder algo como:
# {"received":true}
```

### Simular webhook desde MP

1. En el panel de MP, sección Webhooks
2. Click en "Simular notificación"
3. Seleccionar tipo: "Pagos"
4. Enviar

### Verificar en logs del backend

En la consola del backend deberías ver:
```
Webhook Mercado Pago recibido:
{
  "action": "payment.created",
  "data": { ... }
}
```

---

## 🔍 Troubleshooting

### El webhook no llega

1. **Verificar URL accesible:**
   ```powershell
   curl https://TU-DOMINIO.com/api/payments/mp/webhook
   ```

2. **Verificar túnel activo:**
   ```powershell
   cloudflared tunnel info kiosko-autoservicio
   Get-Service Cloudflared
   ```

3. **Verificar firewall:**
   - Puerto 3010 debe estar abierto localmente
   - Cloudflare maneja el HTTPS externo

4. **Verificar logs de MP:**
   - Panel MP → Webhooks → "Ver historial"

### Error de certificado SSL

Cloudflare Tunnel maneja SSL automáticamente. Si usas otra solución:
- Asegúrate de tener certificado válido
- MP requiere HTTPS

### Webhook llega pero no procesa

Revisar logs del backend por errores como:
- "MP_ACCESS_TOKEN no configurado"
- "Error procesando webhook"

---

## 📊 Estructura del Webhook de Point

Cuando Point Smart termina un pago, MP envía:

```json
{
  "action": "point_integration_wh",
  "data": {
    "id": "intent_id_xxxxx"
  },
  "state": "finished",  // o "canceled", "error", "abandoned", "expired"
  "device_id": "NEWLAND_N950__..."
}
```

### Estados posibles

| Estado | Significado | Acción del Sistema |
|--------|-------------|-------------------|
| `finished` | Pago completado | Marca orden como PAID |
| `canceled` | Usuario canceló | Vuelve a estado anterior |
| `error` | Error de tarjeta/red | Puede reintentar |
| `abandoned` | Cliente se fue | Timeout del modal |
| `expired` | Intent expiró | Timeout del modal |

---

## 🔄 Flujo Completo

```
1. Cajero inicia pago Point
   └─▶ Backend crea payment_intent en MP

2. Point Smart muestra monto
   └─▶ Cliente pasa tarjeta

3. Point procesa pago
   └─▶ MP valida con banco

4. MP envía webhook al backend
   └─▶ state: "finished" + payment_id

5. Backend actualiza orden
   └─▶ Estado: PAID

6. Frontend detecta cambio
   └─▶ Muestra "Pago exitoso"
```

---

## ✅ Checklist Final

- [ ] Cloudflare Tunnel instalado y corriendo
- [ ] URL pública accesible (probado con curl)
- [ ] Webhook configurado en panel de MP
- [ ] Topics activados: `payment` + `point_integration_wh`
- [ ] Simulación de webhook exitosa
- [ ] Backend recibe y procesa webhooks
