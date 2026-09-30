@echo off
title MadTech Solutions - Bulk Invoicing Platform Launcher

echo =======================================================
echo   MadTech Solutions - Bulk Invoicing Platform Launcher
echo =======================================================
echo.
echo PREREQUISITES:
echo 1. Ensure your local PostgreSQL is running on port 5432.
echo 2. Verify you have updated your DB password in backend/.env.
echo 3. Verify Redis is running (wsl -u root service redis-server start).
echo.
set /p proceed="Have you completed the prerequisites? (y/n): "
if /i "%proceed%" neq "y" (
    echo Launch cancelled. Please set up your credentials first.
    pause
    exit /b
)

echo.
echo [1/3] Launching Express API Server...
start "Express API Server" cmd /k "npm run start:backend"

echo [2/3] Launching BullMQ PDF Worker...
start "BullMQ Worker" cmd /k "npm run start:worker"

echo [3/3] Launching Vite Frontend...
start "Vite Frontend" cmd /k "npm run start:frontend"

echo.
echo All services launched!
echo - API runs on: http://localhost:5000
echo - Frontend runs on: http://localhost:3000
echo.
pause
