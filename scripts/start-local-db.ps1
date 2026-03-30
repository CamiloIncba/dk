# PostgreSQL de desarrollo en puerto 5433 (no interfiere con una instancia en 5432).
# Requisito: PostgreSQL 17 (u otra) con initdb/pg_ctl en PATH o ajustá $PgBin.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$DataDir = Join-Path $Root ".dev\pg-data"
$LogFile = Join-Path $Root ".dev\pg.log"
$PgBin = "C:\Program Files\PostgreSQL\17\bin"

if (-not (Test-Path (Join-Path $PgBin "pg_ctl.exe"))) {
  Write-Error "No se encontró pg_ctl en $PgBin. Editá scripts\start-local-db.ps1."
}

$env:Path = "$PgBin;$env:Path"

if (-not (Test-Path (Join-Path $DataDir "PG_VERSION"))) {
  New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
  $pwf = Join-Path $Root ".dev\_pwfile.txt"
  Set-Content -Path $pwf -Value "password" -NoNewline
  & initdb -D $DataDir --encoding=UTF8 -U postgres --pwfile=$pwf
  Remove-Item $pwf -Force
}

& pg_ctl -D $DataDir -l $LogFile start -o "-p 5433"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Si el servidor ya estaba iniciado, ignorá este mensaje." -ForegroundColor Yellow
}

$createdb = & psql -h 127.0.0.1 -p 5433 -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'kiosko_dev'"
if (-not $createdb.Trim()) {
  & psql -h 127.0.0.1 -p 5433 -U postgres -d postgres -c "CREATE DATABASE kiosko_dev;"
}

Write-Host "PostgreSQL dev en 127.0.0.1:5433 (trust en localhost). Actualizá backend\.env con el puerto 5433." -ForegroundColor Green
