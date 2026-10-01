@echo off
rem ============================================================
rem LIGAR O LEITOR DO WHATSAPP (01/10/2026)
rem
rem Dois cliques aqui. Na primeira vez aparece um QR code para ler com o
rem celular do estudio (WhatsApp > Aparelhos conectados). O leitor so LE:
rem as conversas com leads entram na linha do tempo do CRM.
rem
rem Se ja estiver ligado em outra janela, nao abre outro (ver a armadilha
rem do worker orfao).
rem ============================================================
chcp 65001 >nul
title Leitor do WhatsApp
cd /d "%~dp0.."

powershell -NoProfile -Command "if (Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*whatsapp-leitor*' }) { exit 1 }"
if errorlevel 1 (
  echo O leitor do WhatsApp ja esta ligado em outra janela. Esta pode fechar.
  timeout /t 6 >nul
  exit /b 0
)

set ANTHROPIC_API_KEY=

echo Ligando o leitor do WhatsApp. Deixe esta janela aberta (pode minimizar).
echo.
call npx tsx scripts/whatsapp-leitor.mts

echo.
echo O leitor parou. Se apareceu um erro acima, mande uma foto dele para o Claude.
pause
