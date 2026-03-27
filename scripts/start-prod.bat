@echo off
REM =============================================================================
REM INICIADOR DE SERVICIOS - KIOSKO AUTOSERVICIO
REM =============================================================================
REM Este script inicia el backend en modo produccion.
REM Para desarrollo, usa start-dev.bat
REM =============================================================================

title Kiosko Autoservicio - Backend (Produccion)

echo.
echo ============================================
echo   KIOSKO AUTOSERVICIO - BACKEND
echo   Modo: PRODUCCION
echo ============================================
echo.

cd /d "%~dp0..\backend"

echo Iniciando backend en modo produccion...
echo.
echo Presiona Ctrl+C para detener el servidor.
echo.

npm run start:prod

pause
