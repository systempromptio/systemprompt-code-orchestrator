#!/bin/bash

# Cloudflare Tunnel Setup using API
# No browser needed - pure API approach

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== MCP Server HTTPS Setup ===${NC}"
echo ""

# Load existing config
load_config() {
    if [ -f .cloudflare-config ]; then
        source .cloudflare-config
    fi
    
    # Check .env.example for token
    if [ -z "$CF_API_TOKEN" ] && [ -f .env.example ]; then
        if grep -q "CLOUDFLARE_TOKEN=" .env.example; then
            CF_API_TOKEN=$(grep "CLOUDFLARE_TOKEN=" .env.example | cut -d'=' -f2)
        fi
    fi
}

# Setup API credentials
setup_credentials() {
    if [ -z "$CF_API_TOKEN" ]; then
        echo -e "${YELLOW}Cloudflare API Token not found.${NC}"
        echo ""
        echo "To create an API token:"
        echo "1. Go to https://dash.cloudflare.com/profile/api-tokens"
        echo "2. Click 'Create Token'"
        echo "3. Use 'Custom token' with these permissions:"
        echo "   - Account > Account:Read"
        echo "   - Account > Cloudflare Tunnel:Edit"
        echo ""
        read -p "Enter your Cloudflare API Token: " CF_API_TOKEN
        
        if [ -z "$CF_API_TOKEN" ]; then
            echo -e "${RED}Token is required${NC}"
            exit 1
        fi
        
        echo "CF_API_TOKEN='$CF_API_TOKEN'" > .cloudflare-config
        chmod 600 .cloudflare-config
    fi
    
    # Verify token
    echo -e "${BLUE}Verifying API token...${NC}"
    
    VERIFY_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
        -H "Authorization: Bearer $CF_API_TOKEN" \
        -H "Content-Type: application/json")
    
    if ! echo "$VERIFY_RESPONSE" | jq -e '.success' >/dev/null 2>&1; then
        echo -e "${RED}Invalid API token!${NC}"
        echo "$VERIFY_RESPONSE" | jq .
        rm -f .cloudflare-config
        exit 1
    fi
    
    echo -e "${GREEN}✓ API token verified${NC}"
    
    # Get account ID automatically
    if [ -z "$CF_ACCOUNT_ID" ]; then
        echo -e "${BLUE}Getting account information...${NC}"
        
        ACCOUNTS_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts" \
            -H "Authorization: Bearer $CF_API_TOKEN" \
            -H "Content-Type: application/json")
        
        if ! echo "$ACCOUNTS_RESPONSE" | jq -e '.success' >/dev/null 2>&1; then
            echo -e "${RED}Failed to get account information${NC}"
            echo "$ACCOUNTS_RESPONSE" | jq .
            echo ""
            echo -e "${YELLOW}Make sure your API token has these permissions:${NC}"
            echo "  - Account > Account:Read"
            echo "  - Account > Cloudflare Tunnel:Edit"
            exit 1
        fi
        
        CF_ACCOUNT_ID=$(echo "$ACCOUNTS_RESPONSE" | jq -r '.result[0].id')
        
        if [ -z "$CF_ACCOUNT_ID" ] || [ "$CF_ACCOUNT_ID" == "null" ]; then
            echo -e "${RED}No account found${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✓ Account ID: $CF_ACCOUNT_ID${NC}"
        echo "CF_ACCOUNT_ID='$CF_ACCOUNT_ID'" >> .cloudflare-config
    fi
}

# Create tunnel using API
create_tunnel() {
    TUNNEL_NAME="mcp-server-$(date +%s)"
    echo -e "${BLUE}Creating tunnel: $TUNNEL_NAME${NC}"
    
    # Generate a tunnel secret
    TUNNEL_SECRET=$(openssl rand -base64 32)
    
    # Create tunnel with API
    CREATE_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/tunnels" \
        -H "Authorization: Bearer $CF_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$TUNNEL_NAME\",
            \"tunnel_secret\": \"$TUNNEL_SECRET\"
        }")
    
    if ! echo "$CREATE_RESPONSE" | jq -e '.success' >/dev/null 2>&1; then
        echo -e "${RED}Failed to create tunnel${NC}"
        echo "$CREATE_RESPONSE" | jq .
        exit 1
    fi
    
    TUNNEL_ID=$(echo "$CREATE_RESPONSE" | jq -r '.result.id')
    TUNNEL_TOKEN=$(echo "$CREATE_RESPONSE" | jq -r '.result.token')
    
    echo -e "${GREEN}✓ Tunnel created: $TUNNEL_ID${NC}"
    
    # The tunnel URL
    TUNNEL_URL="https://${TUNNEL_ID}.cfargotunnel.com"
    echo -e "${GREEN}✓ Tunnel URL: $TUNNEL_URL${NC}"
}

