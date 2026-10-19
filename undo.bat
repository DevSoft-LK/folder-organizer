@echo off
title Undo File Organizer
echo Reverting the last organization run...
echo.
node organizer.js --undo
echo.
echo =========================================
echo Press any key to close this window.
pause >nul