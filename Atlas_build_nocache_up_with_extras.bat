@echo off
REM =====================================================================
REM File: Atlas_build_nocache_up_with_extras.bat
REM Purpose: Build and start Atlas with SonarQube and PlantUML (extras profile)
REM =====================================================================

chcp 65001 >nul
setlocal ENABLEEXTENSIONS

set "COMPOSE_FILE=docker-compose.yml"
set "COMPOSE_OVERRIDE_FILE=docker-compose.override.yml"
set "COMPOSE_PROJECT_NAME=atlas"
set "BUILD_NO_CACHE=1"
set "BUILD_PULL=0"

REM Check Docker availability
where docker >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker CLI not found in PATH.
  exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker daemon is not running or not accessible.
  exit /b 1
)

echo [INFO] Building Atlas with extras profile (SonarQube and PlantUML)...

REM Build with no-cache
docker compose -f %COMPOSE_FILE% -f %COMPOSE_OVERRIDE_FILE% --profile extras -p %COMPOSE_PROJECT_NAME% build --no-cache

if errorlevel 1 (
  echo [ERROR] Build failed.
  exit /b 1
)

echo [SUCCESS] Build completed.
echo [INFO] Starting all services including SonarQube and PlantUML...

REM Start all services including extras profile
docker compose -f %COMPOSE_FILE% -f %COMPOSE_OVERRIDE_FILE% --profile extras -p %COMPOSE_PROJECT_NAME% up -d

if errorlevel 1 (
  echo [ERROR] Failed to start services.
  exit /b 1
)

echo [SUCCESS] All services started successfully!
echo.
echo [INFO] Service URLs:
echo   - Atlas API:     http://localhost:8194
echo   - Atlas Web Hub: http://localhost:9652
echo   - phpMyAdmin:    http://localhost:8086
echo   - SonarQube:     http://localhost:9010 (default: admin/admin)
echo   - PlantUML:      http://localhost:8010
echo.
echo [INFO] Container status:
docker compose -f %COMPOSE_FILE% -f %COMPOSE_OVERRIDE_FILE% --profile extras -p %COMPOSE_PROJECT_NAME% ps

exit /b 0