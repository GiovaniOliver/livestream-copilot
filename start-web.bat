@echo off
echo ===================================
echo FluxBoard Web App Startup Script
echo ===================================
echo.

cd apps\web

echo Starting Web Dashboard...
echo Server will start on http://localhost:3000
echo.
set NEXT_DISABLE_TURBOPACK=1
call npm run dev
