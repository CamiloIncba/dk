@echo off
REM =============================================================================
REM INICIADOR DE SERVICIOS - KIOSKO AUTOSERVICIO (DESARROLLO)
REM =============================================================================
REM Este script inicia el backend en modo desarrollo con hot-reload.
REM =============================================================================

title Kiosko Autoservicio - Backend (Desarrollo)

echo.
echo ============================================
echo   KIOSKO AUTOSERVICIO - BACKEND
echo   Modo: DESARROLLO (hot-reload)
echo ============================================
echo.

cd /d "%~dp0..\backend"

echo Iniciando backend en modo desarrollo...
echo.
echo Presiona Ctrl+C para detener el servidor.
echo.

npm run start:dev

pause
