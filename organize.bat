@echo off
setlocal
cd /d "%~dp0"
title File Organizer
echo Starting File Organizer...
echo.
call npm run build
if errorlevel 1 goto finish
node "dist\organizer.js"
:finish
echo.
echo =========================================
echo Press any key to close this window.
pause >nul
endlocal
