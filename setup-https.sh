#!/bin/bash

# MCP Server HTTPS Setup with Cloudflare Tunnel

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== MCP Server HTTPS Setup ===${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.example .env 2>/dev/null || echo "CLOUDFLARED_TOKEN=" > .env
fi

# Check if token is set
if ! grep -q "^CLOUDFLARED_TOKEN=.+" .env; then
    echo -e "${RED}Cloudflare Tunnel token not found!${NC}"
    echo ""
    echo -e "${YELLOW}To set up HTTPS access:${NC}"
    echo ""
    echo "1. Go to https://one.dash.cloudflare.com/"
    echo "2. Navigate to Networks > Tunnels"
    echo "3. Click 'Create a tunnel'"
    echo "4. Choose 'Cloudflared' and name your tunnel"
    echo "5. Copy the token from the setup page"
    echo "6. Run: echo 'CLOUDFLARED_TOKEN=your-token-here' >> .env"
    echo "7. Run this script again"
    echo ""
    exit 1
fi

# Build and start services
echo -e "${BLUE}Building and starting services...${NC}"
docker-compose up -d --build

# Wait for services to start
echo -e "${YELLOW}Waiting for services to initialize...${NC}"
sleep 5

# Show tunnel info
echo ""
echo -e "${GREEN}✓ Services started successfully!${NC}"
echo ""
echo -e "${BLUE}Your MCP server is now accessible via HTTPS${NC}"
echo -e "${YELLOW}Check your tunnel URL at:${NC}"
echo "https://one.dash.cloudflare.com/ > Networks > Tunnels > Your tunnel name"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  View logs:    docker-compose logs -f"
echo "  Stop:         docker-compose down"
echo "  Restart:      docker-compose restart"
echo ""