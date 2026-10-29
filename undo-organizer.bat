@echo off
setlocal
cd /d "%~dp0"
title Undo File Organizer
echo Reverting the last organization run...
echo.
call npm run build
if errorlevel 1 goto finish
node "dist\organizer.js" --undo
:finish
echo.
echo =========================================
echo Press any key to close this window.
pause >nul
endlocal
