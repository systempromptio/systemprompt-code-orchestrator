# Tunnel Integration Guide

## Overview

The e2e tests now have built-in tunnel support, allowing you to test the MCP server through a public HTTPS URL via Cloudflare tunnel.

## How to Check Current Tunnel Status

```bash
# Check if a tunnel is running
npm run tunnel:status
```

This will show:
- Current tunnel URL (if running)
- Whether the tunnel is active
- Server status

## Getting the Current Tunnel URL

### Method 1: Check status
```bash
npm run tunnel:status
```

### Method 2: Read the file directly
```bash
cat .tunnel-url
```

### Method 3: Use the helper script
```bash
node get-tunnel-url.cjs
```

## Running Tests with Tunnel

### Option 1: Automatic (Recommended)
```bash
# From project root - starts tunnel automatically
npm run test:tunnel
```

### Option 2: Manual tunnel + auto-detect
```bash
# Terminal 1: Start tunnel
npm run tunnel

# Terminal 2: Run tests (auto-detects tunnel)
cd e2e-test
npm run test:tunnel
```

### Option 3: Explicit URL
```bash
# If you know the tunnel URL
cd e2e-test
MCP_BASE_URL="https://your-tunnel.trycloudflare.com" npm test
```

## How It Works

1. **Tunnel Detection**: Tests automatically check for:
   - `.tunnel-url` file (created when tunnel starts)
   - `TUNNEL_URL` environment variable
   - `MCP_BASE_URL` environment variable

2. **Connection Type**: Tests will show at startup:
   ```
   🌍 Using TUNNEL connection: https://example.trycloudflare.com
   # or
   📡 Using LOCAL connection: http://127.0.0.1:3000
   ```

3. **Automatic Tunnel**: `npm run test:tunnel` will:
   - Check if server is running
   - Start tunnel if needed
   - Run all tests through tunnel
   - Clean up when done

## Test Report Location

After running tests, check the latest report:
```bash
ls -la e2e-test/typescript/test-reports/
```

Example: `report-2025-06-29T11-14-44.md`

## Environment Variables

- `MCP_BASE_URL`: Override the server URL
- `TUNNEL_URL`: Tunnel URL (auto-set by scripts)
- `TUNNEL_MODE`: Enable tunnel detection

## Troubleshooting

### No tunnel detected
```bash
# Check status
npm run tunnel:status

# Start tunnel
npm run tunnel
```

### Connection refused
- Ensure Docker container is running: `docker ps`
- Check server health: `curl http://localhost:3000/health`

### Tunnel URL not working
- Tunnels expire after inactivity
- Start a fresh tunnel: `npm run tunnel`