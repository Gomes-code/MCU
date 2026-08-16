@echo off
rem ============================================================
rem  Confere os dados do site antes de publicar.
rem  Sem acentos: o Prompt de Comando le .bat com a codepage antiga.
rem ============================================================
setlocal
title Cronologia MCU - conferir dados
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo   ERRO: Node.js nao encontrado.
  echo   Baixe em https://nodejs.org  e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

node validar.js
echo.
pause
