@echo off
setlocal

set "ROOT=%~dp0"

echo ========================================
echo Iniciando Arame Turismo (DEV)
echo ========================================

set "BACKEND_PORT=3001"
set "FRONTEND_PORT=5173"

if not exist "%ROOT%backend\package.json" (
  echo [ERRO] Pasta backend nao encontrada em: %ROOT%backend
  exit /b 1
)

if not exist "%ROOT%frontend\package.json" (
  echo [ERRO] Pasta frontend nao encontrada em: %ROOT%frontend
  exit /b 1
)

netstat -ano | findstr /r /c:":%BACKEND_PORT% .*LISTENING" >nul
if %errorlevel%==0 (
  echo [INFO] Backend ja esta em execucao na porta %BACKEND_PORT%. Nao sera iniciado novamente.
) else (
  echo Abrindo backend...
  start "Arame Backend" cmd /k "cd /d ""%ROOT%backend"" && npm.cmd run dev"
)

netstat -ano | findstr /r /c:":%FRONTEND_PORT% .*LISTENING" >nul
if %errorlevel%==0 (
  echo [INFO] Frontend ja esta em execucao na porta %FRONTEND_PORT%. Nao sera iniciado novamente.
) else (
  echo Abrindo frontend...
  start "Arame Frontend" cmd /k "cd /d ""%ROOT%frontend"" && npm.cmd run dev"
)

echo.
echo Verificacao concluida.
echo Feche as janelas para parar os servicos.

endlocal
exit /b 0
