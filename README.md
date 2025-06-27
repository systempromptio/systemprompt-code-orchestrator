# Coding Agent MCP Server

MCP server for orchestrating Claude Code CLI and Gemini CLI sessions to perform coding tasks. No authentication required - the server exposes a public MCP endpoint.

## Prerequisites

- **Docker must be running** (Docker Desktop on macOS/Windows, or Docker daemon on Linux)
- Docker Compose installed
- (Optional) Cloudflare account for HTTPS exposure

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run locally
node build/index.js
```

The server will start on port 3000 with the MCP endpoint available at `http://localhost:3000/mcp`.

### Docker Deployment

```bash
# Build and run with Docker
docker-compose up -d
```

## Core Tools

1. **create_task** - Create a new coding task and optionally start it immediately
2. **update_task** - Send commands to an active task and update its status
3. **end_task** - Complete a task, save logs, and generate reports
4. **report_task** - Generate reports on task progress and outcomes
5. **update_stats** - Get current statistics on tasks and sessions

See [CODING-AGENT.md](CODING-AGENT.md) for detailed tool documentation.

## Features

- **Task Orchestration** - Create and manage coding tasks
- **AI Integration** - Works with Claude Code CLI and Gemini CLI
- **Session Management** - Handles multiple concurrent sessions
- **State Persistence** - Tasks survive server restarts
- **Simple API** - Just 5 core tools for task management
- **No Authentication** - Public MCP endpoint for easy integration

## Commands

```bash
# Initial setup (do this first)
./scripts/setup.sh

# View logs
docker-compose logs -f

# Stop server
docker-compose down

# Restart server
docker-compose restart

# Complete cleanup (removes tunnel)
./cleanup.sh
```

## How It Works

1. Uses Cloudflare API to create a secure tunnel
2. Configures Docker containers for MCP server + tunnel
3. Routes HTTPS traffic through Cloudflare's network
4. Provides instant public access without exposing your IP

## Project Structure

```
.
├── setup.sh              # Main setup script
├── cleanup.sh            # Cleanup script (created by setup)
├── docker-compose.yml    # Docker configuration
├── Dockerfile            # MCP server image
├── CLOUDFLARE-SETUP.md   # Detailed setup guide
└── src/                  # MCP server source code
```

## Configuration Files

After setup, these files are created:

- `.cloudflare-config` - API credentials (keep secure!)
- `.env` - Tunnel configuration, project path, and MCP settings
- `docker-compose.yml` - Docker services configuration

## Project Directory Access

The MCP server has access to your specified project directory:
- Your local path is mounted as `/workspace` in the container
- The server can read, write, and execute files in this directory
- Docker socket is also mounted for Docker command execution

## Troubleshooting

### Docker not running?
- **macOS/Windows:** Start Docker Desktop
- **Linux:** `sudo systemctl start docker`

### Other issues?
See [CLOUDFLARE-SETUP.md](CLOUDFLARE-SETUP.md) for detailed troubleshooting.

## Security

- API tokens are stored locally with restricted permissions
- All traffic is encrypted via HTTPS
- No direct access to your server - traffic goes through Cloudflare
- Each tunnel has a unique, unguessable URL

## Distribution

To share this MCP server:
1. Include all files except `.cloudflare-config` and `.env`
2. Each user runs `./setup.sh` with their own API token
3. Each user gets their own unique secure tunnel

## License

MIT