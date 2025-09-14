@echo off
REM WhatsApp Bot Docker Startup Script for Windows
REM This script helps users easily start the bot with Docker Compose

echo 🚀 Starting WhatsApp Bot with Docker...
echo ==================================

REM Check if Docker is installed and running
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    echo Visit: https://docs.docker.com/desktop/windows/install/
    echo.
    echo ⚠️  Alternative: Run without Docker - see docker-troubleshooting.md
    pause
    exit /b 1
)

REM Check if Docker Desktop is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Desktop is not running!
    echo.
    echo 🔧 Please:
    echo   1. Open Docker Desktop from Start Menu
    echo   2. Wait for it to start completely
    echo   3. Run this script again
    echo.
    echo ⚠️  Alternative: Run without Docker - see docker-troubleshooting.md
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    echo Visit: https://docs.docker.com/compose/install/
    pause
    exit /b 1
)

REM Create necessary directories if they don't exist
echo 📁 Creating necessary directories...
if not exist "people" mkdir people
if not exist "qr" mkdir qr
if not exist "auth" mkdir auth

REM Create empty JSON files if they don't exist
if not exist "groups.json" (
    echo {} > groups.json
    echo ✅ Created groups.json
)

if not exist "phone_mapping.json" (
    echo {} > phone_mapping.json
    echo ✅ Created phone_mapping.json
)

if not exist "group_messages.json" (
    echo {} > group_messages.json
    echo ✅ Created group_messages.json
)

echo.
echo 🔧 Building and starting the bot...
echo This may take a few minutes on first run...
echo.

REM Build and start the container
docker-compose up --build -d

if %errorlevel% equ 0 (
    echo.
    echo ✅ WhatsApp Bot started successfully!
    echo.
    echo 📋 Useful commands:
    echo   View logs:     docker-compose logs -f
    echo   Stop bot:      docker-compose down
    echo   Restart bot:   docker-compose restart
    echo   View status:   docker-compose ps
    echo.
    echo 📱 Check the .\qr folder for the QR code to scan with WhatsApp
    echo.
    
    REM Show logs for a few seconds
    echo 📄 Showing initial logs...
    timeout /t 2 /nobreak >nul
    docker-compose logs --tail=20
    
) else (
    echo ❌ Failed to start the bot. Check the logs:
    docker-compose logs
    pause
    exit /b 1
)

echo.
echo Press any key to continue...
pause >nul
