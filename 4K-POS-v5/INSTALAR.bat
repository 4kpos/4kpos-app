@echo off
title 4K POS v4
color 0A
echo Instalando 4K POS v4...
cd /d "%~dp0"
call npm install --legacy-peer-deps
echo Listo! Abriendo...
call npm start
pause
