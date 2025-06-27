# Cloudflare Tunnel Setup Guide

This guide explains how to set up HTTPS access for your MCP server using Cloudflare Tunnel.

## Prerequisites

- **Docker must be running** - Start Docker Desktop or Docker daemon before setup
- Docker Compose installed
- A Cloudflare account (free)
- An API token with proper permissions

## Creating a Cloudflare API Token

1. **Go to the API Tokens page:**
   https://dash.cloudflare.com/profile/api-tokens

2. **Click "Create Token"**

3. **Select "Create Custom Token"**

4. **Configure the token with these permissions:**
   
   | Permission | Access Level |
   |------------|--------------|
   | Account > Account | Read |
   | Account > Cloudflare Tunnel | Edit |

   ![Token Permissions](docs/token-permissions.png)

5. **Token settings:**
   - **Account Resources:** Include > All accounts (or select specific account)
   - **IP Filtering:** Optional (leave blank for any IP)
   - **TTL:** Optional (leave blank for no expiration)

6. **Continue to summary** and **Create Token**

7. **Copy the token** - you'll need it for setup (it won't be shown again)

## Quick Setup

Once you have your API token:

```bash
./setup.sh
```

The script will:
1. Ask for your API token (if not already configured)
2. Automatically fetch your account information
3. Create a Cloudflare tunnel
4. Configure Docker services
5. Start your MCP server with HTTPS

## What You Get

- **Instant HTTPS URL:** `https://[tunnel-id].cfargotunnel.com`
- **No port forwarding needed**
- **DDoS protection from Cloudflare**
- **Free SSL certificates**
- **Works behind any firewall/NAT**

## Configuration

The setup creates these files:

### `.cloudflare-config`
Stores your API credentials (protected with 600 permissions):
```bash
CF_API_TOKEN='your-api-token'
CF_ACCOUNT_ID='your-account-id'
```

### `.env`
Contains tunnel configuration and MCP settings:
```env
# Cloudflare Tunnel Configuration
TUNNEL_TOKEN=your-tunnel-token
TUNNEL_ID=your-tunnel-id
TUNNEL_URL=https://your-tunnel-id.cfargotunnel.com
TUNNEL_NAME=mcp-server-timestamp

# MCP Server Configuration
PORT=3000
NODE_ENV=production
```

### `docker-compose.yml`
Configured with both MCP server and Cloudflare tunnel containers.

## Management Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Complete cleanup (removes tunnel)
./cleanup.sh
```

## Troubleshooting

### "Cannot connect to the Docker daemon"
Docker must be running before you run the setup script:
- **macOS/Windows:** Start Docker Desktop
- **Linux:** Start Docker daemon with `sudo systemctl start docker`

### "Failed to get account information"
Your API token needs the `Account > Account:Read` permission. Create a new token with both required permissions.

### "Failed to create tunnel"
Ensure your API token has `Account > Cloudflare Tunnel:Edit` permission.

### Services not starting
Check Docker logs:
```bash
docker-compose logs cloudflared
docker-compose logs mcp-server
```

### Can't access the URL
1. Wait 30-60 seconds after starting for tunnel to initialize
2. Check that both containers are running: `docker-compose ps`
3. Verify the tunnel is active in Cloudflare dashboard

## Security Notes

- The `.cloudflare-config` file contains sensitive credentials - keep it secure
- Never commit `.cloudflare-config` or `.env` to version control
- The tunnel token in `.env` is specific to this tunnel instance
- Each tunnel gets a unique URL that can't be guessed

## Distribution

To share this setup:
1. Include all files except `.cloudflare-config` and `.env`
2. Each user runs `./setup.sh` with their own API token
3. Each user gets their own unique tunnel URL

## Advanced Options

### Custom Domain (Future Enhancement)
To use a custom domain instead of `.cfargotunnel.com`:
1. Add `Zone > DNS:Edit` permission to your API token
2. Run setup with domain flag (when implemented)
3. Configure DNS routing in Cloudflare dashboard

### Multiple Environments
You can run multiple instances by:
1. Using different directories
2. Changing the `TUNNEL_NAME` prefix in the script
3. Using different ports in `.env`

## API Token Best Practices

1. **Use minimal permissions** - Only grant what's needed
2. **Set IP restrictions** if you have a static IP
3. **Use token expiration** for temporary setups
4. **Store tokens securely** - Never in code or public repos
5. **Rotate tokens regularly** for production use

## Support

For issues:
1. Check Cloudflare Tunnel status: https://dash.cloudflare.com/tunnels
2. Review API token permissions
3. Check container logs
4. Verify network connectivity