# Get project directory
get_project_directory() {
    echo -e "${BLUE}Setting up project directory access...${NC}"
    echo -e "${YELLOW}The MCP server needs access to your project files.${NC}"
    echo "Enter the path to your projects directory (e.g., /home/user/projects):"
    
    read -p "Project directory path: " PROJECT_DIR
    
    # Expand ~ to home directory
    PROJECT_DIR="${PROJECT_DIR/#\~/$HOME}"
    
    # Make absolute path
    if [[ ! "$PROJECT_DIR" = /* ]]; then
        PROJECT_DIR="$(pwd)/$PROJECT_DIR"
    fi
    
    # Check if directory exists
    if [ ! -d "$PROJECT_DIR" ]; then
        echo -e "${YELLOW}Directory doesn't exist. Create it? (y/n)${NC}"
        read -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            mkdir -p "$PROJECT_DIR"
            echo -e "${GREEN}✓ Created directory: $PROJECT_DIR${NC}"
        else
            echo -e "${RED}Directory must exist to continue${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✓ Project directory: $PROJECT_DIR${NC}"
}

# Save configuration
save_config() {
    cat > .env << EOF
# Cloudflare Tunnel Configuration
TUNNEL_TOKEN=$TUNNEL_TOKEN
TUNNEL_ID=$TUNNEL_ID
TUNNEL_URL=$TUNNEL_URL
TUNNEL_NAME=$TUNNEL_NAME

# MCP Server Configuration
PORT=3000
NODE_ENV=production

# Project Directory (mounted to container)
PROJECT_DIR=$PROJECT_DIR

# Add your Coding Agent configuration below:
# ANTHROPIC_API_KEY=
# GEMINI_API_KEY=
EOF
    
    echo -e "${GREEN}✓ Configuration saved to .env${NC}"
}

# Update docker-compose
update_docker_compose() {
    # Backup existing if needed
    if [ -f docker-compose.yml ] && [ ! -f docker-compose.yml.backup ]; then
        cp docker-compose.yml docker-compose.yml.backup
    fi
    
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mcp-server:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - PROJECT_ROOT=/workspace
    env_file:
      - .env
    volumes:
      # Mount project directory
      - ${PROJECT_DIR}:/workspace:rw
      # Optional: Mount Docker socket for Docker commands
      - /var/run/docker.sock:/var/run/docker.sock
    working_dir: /workspace
    restart: unless-stopped

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run --token ${TUNNEL_TOKEN}
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    network_mode: "host"
    depends_on:
      - mcp-server
    restart: unless-stopped
EOF
    
    echo -e "${GREEN}✓ Docker configuration updated${NC}"
}

# Start services
start_services() {
    echo -e "${BLUE}Starting services...${NC}"
    
    docker-compose down 2>/dev/null || true
    docker-compose up -d --build
    
    # Wait for services
    echo -e "${YELLOW}Waiting for services to start...${NC}"
    sleep 5
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        echo -e "${GREEN}✓ Services started successfully${NC}"
    else
        echo -e "${RED}Services may not have started correctly${NC}"
        echo "Check logs with: docker-compose logs"
    fi
}

# Create cleanup script
create_cleanup_script() {
    cat > cleanup.sh << 'EOF'
#!/bin/bash
source .env 2>/dev/null
source .cloudflare-config 2>/dev/null

if [ -z "$TUNNEL_ID" ] || [ -z "$CF_API_TOKEN" ] || [ -z "$CF_ACCOUNT_ID" ]; then
    echo "Missing configuration. Cannot cleanup."
    exit 1
fi

echo "Stopping services..."
docker-compose down

echo "Deleting tunnel: $TUNNEL_ID"
curl -s -X DELETE "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/tunnels/$TUNNEL_ID" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json"

echo "Cleaning up files..."
rm -f .env .cloudflare-config

echo "Cleanup complete!"
EOF
    
    chmod +x cleanup.sh
    echo -e "${GREEN}✓ Created cleanup script: ./cleanup.sh${NC}"
}

# Main function
main() {
    echo -e "${YELLOW}This will set up HTTPS access for your MCP server using Cloudflare Tunnel${NC}"
    echo -e "${YELLOW}No browser needed - pure API setup${NC}"
    echo ""
    
    load_config
    setup_credentials
    get_project_directory
    create_tunnel
    save_config
    update_docker_compose
    start_services
    create_cleanup_script
    
    echo ""
    echo -e "${GREEN}=== Setup Complete! ===${NC}"
    echo ""
    echo -e "${BLUE}Your MCP server is accessible at:${NC}"
    echo -e "${GREEN}${TUNNEL_URL}${NC}"
    echo ""
    echo -e "${YELLOW}Project directory mounted:${NC} $PROJECT_DIR → /workspace"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  View logs:     docker-compose logs -f"
    echo "  Stop:          docker-compose down"
    echo "  Cleanup:       ./cleanup.sh"
    echo ""
    echo -e "${YELLOW}Note:${NC} The MCP server can access files in your project directory"
}

# Run main
main