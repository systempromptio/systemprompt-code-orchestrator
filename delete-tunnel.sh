#!/bin/bash

# Script to delete Cloudflare tunnel

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Delete Cloudflare Tunnel ===${NC}"

# Load config
if [ -f .cloudflare-config ]; then
    source .cloudflare-config
else
    echo -e "${RED}No Cloudflare configuration found${NC}"
    exit 1
fi

if [ -f .env ]; then
    source .env
else
    echo -e "${RED}No tunnel configuration found${NC}"
    exit 1
fi

if [ -z "$TUNNEL_ID" ]; then
    echo -e "${RED}No tunnel ID found${NC}"
    exit 1
fi

# Stop services
echo -e "${YELLOW}Stopping services...${NC}"
docker-compose down

# Get account ID
ACCOUNTS_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json")

ACCOUNT_ID=$(echo "$ACCOUNTS_RESPONSE" | jq -r '.result[0].id')

# Delete tunnel
echo -e "${YELLOW}Deleting tunnel: $TUNNEL_ID${NC}"

DELETE_RESPONSE=$(curl -s -X DELETE "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/tunnels/$TUNNEL_ID" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json")

if echo "$DELETE_RESPONSE" | jq -e '.success' >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Tunnel deleted successfully${NC}"
    
    # Clean up config
    rm -f .env .cloudflare-config
    echo -e "${GREEN}✓ Configuration cleaned up${NC}"
else
    echo -e "${RED}Failed to delete tunnel${NC}"
    echo "$DELETE_RESPONSE" | jq .
fi