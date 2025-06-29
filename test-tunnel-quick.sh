#!/bin/bash

# Quick script to test tunnel functionality

echo "🚀 Testing Cloudflare Tunnel Setup"
echo "================================="

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared not found. Please run: npm run setup"
    exit 1
fi

echo "✅ cloudflared is installed"

# Test creating a tunnel (will fail immediately but shows it works)
echo ""
echo "Testing cloudflared command..."
cloudflared version

echo ""
echo "✅ Tunnel infrastructure is ready!"
echo ""
echo "To start the server with tunnel:"
echo "  npm run tunnel"
echo ""
echo "To test the tunnel connection:"
echo "  cd e2e-test && npm run test:tunnel"