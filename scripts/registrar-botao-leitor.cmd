@echo off
rem ============================================================
rem Ensina o Windows a abrir o link rr-whatsapp://ligar com o
rem scripts\ligar-leitor-whatsapp.cmd. Rodar UMA vez por PC (01/10/2026).
rem So mexe no registro do seu usuario (HKCU), nada do sistema.
rem Para desfazer:  reg delete "HKCU\Software\Classes\rr-whatsapp" /f
rem ============================================================
set "ALVO=%~dp0ligar-leitor-whatsapp.cmd"
reg add "HKCU\Software\Classes\rr-whatsapp" /ve /d "URL:Ligar o leitor do WhatsApp" /f >nul
reg add "HKCU\Software\Classes\rr-whatsapp" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\rr-whatsapp\shell\open\command" /ve /d "\"%ALVO%\" \"%%1\"" /f >nul
echo O botao "Ligar o leitor do WhatsApp" do CRM agora abre: %ALVO%
