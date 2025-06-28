# Host Bridge Daemon

A TypeScript daemon that bridges Docker containers to host CLI tools (Claude, Gemini, and more).

## Purpose

When running the MCP server in Docker, it cannot directly access CLI tools installed on the host machine. This daemon:

1. **Listens on port 9876** for commands from Docker containers
2. **Validates available tools** (Claude, Gemini, etc.)
3. **Executes CLI commands** securely on the host
4. **Streams results** back to the container

## Architecture

```
Docker Container (MCP Server)
    ↓ TCP Socket (port 9876)
Host Bridge Daemon (this service)
    ↓ Process spawn
CLI Tools (Claude, Gemini, etc.)
```

## Building

```bash
npm install
npm run build
```

## Running

The daemon is automatically started by the main project:
```bash
npm start  # From project root
```

To run manually:
```bash
npm start
```

## Environment Variables

- `CLAUDE_PATH` - Path to Claude CLI (auto-detected)
- `GEMINI_PATH` - Path to Gemini CLI (auto-detected)
- `SHELL_PATH` - Shell for execution (default: /bin/bash)
- `HOST_BRIDGE_PORT` - Port to listen on (default: 9876)

## Protocol

The daemon accepts JSON messages:

```json
{
  "tool": "claude",
  "command": "Create a hello world file",
  "workingDirectory": "/workspace"
}
```

Supported tools:
- `claude` - Claude CLI with proper flags
- `gemini` - Gemini CLI (when available)
- Additional tools can be added via environment variables

Responses are streamed back:
```json
{"type": "stream", "data": "..."}
{"type": "error", "data": "..."}
{"type": "complete", "code": 0}
```

## Security

- Only executes whitelisted tools
- Validates all paths before execution
- Runs with same permissions as daemon user
- No arbitrary command execution