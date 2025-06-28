# Scripts Directory

This directory contains TypeScript utility scripts for managing the systemprompt-coding-agent project.

## Scripts

### start-all.ts
- **Purpose**: Unified startup script that validates environment, builds the proxy, and starts all services
- **Usage**: `npm start` (from root directory)
- **Features**:
  - Validates environment variables
  - Detects Claude CLI and Docker
  - Builds TypeScript proxy
  - Starts proxy server
  - Launches Docker services with validated environment

### stop-all.ts  
- **Purpose**: Gracefully stops all services
- **Usage**: `npm run stop:all` (from root directory)
- **Features**:
  - Stops Docker containers
  - Terminates proxy server
  - Cleans up PID files

### detect-tools.ts
- **Purpose**: Detects available CLI tools (Claude, Gemini) and their paths
- **Usage**: `node build/scripts/detect-tools.js`
- **Features**:
  - Finds Claude and Gemini CLI tools
  - Tests if tools are executable
  - Detects working shell path

### setup.sh
- **Purpose**: Cloudflare Tunnel setup script (specific to deployment)
- **Usage**: `./scripts/setup.sh` (when setting up Cloudflare tunnel)
- **Note**: This is different from the root `setup.sh` which sets up the entire project

## Building Scripts

All TypeScript scripts are compiled to the `build/scripts` directory:

```bash
npm run build:scripts
```

## Archived Scripts

Old CommonJS and shell script versions have been moved to `scripts/archive/` for reference.
These include:
- claude-host-proxy.cjs
- claude-host-proxy-streaming.cjs  
- start-services.cjs
- stop-services.cjs
- host-claude.sh

These have been replaced by the TypeScript proxy in `/proxy` and the TypeScript scripts above.