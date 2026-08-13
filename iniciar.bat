@echo off
rem ============================================================
rem  Cronologia MCU - servidor local
rem
rem  Uso:
rem    iniciar.bat          abre so' nesta maquina (localhost)
rem    iniciar.bat rede     libera na rede local, para testar no celular
rem
rem  Sem acentos de proposito: o Prompt de Comando le este arquivo com a
rem  codepage antiga e caracteres acentuados podem corromper o script.
rem ============================================================
setlocal enabledelayedexpansion
title Cronologia MCU - servidor local

rem --- vai para a pasta deste .bat, seja de onde for chamado ---
cd /d "%~dp0"

if not exist "index.html" (
  echo.
  echo   ERRO: index.html nao encontrado nesta pasta.
  echo   Pasta atual: %CD%
  echo.
  echo   Mova este arquivo para a pasta do projeto, junto do index.html.
  echo.
  pause
  exit /b 1
)

rem --- procura o Python ---
set "PY="
for %%C in (python py python3) do (
  if not defined PY (
    where %%C >nul 2>&1 && set "PY=%%C"
  )
)
if not defined PY (
  echo.
  echo   ERRO: Python nao encontrado.
  echo.
  echo   Baixe em https://www.python.org/downloads/
  echo   Na instalacao, marque "Add Python to PATH".
  echo.
  pause
  exit /b 1
)

rem --- modo rede? ---
set "BIND=127.0.0.1"
set "HOSTNAME=localhost"
if /i "%~1"=="rede" set "BIND=0.0.0.0"

rem --- primeira porta livre a partir de 8000 ---
set /a PORT=8000
:procura_porta
netstat -an | findstr "LISTENING" | findstr /c:":!PORT! " >nul 2>&1
if not errorlevel 1 (
  set /a PORT+=1
  if !PORT! gtr 8030 (
    echo.
    echo   ERRO: nenhuma porta livre entre 8000 e 8030.
    echo   Feche outros servidores locais e tente de novo.
    echo.
    pause
    exit /b 1
  )
  goto procura_porta
)

cls
echo.
echo   ============================================
echo     CRONOLOGIA MCU
echo   ============================================
echo.
echo     Abra:   http://%HOSTNAME%:!PORT!
if /i "%~1"=="rede" (
  echo.
  echo     Na rede local, use um destes enderecos:
  for /f "tokens=2 delims=:" %%I in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=*" %%J in ("%%I") do echo       http://%%J:!PORT!
  )
)
echo.
echo     Pasta:  %CD%
echo     Python: %PY%
echo.
echo     Para parar: Ctrl+C, ou feche esta janela.
echo   ============================================
echo.

rem --- abre o navegador em paralelo, dando tempo do servidor subir ---
start "" /b powershell -NoProfile -WindowStyle Hidden -Command ^
  "Start-Sleep -Milliseconds 1200; Start-Process 'http://%HOSTNAME%:!PORT!'"

rem --- o servidor roda aqui, nesta janela ---
%PY% -m http.server !PORT! --bind %BIND%

rem --- se o Python sair sozinho, mostra o motivo antes de fechar ---
echo.
echo   Servidor encerrado.
echo.
pause
