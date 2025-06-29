# Internet Tunnel Setup Guide

This guide explains how to expose your local MCP server to the internet using Cloudflare Tunnel.

## Prerequisites

- Node.js 18+
- Docker and docker-compose
- Working MCP server setup

## Quick Start

1. **Run setup** (if not already done):
   ```bash
   npm run setup
   ```
   This will automatically install cloudflared if not present.

2. **Start server with tunnel**:
   ```bash
   npm run tunnel
   ```

3. **You'll see output like**:
   ```
   ✅ Tunnel established: https://example-random.trycloudflare.com
   🌍 Your server is now accessible from the internet!
   🔗 Public URL: https://example-random.trycloudflare.com
   📡 MCP Endpoint: https://example-random.trycloudflare.com/mcp
   ```

## Testing the Tunnel

### Quick tunnel test:
```bash
cd e2e-test
npm run test:tunnel
```

### Run full test suite against remote URL:
```bash
# Method 1: After starting tunnel, the URL is auto-detected
cd e2e-test
TUNNEL_MODE=true npm test

# Method 2: Specify URL directly
MCP_BASE_URL=https://your-tunnel.trycloudflare.com npm test

# Method 3: Full automated test
./test-tunnel-final.sh
```

## How It Works

1. **Cloudflare Tunnel**: Creates a secure tunnel from Cloudflare's edge to your local server
2. **Automatic URL Detection**: Tests automatically detect tunnel URLs from:
   - `.tunnel-url` file (created when tunnel starts)
   - `TUNNEL_URL` environment variable
   - `MCP_BASE_URL` environment variable

3. **Environment Propagation**: The tunnel URL is passed to:
   - Docker containers via environment variables
   - Test suites for remote testing
   - Any tools that need the public URL

## Manual Testing

You can test the tunnel manually:

```bash
# Health check
curl https://your-tunnel.trycloudflare.com/health

# Server info
curl https://your-tunnel.trycloudflare.com/

# Use with MCP Inspector
npx @modelcontextprotocol/inspector https://your-tunnel.trycloudflare.com/mcp
```

## Environment Variables

- `TUNNEL_URL`: The public URL of your tunnel (set automatically)
- `TUNNEL_ENABLED`: Set to "true" when tunnel is active
- `PUBLIC_URL`: Same as TUNNEL_URL, for compatibility
- `TUNNEL_MODE`: Set to "true" to enable tunnel mode in tests

## Troubleshooting

### Tunnel won't start
- Ensure cloudflared is installed: `which cloudflared`
- Check if port 3010 is available: `lsof -i :3010`
- Try manual install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

### Tests can't connect
- Verify tunnel URL is accessible: `curl https://your-tunnel.trycloudflare.com/health`
- Check `.tunnel-url` file exists and contains valid URL
- Ensure Docker containers have restarted with tunnel environment

### Performance issues
- Cloudflare tunnels add some latency
- For production use, consider Cloudflare Tunnel with authentication
- Free tunnels are rate-limited and temporary

## Security Notes

⚠️ **WARNING**: The free Cloudflare tunnel exposes your server to the internet without authentication!

- Only use for testing and development
- The URL changes each time you restart
- Anyone with the URL can access your server
- For production, use authenticated Cloudflare Tunnels

## Advanced Usage

### Custom tunnel configuration
Create a `cloudflared.yml` for persistent configuration:
```yaml
tunnel: your-tunnel-name
credentials-file: /path/to/credentials.json
ingress:
  - hostname: your-domain.com
    service: http://localhost:3010
  - service: http_status:404
```

### Using with CI/CD
```yaml
# GitHub Actions example
- name: Start MCP with tunnel
  run: |
    npm run tunnel &
    sleep 10
    TUNNEL_URL=$(cat .tunnel-url)
    echo "TUNNEL_URL=$TUNNEL_URL" >> $GITHUB_ENV
    
- name: Run remote tests
  run: |
    cd e2e-test
    MCP_BASE_URL=${{ env.TUNNEL_URL }} npm test
```

## Alternative Tunnel Providers

While this setup uses Cloudflare, you can also use:
- **ngrok**: Popular, requires account for persistent URLs
- **localtunnel**: Free, simple, less reliable
- **serveo**: SSH-based, no install needed
- **bore**: Rust-based, self-hostable

To use alternatives, modify the `start-tunnel.ts` script accordingly.