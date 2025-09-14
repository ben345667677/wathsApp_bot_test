@echo off
REM WhatsApp Bot - Start without Docker
REM This script runs the bot with local MySQL

echo 🚀 Starting WhatsApp Bot (No Docker)...
echo =====================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if MySQL is running (assuming standard port 3306)
netstat -an | find "3306" >nul
if %errorlevel% neq 0 (
    echo ❌ MySQL is not running on port 3306!
    echo.
    echo 🔧 Please:
    echo   1. Install MySQL Community Server
    echo   2. Start MySQL service
    echo   3. Run the database setup (see docker-troubleshooting.md)
    echo.
    pause
    exit /b 1
)

REM Set environment variables for local MySQL
set DB_HOST=localhost
set DB_USER=botuser
set DB_PASSWORD=botpassword123!
set DB_NAME=whatsapp_bot
set NODE_ENV=production

echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo 📁 Creating necessary directories...
if not exist "people" mkdir people
if not exist "qr" mkdir qr
if not exist "auth" mkdir auth

echo 🔧 Starting the bot...
echo.
echo 📱 Check the .\qr folder for the QR code to scan with WhatsApp
echo.
echo 🛑 Press Ctrl+C to stop the bot
echo.

REM Start the bot
node simple_bot.js

pause
