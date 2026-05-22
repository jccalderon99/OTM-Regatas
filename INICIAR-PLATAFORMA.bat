@echo off
setlocal
cd /d "%~dp0"

set "NODE="
where node >nul 2>&1 && set "NODE=node" && goto :run

if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe" && goto :run
if exist "%LocalAppData%\Programs\node\node.exe" set "NODE=%LocalAppData%\Programs\node\node.exe" && goto :run
if exist "%LocalAppData%\ms-playwright-go\1.57.0\node.exe" set "NODE=%LocalAppData%\ms-playwright-go\1.57.0\node.exe" && goto :run

echo.
echo ERROR: Node.js no esta instalado.
echo Instala Node.js LTS: https://nodejs.org/
echo.
pause
exit /b 1

:run
echo Node listo. Carpeta: %CD%
if not exist "node_modules\vite\bin\vite.js" (
  echo Ejecuta primero: npm install
  pause
  exit /b 1
)

echo.
echo Abre en el navegador: http://localhost:5173
echo Para detener: Ctrl+C
echo.
"%NODE%" "node_modules\vite\bin\vite.js" --host --port 5173
pause
