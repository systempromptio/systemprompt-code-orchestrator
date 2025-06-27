#!/bin/bash

# Test script for running E2E tests against Docker container

echo "🐳 Testing MCP Server in Docker Container"
echo "========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Navigate to root directory
ROOT_DIR="$(cd ../.. && pwd)"

# Check if the container is running
if ! docker-compose -f "$ROOT_DIR/docker-compose.yml" ps | grep -q "mcp-server.*Up"; then
    echo "⚠️  MCP server container is not running. Starting it now..."
    docker-compose -f "$ROOT_DIR/docker-compose.yml" up -d mcp-server
    echo "⏳ Waiting for server to start..."
    sleep 10
fi

# Get container port
PORT=$(docker-compose -f "$ROOT_DIR/docker-compose.yml" port mcp-server 3000 | cut -d: -f2)
if [ -z "$PORT" ]; then
    PORT=3000
fi

echo "✅ MCP server is running on port $PORT"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run tests
echo ""
echo "🧪 Running E2E tests..."
echo ""

MCP_BASE_URL="http://localhost:$PORT" npm test

echo ""
echo "✅ Test execution complete"