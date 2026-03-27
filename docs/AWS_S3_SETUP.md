# Configuración de AWS S3 para Subida de Imágenes

Esta guía explica cómo configurar Amazon S3 desde cero para almacenar las imágenes de productos del sistema.

## 📋 Índice

1. [Crear cuenta AWS](#1-crear-cuenta-aws)
2. [Crear Bucket S3](#2-crear-bucket-s3)
3. [Configurar permisos públicos](#3-configurar-permisos-públicos)
4. [Crear usuario IAM](#4-crear-usuario-iam)
5. [Obtener credenciales](#5-obtener-credenciales)
6. [Configurar variables de entorno](#6-configurar-variables-de-entorno)
7. [Verificar configuración](#7-verificar-configuración)

---

## 1. Crear cuenta AWS

Si no tenés cuenta AWS:

1. Ir a [aws.amazon.com](https://aws.amazon.com)
2. Click en "Crear una cuenta de AWS"
3. Completar el registro (requiere tarjeta de crédito)
4. AWS tiene un **Free Tier** que incluye:
   - 5GB de almacenamiento S3 gratis
   - 20,000 solicitudes GET gratis/mes
   - 2,000 solicitudes PUT gratis/mes

---

## 2. Crear Bucket S3

### 2.1 Acceder a S3

1. Iniciar sesión en [console.aws.amazon.com](https://console.aws.amazon.com)
2. En la barra de búsqueda, escribir "S3" y seleccionar el servicio

### 2.2 Crear el bucket

1. Click en **"Crear bucket"**

2. **Nombre del bucket**: 
   - Usar un nombre único (ej: `casarica-productos-images`)
   - Solo minúsculas, números y guiones
   - El nombre debe ser único globalmente en AWS

3. **Región AWS**:
   - Elegir la más cercana a tus usuarios
   - Para Argentina: `us-east-1` (N. Virginia) o `sa-east-1` (São Paulo)
   - **⚠️ Anotar esta región, la necesitarás después**

4. **Configuración de propiedad de objetos**:
   - Seleccionar: "ACL deshabilitadas (recomendado)"

5. **Configuración de bloqueo de acceso público**:
   - ⚠️ **DESMARCAR** "Bloquear todo el acceso público"
   - Aparecerá una advertencia, marcar la casilla de confirmación
   - Esto es necesario para que las imágenes sean accesibles públicamente

6. **Versionado de bucket**:
   - Dejar en "Deshabilitado" (no necesario para imágenes)

7. Click en **"Crear bucket"**

---

## 3. Configurar permisos públicos

Para que las imágenes sean accesibles desde el navegador, necesitamos configurar una política de bucket.

### 3.1 Agregar política de bucket

1. Click en el bucket recién creado
2. Ir a la pestaña **"Permisos"**
3. En la sección **"Política del bucket"**, click en **"Editar"**
4. Pegar la siguiente política (reemplazar `TU-BUCKET-NAME`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::TU-BUCKET-NAME/products/*"
        }
    ]
}
```

5. Click en **"Guardar cambios"**

> **Nota**: Esta política solo permite leer archivos en la carpeta `products/`. La subida sigue requiriendo credenciales.

---

## 4. Crear usuario IAM

Necesitamos un usuario con permisos limitados para subir archivos desde el backend.

### 4.1 Acceder a IAM

1. En la barra de búsqueda de AWS, escribir "IAM"
2. Seleccionar el servicio IAM

### 4.2 Crear política personalizada

1. En el menú izquierdo, click en **"Políticas"**
2. Click en **"Crear política"**
3. Ir a la pestaña **"JSON"**
4. Pegar (reemplazar `TU-BUCKET-NAME`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::TU-BUCKET-NAME/products/*"
        }
    ]
}
```

5. Click en **"Siguiente"**
6. Nombre de la política: `CasaRicaS3Upload`
7. Click en **"Crear política"**

### 4.3 Crear usuario IAM

1. En el menú izquierdo, click en **"Usuarios"**
2. Click en **"Crear usuario"**
3. Nombre de usuario: `casarica-backend`
4. Click en **"Siguiente"**
5. Seleccionar **"Adjuntar políticas directamente"**
6. Buscar y seleccionar la política `CasaRicaS3Upload` que creaste
7. Click en **"Siguiente"** y luego **"Crear usuario"**

---

## 5. Obtener credenciales

### 5.1 Crear clave de acceso

1. Click en el usuario `casarica-backend`
2. Ir a la pestaña **"Credenciales de seguridad"**
3. En "Claves de acceso", click en **"Crear clave de acceso"**
4. Seleccionar **"Aplicación que se ejecuta fuera de AWS"**
5. Click en **"Siguiente"** y luego **"Crear clave de acceso"**
6. **⚠️ IMPORTANTE**: Guardar la **Access Key ID** y **Secret Access Key**
   - Esta es la única vez que verás la Secret Access Key
   - Guardarla en un lugar seguro

---

## 6. Configurar variables de entorno

### 6.1 Archivo .env del backend

Editar el archivo `backend/.env` y agregar:

```env
# AWS S3 - Subida de imágenes
AWS_ACCESS_KEY_ID=AKIA...TU_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=tu_secret_key_muy_larga
AWS_REGION=us-east-1
AWS_S3_BUCKET=casarica-productos-images
```

### 6.2 Variables en producción

Si usás Railway, Render, o similar:
1. Ir a las configuraciones del proyecto
2. Agregar las 4 variables de entorno con sus valores

---

## 7. Verificar configuración

### 7.1 Reiniciar el backend

```bash
cd backend
npm run start:dev
```

Deberías ver en la consola:
```
✅ AWS S3 configurado correctamente
```

Si ves este mensaje, todo está listo:
```
⚠️ AWS S3 no configurado - las subidas de imágenes no funcionarán
```

Significa que falta alguna variable de entorno.

### 7.2 Probar subida

1. Abrir el Cashier PWA
2. Ir a ⚙️ > Productos
3. Editar un producto
4. Subir una imagen
5. Verificar que aparece el preview y se guarda correctamente

---

## 🔒 Seguridad

- Las credenciales IAM solo tienen permisos para subir y eliminar en la carpeta `products/`
- La política de bucket solo permite lectura pública
- Nunca commitear el archivo `.env` con credenciales reales

## 💰 Costos estimados

Para un uso típico de restaurante:
- **Almacenamiento**: ~$0.023/GB/mes (100 productos con imágenes de 500KB = ~50MB = ~$0.001/mes)
- **Transferencia**: Los primeros 100GB/mes son gratis
- **Requests**: 2000 PUT gratis, 20000 GET gratis/mes

**Estimado mensual**: Menos de $1 USD/mes para uso típico.

---

## 🆘 Troubleshooting

### "Access Denied" al subir
- Verificar que las credenciales IAM tienen la política correcta
- Verificar que el nombre del bucket es correcto en la variable de entorno

### Las imágenes no cargan en el frontend
- Verificar que la política de bucket está configurada
- Verificar que la región es correcta
- Probar acceder directamente a la URL de una imagen

### "NoSuchBucket"
- Verificar que el bucket existe y el nombre está bien escrito
- Los nombres de bucket son case-sensitive
