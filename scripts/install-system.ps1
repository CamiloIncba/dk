# =============================================================================
# INSTALADOR COMPLETO - KIOSKO AUTOSERVICIO
# =============================================================================
# Este script instala todos los componentes necesarios para ejecutar
# el sistema de Kiosko Autoservicio en una nueva maquina Windows.
#
# COMPONENTES:
#   - Node.js 20 LTS
#   - Git (opcional)
#   - Dependencias del backend (npm install)
#   - Prisma (migraciones de base de datos)
#   - Variables de entorno (.env)
#
# USO:
#   Ejecutar como Administrador:
#   powershell -ExecutionPolicy Bypass -File install-system.ps1
# =============================================================================

param(
    [string]$ProjectPath = "",
    [switch]$SkipNodeInstall,
    [switch]$SkipDependencies
)

$ErrorActionPreference = "Stop"

# Colores para output
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warning { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "[ERROR] $args" -ForegroundColor Red }

function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  KIOSKO AUTOSERVICIO - INSTALADOR COMPLETO" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""

# Determinar ruta del proyecto
if (-not $ProjectPath) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectPath = Split-Path -Parent $ScriptDir
}

Write-Info "Directorio del proyecto: $ProjectPath"

# Verificar que existe
if (-not (Test-Path "$ProjectPath\backend\package.json")) {
    Write-Error "No se encontro el proyecto en: $ProjectPath"
    Write-Host "Asegurate de ejecutar este script desde la carpeta 'scripts' del proyecto."
    exit 1
}

# -----------------------------------------------------------------------------
# PASO 1: Verificar/Instalar Node.js
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  PASO 1: NODE.JS" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow

if (-not $SkipNodeInstall) {
    if (Test-Command "node") {
        $nodeVersion = node --version
        Write-Success "Node.js instalado: $nodeVersion"
        
        # Verificar versión mínima (20.x)
        $versionNum = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($versionNum -lt 18) {
            Write-Warning "Se recomienda Node.js 18 o superior. Version actual: $nodeVersion"
            $upgrade = Read-Host "Deseas descargar Node.js 20 LTS? (s/N)"
            if ($upgrade -eq "s" -or $upgrade -eq "S") {
                $SkipNodeInstall = $false
            }
        }
    } else {
        Write-Warning "Node.js no esta instalado"
        $SkipNodeInstall = $false
    }
    
    if (-not $SkipNodeInstall -and -not (Test-Command "node")) {
        Write-Info "Descargando Node.js 20 LTS..."
        
        $nodeInstaller = "$env:TEMP\node-installer.msi"
        $nodeUrl = "https://nodejs.org/dist/v20.18.1/node-v20.18.1-x64.msi"
        
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing
        Write-Success "Descarga completada"
        
        Write-Info "Instalando Node.js (esto puede tomar unos minutos)..."
        Start-Process msiexec.exe -Wait -ArgumentList "/i", $nodeInstaller, "/quiet", "/norestart"
        
        # Actualizar PATH para la sesión actual
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
        
        if (Test-Command "node") {
            Write-Success "Node.js instalado correctamente"
        } else {
            Write-Warning "Puede que necesites reiniciar el terminal para usar node"
        }
        
        Remove-Item $nodeInstaller -Force -ErrorAction SilentlyContinue
    }
}

# Verificar npm
if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Success "npm disponible: v$npmVersion"
} else {
    Write-Error "npm no esta disponible. Reinstala Node.js."
    exit 1
}

# -----------------------------------------------------------------------------
# PASO 2: Instalar dependencias del backend
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  PASO 2: DEPENDENCIAS DEL BACKEND" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow

$backendPath = "$ProjectPath\backend"

if (-not $SkipDependencies) {
    Set-Location $backendPath
    
    Write-Info "Instalando dependencias del backend..."
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencias del backend instaladas"
    } else {
        Write-Error "Error instalando dependencias del backend"
        exit 1
    }
    
    # Generar cliente Prisma
    Write-Info "Generando cliente Prisma..."
    npx prisma generate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Cliente Prisma generado"
    } else {
        Write-Warning "Error generando cliente Prisma"
    }
}

# -----------------------------------------------------------------------------
# PASO 3: Configurar variables de entorno
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  PASO 3: VARIABLES DE ENTORNO" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow

$envPath = "$backendPath\.env"
$envExamplePath = "$backendPath\.env.example"

if (Test-Path $envPath) {
    Write-Success "Archivo .env ya existe"
    $reconfigure = Read-Host "Deseas reconfigurarlo? (s/N)"
    if ($reconfigure -ne "s" -and $reconfigure -ne "S") {
        $skipEnvConfig = $true
    }
} else {
    $skipEnvConfig = $false
    # Copiar .env.example si existe
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
        Write-Info "Archivo .env creado desde .env.example"
    }
}

