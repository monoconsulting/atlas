@echo off
rem Start the TaskMasterWeb static server at port 9652
rem Usage: double-click or run from PowerShell/CMD in project root

:: Try to use a virtual environment's python if available
if exist "%~dp0\..\venv\Scripts\python.exe" (
    set "PYTHON=%~dp0\..\venv\Scripts\python.exe"
) else if exist "%~dp0\..\.venv\Scripts\python.exe" (
    set "PYTHON=%~dp0\..\.venv\Scripts\python.exe"
) else (
    rem Fallback to py launcher then python in PATH
    set "PYTHON=py -3"
)

:: Change to web directory (relative to script)
cd /d "%~dp0\..\web"

:: Print info and start server
echo Starting TaskMasterWeb static server on port 9652...
echo Using: %PYTHON%
%PYTHON% server.py

:: If the server exits, pause so the window stays open
pause
