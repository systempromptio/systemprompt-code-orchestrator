# SystemPrompt Coding Agent Source Code

This directory contains the source code for the SystemPrompt Coding Agent MCP server. The server orchestrates Claude Code CLI and Gemini CLI sessions to perform complex coding tasks through a standardized protocol.

## Directory Structure

### Entry Points

- **`index.ts`** - Main executable entry point for running the server directly
- **`server.ts`** - HTTP server implementation that hosts MCP endpoints

### Core Directories

#### `/constants`
Static definitions including server configuration and metadata.

#### `/handlers`
Request handlers that implement the business logic for:
- Tool execution (task creation, agent management, status checks)
- Prompt handling
- Notifications and progress tracking
- Resource management

#### `/server`
HTTP server infrastructure including:
- MCP protocol endpoints
- Session management
- Middleware for security and validation

#### `/services`
Core service implementations:
- Agent management (Claude Code and Gemini CLI orchestration)
- Task management and execution
- State persistence
- Process management

#### `/types`
TypeScript type definitions for:
- Agent interfaces
- Task structures
- MCP protocol extensions
- Internal application types

#### `/utils`
Utility functions for:
- Logging
- Validation
- Helper functions

## Architecture Overview

The SystemPrompt Coding Agent follows a modular architecture:

1. **MCP Protocol Layer** - Handles communication with AI assistants
2. **Orchestration Layer** - Manages multiple coding agents
3. **Task Management** - Tracks and executes coding tasks
4. **State Persistence** - Maintains task and agent state

## Key Features

- Multi-agent orchestration (Claude Code CLI, Gemini CLI)
- Task tracking and management
- State persistence across sessions
- Real-time progress notifications
- Structured output handling

## Development

Run the server locally:
```bash
npm run build
npm start
```

For development with hot reload:
```bash
npm run watch
```