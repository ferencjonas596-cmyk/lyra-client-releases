@echo off
cd /d "%~dp0"
call npm run setup
call npm start
pause
