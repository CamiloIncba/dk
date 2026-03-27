# Configuración de Mercado Pago para Kiosko

Esta guía explica cómo configurar Mercado Pago para los 3 métodos de pago disponibles en la caja:

1. **Efectivo** - No requiere configuración
2. **Terminal Point** - Cobro con tarjeta física
3. **QR Estático** - Cliente escanea QR fijo en la caja

---

## 🤖 MCP Server de Mercado Pago (Opcional pero recomendado)

El MCP Server permite que el asistente IA (GitHub Copilot) interactúe directamente con las APIs de Mercado Pago para ayudarte a debuggear y probar la integración.

### Configuración

Ya está configurado en `.vscode/mcp.json`. Al iniciar una conversación con Copilot:

1. Te pedirá el **Access Token** de Mercado Pago
2. Con eso podrá consultar dispositivos Point, crear pagos de prueba, verificar webhooks, etc.

### ¿Qué puede hacer el MCP?

- ✅ Listar tus dispositivos Point conectados
- ✅ Verificar estado de un pago
- ✅ Consultar órdenes en tu QR
- ✅ Debuggear errores de API en tiempo real
- ✅ Ayudarte con la documentación oficial

---

## 📋 Requisitos Previos

1. Cuenta de Mercado Pago **vendedor** (no solo comprador)
2. Verificación de identidad completada
3. Para Terminal Point: dispositivo Point Smart o Pro
4. Para producción: solicitar credenciales productivas en el portal de desarrolladores

---

## 🔐 Paso 1: Obtener Credenciales de Desarrollador

### 1.1 Acceder al Portal de Desarrolladores

