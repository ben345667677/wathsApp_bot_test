#!/bin/bash

# WhatsApp Bot Docker Startup Script
# This script helps users easily start the bot with Docker Compose

echo "🚀 Starting WhatsApp Bot with Docker..."
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Create necessary directories if they don't exist
echo "📁 Creating necessary directories..."
mkdir -p people qr auth

# Create empty JSON files if they don't exist
if [ ! -f "groups.json" ]; then
    echo "{}" > groups.json
    echo "✅ Created groups.json"
fi

if [ ! -f "phone_mapping.json" ]; then
    echo "{}" > phone_mapping.json
    echo "✅ Created phone_mapping.json"
fi

if [ ! -f "group_messages.json" ]; then
    echo "{}" > group_messages.json
    echo "✅ Created group_messages.json"
fi

# Set proper permissions
echo "🔐 Setting permissions..."
chmod -R 755 people qr auth
chmod 644 *.json

echo ""
echo "🔧 Building and starting the bot..."
echo "This may take a few minutes on first run..."
echo ""

# Build and start the container
docker-compose up --build -d

# Check if container started successfully
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ WhatsApp Bot started successfully!"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs:     docker-compose logs -f"
    echo "  Stop bot:      docker-compose down"
    echo "  Restart bot:   docker-compose restart"
    echo "  View status:   docker-compose ps"
    echo ""
    echo "📱 Check the ./qr folder for the QR code to scan with WhatsApp"
    echo ""
    
    # Show logs for a few seconds
    echo "📄 Showing initial logs..."
    sleep 2
    docker-compose logs --tail=20
    
else
    echo "❌ Failed to start the bot. Check the logs:"
    docker-compose logs
    exit 1
fi
