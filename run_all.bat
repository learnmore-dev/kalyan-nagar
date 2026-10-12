@echo off
title Kalyan Nagar Services Launcher
echo ========================================================
echo   Starting Backend (Port 8001) and WhatsApp Bot (Port 5002)
echo ========================================================

start "Django Backend (8001)" cmd /k "cd /d "%~dp0\backend\trainer_dashboard_django" && python manage.py runserver 8001"
start "WhatsApp Baileys Bot (5002)" cmd /k "cd /d "%~dp0\frontend\learnmore-moniter" && npm run bot"

echo.
echo Both services have been launched in separate terminal windows!
echo - Django Backend: http://127.0.0.1:8001
echo - WhatsApp Bot:   http://127.0.0.1:5002
echo - Frontend:       http://localhost:3001
echo.
pause
