@echo off
echo ===================================
echo FluxBoard Backend Startup Script
echo ===================================
echo.

cd apps\desktop-companion

echo [1/3] Generating Prisma Client...
call npm run db:generate
if errorlevel 1 (
    echo ERROR: Prisma generation failed
    pause
    exit /b 1
)
echo ✓ Prisma client generated

echo.
echo [2/3] Running Database Migrations...
call npm run db:migrate
if errorlevel 1 (
    echo ERROR: Database migrations failed
    pause
    exit /b 1
)
echo ✓ Database migrations complete

echo.
echo [3/3] Starting Backend Server...
echo Server will start on http://localhost:3123
echo WebSocket on ws://localhost:3124
echo.
call npm run dev
