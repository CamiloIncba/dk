# =============================================================================
# INSTALADOR DE CLOUDFLARE TUNNEL PARA KIOSKO AUTOSERVICIO
# =============================================================================
# Este script instala y configura Cloudflare Tunnel (cloudflared) en Windows 10
# para exponer el backend local a internet y recibir webhooks de Mercado Pago.
#
# USO:
#   Ejecutar como Administrador:
#   powershell -ExecutionPolicy Bypass -File install-cloudflare-tunnel.ps1
#
# REQUISITOS:
#   - Windows 10/11
#   - Acceso a internet
#   - Cuenta de Cloudflare (gratis)
#   - Ejecutar como Administrador
# =============================================================================

param(
    [string]$TunnelName = "kiosko-autoservicio",
    [int]$BackendPort = 3010
)

$ErrorActionPreference = "Stop"

# Colores para output
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warning { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "[ERROR] $args" -ForegroundColor Red }

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  CLOUDFLARE TUNNEL - INSTALADOR AUTOMATICO" -ForegroundColor Magenta
Write-Host "  Para Kiosko Autoservicio" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""

# Verificar que se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Este script debe ejecutarse como Administrador."
    Write-Host "Haz clic derecho en PowerShell y selecciona 'Ejecutar como administrador'" -ForegroundColor Yellow
    exit 1
}

Write-Success "Ejecutando como Administrador"

# -----------------------------------------------------------------------------
# PASO 1: Descargar cloudflared
# -----------------------------------------------------------------------------
Write-Host ""
Write-Info "Paso 1: Descargando cloudflared..."

$cloudflaredPath = "C:\Program Files\Cloudflare\cloudflared.exe"
$cloudflaredDir = "C:\Program Files\Cloudflare"
$downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"

# Crear directorio si no existe
if (-not (Test-Path $cloudflaredDir)) {
    New-Item -ItemType Directory -Path $cloudflaredDir -Force | Out-Null
    Write-Success "Directorio creado: $cloudflaredDir"
}

# Descargar si no existe
if (Test-Path $cloudflaredPath) {
    Write-Warning "cloudflared ya existe en $cloudflaredPath"
    $response = Read-Host "Desea reinstalar? (s/N)"
    if ($response -ne "s" -and $response -ne "S") {
        Write-Info "Usando instalacion existente..."
    } else {
        Write-Info "Descargando version mas reciente..."
        Invoke-WebRequest -Uri $downloadUrl -OutFile $cloudflaredPath -UseBasicParsing
        Write-Success "cloudflared actualizado"
    }
} else {
    Write-Info "Descargando desde GitHub..."
    Invoke-WebRequest -Uri $downloadUrl -OutFile $cloudflaredPath -UseBasicParsing
    Write-Success "cloudflared descargado a $cloudflaredPath"
}

# Agregar al PATH si no está
$envPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
if ($envPath -notlike "*$cloudflaredDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$envPath;$cloudflaredDir", "Machine")
    Write-Success "cloudflared agregado al PATH del sistema"
} else {
    Write-Info "cloudflared ya esta en el PATH"
}

# Verificar instalación
Write-Host ""
Write-Info "Verificando instalacion..."
$version = & $cloudflaredPath version 2>&1
Write-Success "Instalado: $version"

# -----------------------------------------------------------------------------
# PASO 2: Autenticación con Cloudflare
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  PASO 2: AUTENTICACION CON CLOUDFLARE" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Se abrira el navegador para autenticar con tu cuenta de Cloudflare." -ForegroundColor Cyan
Write-Host "1. Inicia sesion en Cloudflare (cuenta gratuita OK)" -ForegroundColor White
Write-Host "2. Autoriza la aplicacion cloudflared" -ForegroundColor White
Write-Host "3. Selecciona el dominio donde crear el tunel" -ForegroundColor White
Write-Host ""

$doLogin = Read-Host "Presiona ENTER para abrir el navegador (o escribe 'skip' si ya estas autenticado)"

if ($doLogin -ne "skip") {
    Write-Info "Abriendo navegador para autenticacion..."
    & $cloudflaredPath tunnel login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error durante la autenticacion. Intenta nuevamente."
        exit 1
    }
    Write-Success "Autenticacion completada"
} else {
    Write-Info "Saltando autenticacion..."
}

# -----------------------------------------------------------------------------
# PASO 3: Crear el túnel
# -----------------------------------------------------------------------------
Write-Host ""
Write-Info "Paso 3: Creando tunel '$TunnelName'..."

# Verificar si el túnel ya existe
$existingTunnels = & $cloudflaredPath tunnel list 2>&1
if ($existingTunnels -like "*$TunnelName*") {
    Write-Warning "El tunel '$TunnelName' ya existe"
    $recreate = Read-Host "Desea eliminarlo y recrearlo? (s/N)"
    if ($recreate -eq "s" -or $recreate -eq "S") {
        Write-Info "Eliminando tunel existente..."
        & $cloudflaredPath tunnel delete $TunnelName 2>&1 | Out-Null
    }
}

# Crear túnel
& $cloudflaredPath tunnel create $TunnelName

if ($LASTEXITCODE -ne 0) {
    Write-Warning "El tunel puede que ya exista. Continuando..."
}

# Obtener ID del túnel
$tunnelInfo = & $cloudflaredPath tunnel list 2>&1 | Select-String $TunnelName
if ($tunnelInfo) {
    $tunnelId = ($tunnelInfo -split '\s+')[0]
    Write-Success "Tunel creado/encontrado con ID: $tunnelId"
} else {
    Write-Error "No se pudo obtener el ID del tunel"
    exit 1
}

# -----------------------------------------------------------------------------
# PASO 4: Crear archivo de configuración
# -----------------------------------------------------------------------------
Write-Host ""
Write-Info "Paso 4: Creando archivo de configuracion..."