1. Ir a [https://www.mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
2. Iniciar sesión con tu cuenta de Mercado Pago
3. Ir a **"Tus integraciones"** → **"Crear aplicación"**

### 1.2 Crear Aplicación

- **Nombre**: `Kiosko Casa Rica` (o el nombre de tu negocio)
- **Modelo de integración**: Pagos online
- **Producto**: Checkout Pro + Código QR

### 1.3 Obtener Access Token

1. Ir a **"Credenciales"** en tu aplicación
2. En la sección **"Credenciales de producción"** (o de prueba para testing)
3. Copiar el **Access Token**

> ⚠️ **NUNCA compartas ni subas a Git el Access Token**

---

## 🖥️ Paso 2: Variables de Entorno (Backend)

Crear/editar el archivo `.env` en la carpeta `backend/`:

```env
# Mercado Pago - Credenciales
MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxx

# Mercado Pago - Para QR Estático
MP_USER_ID=123456789
MP_EXTERNAL_POS_ID=CAJA001

# Mercado Pago - Webhook (opcional pero recomendado)
MP_WEBHOOK_URL=https://tu-dominio.com/payments/mp/webhook
```

### Obtener `MP_USER_ID`

El User ID es tu ID de vendedor. Puedes obtenerlo con este comando:

```bash
curl -X GET \
  'https://api.mercadopago.com/users/me' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN'
```

Busca el campo `id` en la respuesta.

---

## 💳 Paso 3: Configurar Terminal Point (Cobro con Tarjeta)

### 3.1 Vincular el Dispositivo

1. Encender el terminal Point
2. Conectarlo a WiFi
3. Iniciar sesión con tu cuenta de Mercado Pago en el dispositivo
4. El dispositivo quedará vinculado automáticamente

### 3.2 Habilitar Modo Integración

Por defecto, los Point funcionan en modo standalone. Para controlarlos desde la app:

1. En el terminal, ir a **Configuración** → **Modo de operación**
2. Seleccionar **"Integrado"** o **"PDV"** (Point of Sale)
3. Confirmar el cambio

### 3.3 Verificar Dispositivos Vinculados

Una vez corriendo el backend, puedes verificar los dispositivos con:

```bash
curl -X GET http://localhost:3010/payments/mp/point/devices \
  -H 'X-API-KEY: tu-api-key'
```

Deberías ver algo como:

```json
[
  {
    "id": "GERTEC_MP35P__xxxxxxxxxx",
    "operating_mode": "PDV",
    "pos_id": null
  }
]
```

### 3.4 Solución de Problemas - Terminal

| Error | Solución |
|-------|----------|
| `device_busy` | El terminal está procesando otro pago. Esperá que termine. |
| `device_not_found` | Verificá que el terminal esté encendido, conectado a internet, y en modo Integrado. |
| Sin dispositivos | Puede tomar unos minutos para que aparezcan. Reiniciá el terminal. |

---

## 📱 Paso 4: Configurar QR Estático (Cliente escanea y paga)

El QR estático es un código QR **fijo** que pegás en la caja. Cuando el cliente lo escanea, ve el monto actual a pagar.

### 4.1 Crear Sucursal y Caja en MP

1. Ir a [Mercado Pago Business](https://www.mercadopago.com.ar/business)
2. Ir a **"QR y cobros"** → **"Código QR"**
3. Crear una **Sucursal** si no tenés (tu local)
4. Crear una **Caja/POS** dentro de la sucursal
5. Descargar el código QR de esa caja

### 4.2 Obtener el External POS ID

Al crear la caja, MP le asigna un ID. Puedes verlo en la URL cuando editas la caja, o consultando la API:

```bash
curl -X GET \
  'https://api.mercadopago.com/pos' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN'
```

Busca el campo `external_id` de tu caja.

### 4.3 Configurar Variables

```env
MP_USER_ID=123456789        # Tu ID de vendedor
MP_EXTERNAL_POS_ID=CAJA001  # El external_id de tu caja
```

### 4.4 Imprimir y Pegar el QR

El QR que descargaste es el que el cliente escanea. Imprimilo en buena calidad y pegalo en un lugar visible de la caja.

### 4.5 Cómo Funciona

1. El cajero crea el pedido y elige "QR Estático"
2. El sistema envía el monto al QR de la caja
3. El cliente escanea el QR y ve el monto
4. El cliente paga desde su app de Mercado Pago
5. El webhook notifica al sistema y se confirma el pago

---

## 🔔 Paso 5: Configurar Webhook (Notificaciones)

El webhook permite recibir notificaciones automáticas cuando un pago se completa.

### 5.1 Exponer Backend a Internet

Para pruebas locales, usa [ngrok](https://ngrok.com/):

```bash
ngrok http 3010
```

Obtendrás una URL como: `https://abc123.ngrok.io`

### 5.2 Registrar Webhook en MP

1. Ir a [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app)
2. Seleccionar tu aplicación
3. Ir a **"Webhooks"** → **"Configurar"**
4. **URL**: `https://abc123.ngrok.io/payments/mp/webhook`
5. **Eventos**: Seleccionar `payment`

### 5.3 Configurar Variable

```env
MP_WEBHOOK_URL=https://abc123.ngrok.io/payments/mp/webhook
```

### 5.4 Producción

En producción, usá la URL real de tu servidor:

```env
MP_WEBHOOK_URL=https://api.tunegocio.com/payments/mp/webhook
```

---

## ✅ Paso 6: Testing

### Probar Terminal Point

1. Desde el PWA, crear un pedido
2. Elegir "TERMINAL"
3. El terminal debería mostrar el monto
4. Pasar una tarjeta de prueba (en modo test) o una real

### Probar QR Estático

1. Desde el PWA, crear un pedido
2. Elegir "QR ESTÁTICO"
3. Escanear el QR con la app de Mercado Pago
4. Debería aparecer el monto y poder pagar

### Tarjetas de Prueba (Modo Test)

| Tarjeta | Número | CVV | Vencimiento | Resultado |
|---------|--------|-----|-------------|-----------|
| Mastercard | 5031 7557 3453 0604 | 123 | 11/25 | Aprobada |
| Visa | 4509 9535 6623 3704 | 123 | 11/25 | Aprobada |
| Mastercard | 5031 7557 3453 0604 | 123 | 11/25 | Rechazada (insufficient) |

---

## 🔧 Resumen de Variables de Entorno

```env
# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MP_USER_ID=123456789
MP_EXTERNAL_POS_ID=CAJA001
MP_WEBHOOK_URL=https://tu-dominio.com/payments/mp/webhook
```

---

## 📚 Referencias

- [Documentación Mercado Pago Point](https://www.mercadopago.com.ar/developers/es/docs/mp-point/landing)
- [Documentación QR Dinámico](https://www.mercadopago.com.ar/developers/es/docs/qr-code/qr-attended-part-b)
- [Webhooks](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)
- [Credenciales](https://www.mercadopago.com.ar/developers/es/docs/credentials)
