@echo off
title ClauVR 360 - Servidor
setlocal
cd /d "%~dp0"

echo ===================================================
echo             INICIANDO CLAUVR PLATFORM
echo ===================================================
echo.

:: Check Node.js local folder
set "NODE_PATH=C:\Users\jccalderon\node-v24.16.0-win-x64"
if exist "%NODE_PATH%\node.exe" (
    set "PATH=%NODE_PATH%;%PATH%"
)

:: Verify node executable
set "NODE="
where node >nul 2>&1 && set "NODE=node" && goto :run

if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe" && goto :run
if exist "%LocalAppData%\Programs\node\node.exe" set "NODE=%LocalAppData%\Programs\node\node.exe" && goto :run

echo ERROR: Node.js no esta instalado.
echo Instala Node.js LTS desde: https://nodejs.org/
echo.
pause
exit /b 1

:run
echo [LOG] Node.js detectado en:
where node
echo.
echo [LOG] Iniciando servidor Express...
echo [LOG] Abre en tu navegador: http://localhost:3000/
echo [LOG] Para detener el servidor, presiona Ctrl+C.
echo.
node server.cjs
pause
