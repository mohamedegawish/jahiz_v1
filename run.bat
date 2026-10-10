@echo off
title Jahez - Project Launcher
cd /d "%~dp0"

if /i "%1"=="stop"   goto :run
if /i "%1"=="status" goto :run
if /i "%1"=="start"  goto :run

echo ============================================================
echo   Jahez launcher
echo     API   http://localhost:8000
echo     FRONT http://localhost:3000
echo   Commands: run.bat  ^|  run.bat status  ^|  run.bat stop
echo ============================================================
echo.

:run
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %1

if /i "%1"=="stop"   goto :end
if /i "%1"=="status" goto :end

echo.
echo Opening the project in your browser...
start "" "http://localhost:3000"

:end
echo.
pause
