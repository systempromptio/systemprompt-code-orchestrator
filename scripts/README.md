# Scripts Directory

This directory contains essential TypeScript scripts for managing the Systemprompt Coding Agent MCP Server.

## Core Scripts

### Service Management
- **start-all.ts** - Main startup script that validates environment, builds code, starts daemon and Docker services
- **stop-all.ts** - Gracefully shuts down all services (Docker and daemon)
- **status.ts** - Checks the health and status of all system components

### Setup & Configuration
- **setup.ts** - Initial project setup, installs dependencies, configures environment
- **detect-tools.ts** - Detects available CLI tools (Claude, Gemini, etc.)

### Tunnel Support
- **start-tunnel.ts** - Starts services with Cloudflare tunnel for remote access
- **tunnel-status.ts** - Checks tunnel connection status and health
- **test-tunnel-integrated.ts** - Integrated test runner for tunnel functionality

### Internal Components
- **daemon-control.ts** - Manages the host bridge daemon lifecycle
- **docker-entrypoint.ts** - Docker container initialization script

## Usage

All scripts are compiled to JavaScript and run via npm scripts defined in package.json:

```bash
npm run setup        # Initial setup
npm run start        # Start all services
npm run stop         # Stop all services
npm run status       # Check system status
npm run tunnel       # Start with tunnel
npm run tunnel:status # Check tunnel status
npm run test:tunnel  # Test tunnel connection
```

## Archive Directory

The `archive/` subdirectory contains legacy CommonJS implementations preserved for reference during the TypeScript migration.