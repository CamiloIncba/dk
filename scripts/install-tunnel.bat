@echo off
REM =============================================================================
REM INSTALADOR DE CLOUDFLARE TUNNEL PARA KIOSKO AUTOSERVICIO
REM =============================================================================
REM Este script es un wrapper para ejecutar el script de PowerShell
REM con los permisos correctos.
REM
REM USO: Hacer doble clic en este archivo (ejecutar como Administrador)
REM =============================================================================

title Kiosko Autoservicio - Instalador de Cloudflare Tunnel

echo.
echo ============================================
echo   KIOSKO AUTOSERVICIO
echo   Instalador de Cloudflare Tunnel
echo ============================================
echo.

REM Verificar privilegios de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Este instalador requiere privilegios de Administrador.
    echo.
    echo Por favor:
    echo   1. Haz clic derecho en este archivo
    echo   2. Selecciona "Ejecutar como administrador"
    echo.
    pause
    exit /b 1
)

echo [OK] Ejecutando como Administrador
echo.
echo Iniciando instalacion de Cloudflare Tunnel...
echo.

REM Ejecutar el script de PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0install-cloudflare-tunnel.ps1"

echo.
echo Presiona cualquier tecla para cerrar...
pause >nul
