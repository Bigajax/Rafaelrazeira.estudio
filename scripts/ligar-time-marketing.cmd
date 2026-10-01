@echo off
rem ============================================================
rem LIGAR O TIME DE MARKETING (01/10/2026)
rem
rem O botao "Ligar o time" da aba Marketing do CRM abre o link
rem rr-marketing://ligar, e o Windows roda este arquivo. Quem liga o
rem link a este arquivo e o scripts\registrar-botao-time.cmd (rodar uma
rem vez por PC). Tambem funciona com dois cliques aqui.
rem
rem Se o time ja estiver rodando, nao abre outro: dois workers nao rodam o
rem mesmo pedido, mas cada um come memoria (ver a armadilha do worker orfao).
rem ============================================================
chcp 65001 >nul
title Time de marketing
cd /d "%~dp0.."

powershell -NoProfile -Command "if (Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*marketing-agentes*' }) { exit 1 }"
if errorlevel 1 (
  echo O time de marketing ja esta ligado em outra janela. Esta pode fechar.
  timeout /t 6 >nul
  exit /b 0
)

rem a chave da API nunca vai para o time: ele roda pela assinatura
set ANTHROPIC_API_KEY=

echo Ligando o time de marketing. Deixe esta janela aberta (pode minimizar).
echo Para desligar, feche esta janela.
echo.
call npx tsx scripts/marketing-agentes.ts

echo.
echo O time parou. Se apareceu um erro acima, mande uma foto dele para o Claude.
pause
