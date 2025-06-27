# Scripts

This directory contains setup and utility scripts for the Coding Agent MCP Server.

## setup.sh

The main setup script that configures your MCP server with HTTPS access via Cloudflare Tunnel.

### What it does:
1. Prompts for Cloudflare API token
2. Asks for your project directory path
3. Creates a secure tunnel automatically
4. Configures Docker containers
5. Mounts your project directory for code access
6. Provides a public HTTPS URL

### Usage:
```bash
# From project root
./scripts/setup.sh
```

### Prerequisites:
- Docker must be running
- Cloudflare account (free)
- API token with permissions:
  - `Account > Account:Read`
  - `Account > Cloudflare Tunnel:Edit`

### Created files:
- `.cloudflare-config` - Stores API credentials
- `.env` - Environment configuration
- `docker-compose.yml` - Docker services
- `cleanup.sh` - Cleanup script

## cleanup.sh

Generated during setup. Removes the Cloudflare tunnel and cleans up configuration files.

```bash
./cleanup.sh
```