$configDir = "$env:USERPROFILE\.cloudflared"
$configPath = "$configDir\config.yml"

if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

# Obtener el dominio configurado
Write-Host ""
Write-Host "Necesitas configurar un subdominio para tu tunel." -ForegroundColor Cyan
Write-Host "Ejemplo: Si tu dominio es 'mitienda.com', puedes usar:" -ForegroundColor White
Write-Host "  - api.mitienda.com" -ForegroundColor White
Write-Host "  - kiosko.mitienda.com" -ForegroundColor White
Write-Host ""
$subdomain = Read-Host "Ingresa el subdominio completo (ej: api.tudominio.com)"

if (-not $subdomain) {
    Write-Error "Debes ingresar un subdominio"
    exit 1
}

# Crear archivo de configuración
$configContent = @"
# Configuracion de Cloudflare Tunnel para Kiosko Autoservicio
# Generado automaticamente el $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
#
# Este tunel expone el backend NestJS (puerto $BackendPort) a internet
# para recibir webhooks de Mercado Pago.

tunnel: $tunnelId
credentials-file: $configDir\$tunnelId.json

ingress:
  # Regla para el backend de Kiosko Autoservicio
  - hostname: $subdomain
    service: http://localhost:$BackendPort
  
  # Catch-all (requerido por cloudflared)
  - service: http_status:404
"@

Set-Content -Path $configPath -Value $configContent -Encoding UTF8
Write-Success "Configuracion guardada en: $configPath"

# -----------------------------------------------------------------------------
# PASO 5: Crear registro DNS
# -----------------------------------------------------------------------------
Write-Host ""
Write-Info "Paso 5: Creando registro DNS en Cloudflare..."

& $cloudflaredPath tunnel route dns $TunnelName $subdomain

if ($LASTEXITCODE -eq 0) {
    Write-Success "Registro DNS creado: $subdomain"
} else {
    Write-Warning "No se pudo crear el registro DNS automaticamente."
    Write-Host "Puedes crearlo manualmente en el panel de Cloudflare:" -ForegroundColor Yellow
    Write-Host "  Tipo: CNAME, Nombre: (subdominio), Contenido: $tunnelId.cfargotunnel.com" -ForegroundColor White
}

# -----------------------------------------------------------------------------
# PASO 6: Instalar como servicio de Windows
# -----------------------------------------------------------------------------
Write-Host ""
Write-Info "Paso 6: Instalando como servicio de Windows..."

# Detener servicio si existe
$existingService = Get-Service -Name "Cloudflared" -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Info "Deteniendo servicio existente..."
    Stop-Service -Name "Cloudflared" -Force -ErrorAction SilentlyContinue
    & $cloudflaredPath service uninstall 2>&1 | Out-Null
}

# Instalar servicio
& $cloudflaredPath service install

if ($LASTEXITCODE -eq 0) {
    Write-Success "Servicio de Windows instalado"
    
    # Iniciar servicio
    Start-Service -Name "Cloudflared"
    Write-Success "Servicio iniciado"
} else {
    Write-Warning "No se pudo instalar como servicio automaticamente."
    Write-Host "Puedes ejecutar manualmente:" -ForegroundColor Yellow
    Write-Host "  cloudflared tunnel run $TunnelName" -ForegroundColor White
}

# -----------------------------------------------------------------------------
# RESUMEN FINAL
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  INSTALACION COMPLETADA" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tu backend ahora esta disponible en:" -ForegroundColor Cyan
Write-Host "  https://$subdomain" -ForegroundColor White
Write-Host ""
Write-Host "URLs para configurar en Mercado Pago:" -ForegroundColor Cyan
Write-Host "  Webhook general:     https://$subdomain/api/payments/mp/webhook" -ForegroundColor White
Write-Host "  Webhook Point:       https://$subdomain/api/payments/mp/point/webhook" -ForegroundColor White
Write-Host ""
Write-Host "Topic a habilitar en MP (Tus integraciones):" -ForegroundColor Cyan
Write-Host "  - Pagos (payment)" -ForegroundColor White
Write-Host "  - Integraciones Point (point_integration_wh)" -ForegroundColor White
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Cyan
Write-Host "  Ver estado del tunel:    cloudflared tunnel info $TunnelName" -ForegroundColor White
Write-Host "  Ver logs del servicio:   Get-EventLog -LogName Application -Source Cloudflared -Newest 20" -ForegroundColor White
Write-Host "  Reiniciar servicio:      Restart-Service Cloudflared" -ForegroundColor White
Write-Host "  Ejecutar en primer plano: cloudflared tunnel run $TunnelName" -ForegroundColor White
Write-Host ""
Write-Host "Archivos importantes:" -ForegroundColor Cyan
Write-Host "  Configuracion: $configPath" -ForegroundColor White
Write-Host "  Credenciales:  $configDir\$tunnelId.json" -ForegroundColor White
Write-Host ""

# Verificar que el túnel está corriendo
Write-Info "Verificando conexion..."
Start-Sleep -Seconds 3

$tunnelStatus = & $cloudflaredPath tunnel info $TunnelName 2>&1
if ($tunnelStatus -like "*Running*" -or $tunnelStatus -like "*Connections*") {
    Write-Success "El tunel esta funcionando correctamente!"
} else {
    Write-Warning "El tunel puede tardar unos segundos en conectarse."
    Write-Host "Verifica en unos momentos con: cloudflared tunnel info $TunnelName"
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  SIGUIENTE PASO:" -ForegroundColor Magenta
Write-Host "  Configura los webhooks en tu panel de" -ForegroundColor Magenta
Write-Host "  Mercado Pago (developers.mercadopago.com)" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""
