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
rem run.ps1 takes switches (-Stop, -Status), not words: a bare "stop" would start everything.
set "JAHEZ_MODE="
if /i "%1"=="stop"   set "JAHEZ_MODE=-Stop"
if /i "%1"=="status" set "JAHEZ_MODE=-Status"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %JAHEZ_MODE%

if /i "%1"=="stop"   goto :end
if /i "%1"=="status" goto :end

echo.
echo Opening the project in your browser...
start "" "http://localhost:3000"

:end
echo.
pause