if (-not $skipEnvConfig) {
    Write-Host ""
    Write-Host "Configuracion de variables de entorno:" -ForegroundColor Cyan
    Write-Host ""
    
    # DATABASE_URL
    Write-Host "Base de datos SQLite (deja vacio para usar por defecto):" -ForegroundColor White
    $dbPath = Read-Host "Ruta [file:./dev.db]"
    if (-not $dbPath) { $dbPath = "file:./dev.db" }
    
    # MP_ACCESS_TOKEN
    Write-Host ""
    Write-Host "Access Token de Mercado Pago:" -ForegroundColor White
    Write-Host "(Obtenelo en https://developers.mercadopago.com/panel/app)" -ForegroundColor Gray
    $mpAccessToken = Read-Host "MP_ACCESS_TOKEN"
    
    # MP_POINT_DEVICE_ID (opcional)
    Write-Host ""
    Write-Host "ID del dispositivo Point Smart (opcional):" -ForegroundColor White
    $pointDeviceId = Read-Host "MP_POINT_DEVICE_ID"
    
    # PORT
    Write-Host ""
    Write-Host "Puerto del backend:" -ForegroundColor White
    $port = Read-Host "PORT [3010]"
    if (-not $port) { $port = "3010" }
    
    # Escribir archivo .env
    $envContent = @"
# =============================================================================
# KIOSKO AUTOSERVICIO - CONFIGURACION DE ENTORNO
# =============================================================================
# Generado automaticamente el $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# =============================================================================

# Base de datos SQLite
DATABASE_URL="$dbPath"

# Puerto del servidor backend
PORT=$port

# =============================================================================
# MERCADO PAGO
# =============================================================================

# Access Token de produccion (obtenelo en developers.mercadopago.com)
MP_ACCESS_TOKEN=$mpAccessToken

# ID del dispositivo Point Smart (obtenelo con GET /point/integration-api/devices)
MP_POINT_DEVICE_ID=$pointDeviceId

# =============================================================================
# CLOUDFLARE TUNNEL (configurar despues de instalar)
# =============================================================================

# URL publica del webhook (se genera despues de instalar Cloudflare Tunnel)
# WEBHOOK_URL=https://tu-subdominio.tu-dominio.com

# =============================================================================
# OPCIONALES
# =============================================================================

# Tiempo de expiracion de QR en milisegundos (default: 300000 = 5 min)
# QR_EXPIRATION_MS=300000

# Modo de operacion Point: PDV (integrado) o STANDALONE
# POINT_OPERATING_MODE=PDV
"@

    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Success "Archivo .env configurado"
}

# -----------------------------------------------------------------------------
# PASO 4: Ejecutar migraciones de base de datos
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  PASO 4: BASE DE DATOS" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow

Set-Location $backendPath

Write-Info "Ejecutando migraciones de Prisma..."
npx prisma migrate deploy

if ($LASTEXITCODE -eq 0) {
    Write-Success "Migraciones aplicadas correctamente"
} else {
    Write-Warning "Error en migraciones. Puede que la BD este vacia (es normal en primera instalacion)"
    
    Write-Info "Intentando con prisma db push..."
    npx prisma db push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Base de datos sincronizada"
    }
}

# -----------------------------------------------------------------------------
# PASO 5: Verificar que todo funciona
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  PASO 5: VERIFICACION" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow

Write-Info "Compilando proyecto..."
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Success "Proyecto compilado correctamente"
} else {
    Write-Error "Error compilando el proyecto"
    Write-Host "Revisa los errores arriba e intenta corregirlos."
}

# -----------------------------------------------------------------------------
# RESUMEN FINAL
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  INSTALACION COMPLETADA" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "El sistema esta listo para ejecutarse!" -ForegroundColor Cyan
Write-Host ""
Write-Host "COMANDOS PARA INICIAR:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Backend (desarrollo):" -ForegroundColor White
Write-Host "    cd $backendPath" -ForegroundColor Gray
Write-Host "    npm run start:dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  Backend (produccion):" -ForegroundColor White
Write-Host "    cd $backendPath" -ForegroundColor Gray
Write-Host "    npm run start:prod" -ForegroundColor Gray
Write-Host ""
Write-Host "SIGUIENTE PASO:" -ForegroundColor Yellow
Write-Host "  Ejecuta install-cloudflare-tunnel.ps1 para configurar webhooks" -ForegroundColor White
Write-Host ""

Set-Location $ProjectPath
