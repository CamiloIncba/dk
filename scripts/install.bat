@echo off
REM =============================================================================
REM INSTALADOR COMPLETO - KIOSKO AUTOSERVICIO
REM =============================================================================
REM Este script es un wrapper para ejecutar el instalador de PowerShell.
REM Doble clic para ejecutar (como Administrador recomendado).
REM =============================================================================

title Kiosko Autoservicio - Instalador del Sistema

echo.
echo ============================================
echo   KIOSKO AUTOSERVICIO
echo   Instalador del Sistema
echo ============================================
echo.

echo Iniciando instalacion...
echo.

REM Ejecutar el script de PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0install-system.ps1"

echo.
echo Presiona cualquier tecla para cerrar...
pause >nul
