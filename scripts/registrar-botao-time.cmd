@echo off
rem ============================================================
rem Ensina o Windows a abrir o link rr-marketing://ligar com o
rem scripts\ligar-time-marketing.cmd. Rodar UMA vez por PC (01/10/2026).
rem So mexe no registro do seu usuario (HKCU), nada do sistema.
rem Para desfazer:  reg delete "HKCU\Software\Classes\rr-marketing" /f
rem ============================================================
set "ALVO=%~dp0ligar-time-marketing.cmd"
reg add "HKCU\Software\Classes\rr-marketing" /ve /d "URL:Ligar o time de marketing" /f >nul
reg add "HKCU\Software\Classes\rr-marketing" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\rr-marketing\shell\open\command" /ve /d "\"%ALVO%\" \"%%1\"" /f >nul
echo O botao "Ligar o time" do CRM agora abre: %ALVO%
