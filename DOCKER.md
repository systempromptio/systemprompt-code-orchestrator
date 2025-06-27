# Docker Deployment Guide

This guide explains how to deploy the Coding Agent MCP Server using Docker with proper state persistence and security.

## Architecture

The Docker setup provides:
- **Non-root container execution** for security
- **Persistent state storage** using Docker volumes
- **Project workspace** for code execution
- **Proper signal handling** with tini
- **Environment-based configuration**

## Directory Structure

```
/data/
├── state/              # Persistent state storage
│   ├── tasks/         # Task definitions
│   ├── sessions/      # Session data
│   ├── logs/          # Execution logs
│   └── reports/       # Generated reports
└── projects/          # Code execution workspace
```

## Quick Start

### Development Mode

```bash
# Create local data directories
mkdir -p data/state data/projects

# Copy environment template
cp .env.example .env

# Start with development compose file
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop
docker-compose -f docker-compose.dev.yml down
```

### Production Mode

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your configuration

# Start services
docker-compose up -d

# View logs
docker-compose logs -f mcp-server

# Stop services
docker-compose down
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `STATE_PATH` | State storage path | `/data/state` (Docker), `./coding-agent-state` (local) |
| `PROJECTS_PATH` | Projects workspace | `/data/projects` |
| `JWT_SECRET` | JWT signing secret | Required for future auth |
| `ANTHROPIC_API_KEY` | Claude API key | Required for Claude integration |
| `GEMINI_API_KEY` | Gemini API key | Required for Gemini integration |

### Volume Configuration

#### Named Volume (Production)

```yaml
volumes:
  - coding-agent-state:/data/state
```

This creates a Docker-managed volume that persists across container restarts.

#### Bind Mount (Development)

```yaml
volumes:
  - ./data/state:/data/state
  - ./data/projects:/data/projects
```

This maps local directories for easier debugging and inspection.

## Security Considerations

1. **Non-root User**: The container runs as user `1000:1000` by default
2. **Read-only Docker Socket**: If mounted, the Docker socket is read-only
3. **Isolated Network**: Use Docker networks to isolate services
4. **Volume Permissions**: Ensure proper ownership of mounted volumes

### Setting User Permissions

```bash
# Set ownership for bind-mounted volumes
sudo chown -R 1000:1000 ./data

# Or run with your user ID
UID=$(id -u) GID=$(id -g) docker-compose up -d
```

## Backup and Restore

### Backing Up State

```bash
# Using Docker volumes
docker run --rm \
  -v coding-agent-state:/data/state \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/state-$(date +%Y%m%d-%H%M%S).tar.gz -C /data state

# Using bind mounts
tar czf backups/state-$(date +%Y%m%d-%H%M%S).tar.gz -C data state
```

### Restoring State

```bash
# Using Docker volumes
docker run --rm \
  -v coding-agent-state:/data/state \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/state-20240627-120000.tar.gz -C /data

# Using bind mounts
tar xzf backups/state-20240627-120000.tar.gz -C data
```

## Monitoring

### Health Check

```bash
# Check server health
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "service": "coding-agent-mcp-server",
  "transport": "http",
  "capabilities": {
    "mcp": true
  }
}
```

### Viewing Logs

```bash
# All logs
docker-compose logs -f

# Only MCP server logs
docker-compose logs -f mcp-server

# Last 100 lines
docker-compose logs --tail=100 mcp-server
```

### Monitoring State

```bash
# Check state directory size
docker exec mcp-server du -sh /data/state

# List recent tasks
docker exec mcp-server ls -la /data/state/tasks

# View task count
docker exec mcp-server find /data/state/tasks -name "*.json" | wc -l
```

## Troubleshooting

### Permission Denied Errors

If you see permission errors when writing to state:

```bash
# Check current permissions
ls -la data/

# Fix permissions (development)
sudo chown -R $(id -u):$(id -g) data/

# Fix permissions (production)
docker exec mcp-server chown -R appuser:appgroup /data
```

### State Not Persisting

1. Verify volume is mounted:
```bash
docker inspect mcp-server | grep -A 10 Mounts
```

2. Check write permissions:
```bash
docker exec mcp-server touch /data/state/test.txt
```

3. Verify environment variable:
```bash
docker exec mcp-server env | grep STATE_PATH
```

### Container Fails to Start

1. Check logs:
```bash
docker-compose logs mcp-server
```

2. Verify build:
```bash
docker-compose build --no-cache mcp-server
```

3. Check port availability:
```bash
lsof -i :3000
```

## Advanced Configuration

### Using External Databases

For production deployments with multiple instances:

1. **PostgreSQL** for state storage:
```yaml
environment:
  - STATE_TYPE=postgres
  - DATABASE_URL=postgresql://user:pass@db:5432/coding_agent
```

2. **Redis** for session management:
```yaml
environment:
  - SESSION_TYPE=redis
  - REDIS_URL=redis://redis:6379
```

### Scaling Horizontally

To run multiple instances:

```yaml
services:
  mcp-server:
    deploy:
      replicas: 3
    environment:
      - STATE_TYPE=postgres  # Shared state required
```

## Best Practices

1. **Regular Backups**: Schedule automated backups of the state volume
2. **Monitor Disk Usage**: State can grow over time, implement cleanup policies
3. **Log Rotation**: Configure Docker log rotation to prevent disk fill
4. **Health Monitoring**: Use monitoring tools to track server health
5. **Security Updates**: Regularly update base images and dependencies

## Docker Compose Override

For local customization without modifying the main file:

```yaml
# docker-compose.override.yml
version: '3.8'

services:
  mcp-server:
    ports:
      - "3001:3000"  # Different local port
    environment:
      - DEBUG=true
    volumes:
      - ./custom-data:/data/state
```

This file is automatically loaded and git-ignored.