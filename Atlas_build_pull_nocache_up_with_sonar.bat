@echo off
REM =====================================================================
REM File: Atlas_build_pull_nocache_up_with_sonar.bat
REM Purpose: Build and start Atlas with SonarQube and PlantUML
REM Version: 1.7
REM Notes:
REM   - Includes both docker-compose.yml and docker-compose.override.yml
REM   - Starts SonarQube and PlantUML automatically
REM   - Uses fixed healthcheck for SonarQube
REM =====================================================================

chcp 65001 >nul
setlocal ENABLEEXTENSIONS

REM =========================== CONFIGURATION ==================================
set "COMPOSE_FILES=-f docker-compose.yml -f docker-compose.override.yml"
set "COMPOSE_PROJECT_NAME=atlas"
set "REPO_ROOT_REL=."
set "BUILD_NO_CACHE=1"
set "BUILD_PULL=1"
set "AUTO_UP=1"
REM ======================================================================

REM --- Lokala variabler ---
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%\%REPO_ROOT_REL%") do set "REPO_ROOT=%%~fI"

REM --- Hitta docker compose-kommandot ---
set "DOCKER_COMPOSE_CMD=docker compose"
%DOCKER_COMPOSE_CMD% version >nul 2>&1
if errorlevel 1 (
  set "DOCKER_COMPOSE_CMD=docker-compose"
  %DOCKER_COMPOSE_CMD% version >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] Neither "docker compose" nor "docker-compose" is available.
    echo         Install Docker Desktop or docker-compose and retry.
    exit /b 1
  )
)

REM --- Grundkontroller ---
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

if not exist "%REPO_ROOT%\docker-compose.yml" (
  echo [ERROR] Compose file not found at "%REPO_ROOT%".
  exit /b 1
)

if not exist "%REPO_ROOT%\docker-compose.override.yml" (
  echo [WARNING] Override file not found, SonarQube and PlantUML will not be started.
)

pushd "%REPO_ROOT%" >nul

REM --- Handle command arguments ---
if /I "%~1"=="up"   goto :EARLY_UP
if /I "%~1"=="down" goto :EARLY_DOWN

REM --- Validera Compose ---
%DOCKER_COMPOSE_CMD% %COMPOSE_FILES% -p "%COMPOSE_PROJECT_NAME%" config -q
if errorlevel 1 (
  echo [ERROR] Compose validation failed. Fix YAML and retry.
  popd >nul
  exit /b 1
)

REM --- Byggflaggor ---
set "BUILD_FLAGS="
if "%BUILD_NO_CACHE%"=="1" set "BUILD_FLAGS=%BUILD_FLAGS% --no-cache"
if "%BUILD_PULL%"=="1"     set "BUILD_FLAGS=%BUILD_FLAGS% --pull"

echo [INFO] Building images for project "%COMPOSE_PROJECT_NAME%" with SonarQube and PlantUML...
%DOCKER_COMPOSE_CMD% %COMPOSE_FILES% -p "%COMPOSE_PROJECT_NAME%" build %BUILD_FLAGS%

if errorlevel 1 (
  echo [ERROR] Build failed.
  popd >nul
  exit /b 1
)

echo [SUCCESS] Build completed.

REM --- Auto-up after successful build ---
if "%AUTO_UP%"=="1" (
  echo [INFO] Starting all services including SonarQube and PlantUML...
  %DOCKER_COMPOSE_CMD% %COMPOSE_FILES% -p "%COMPOSE_PROJECT_NAME%" up -d
  if errorlevel 1 (
    echo [ERROR] Failed to start services.
    popd >nul
    exit /b 1
  )
  echo [SUCCESS] All services started successfully!
)

goto :SHOW_INFO

:EARLY_UP
echo [INFO] Starting all services...
%DOCKER_COMPOSE_CMD% %COMPOSE_FILES% -p "%COMPOSE_PROJECT_NAME%" up -d
if errorlevel 1 (
  echo [ERROR] Failed to start containers.
  popd >nul
  exit /b 1
)
echo [SUCCESS] Stack is up.
goto :SHOW_INFO

:EARLY_DOWN
echo [INFO] Bringing stack DOWN (volumes are kept).
%DOCKER_COMPOSE_CMD% %COMPOSE_FILES% -p "%COMPOSE_PROJECT_NAME%" down
if errorlevel 1 (
  echo [ERROR] Failed to bring stack down.
  popd >nul
  exit /b 1
)
echo [SUCCESS] Stack is down.
popd >nul
exit /b 0

:SHOW_INFO
echo.
echo [INFO] Service URLs:
echo   - Atlas API:     http://localhost:8199
echo   - Atlas Web Hub: http://localhost:9652
echo   - phpMyAdmin:    http://localhost:8086
echo   - SonarQube:     http://localhost:9010 (default: admin/admin)
echo   - PlantUML:      http://localhost:8010
echo.
echo [INFO] Container status:
%DOCKER_COMPOSE_CMD% %COMPOSE_FILES% -p "%COMPOSE_PROJECT_NAME%" ps

popd >nul
exit /b 0