# Coding Agent MCP Server

An orchestrator MCP server for managing Claude Code CLI and Gemini CLI sessions to perform coding tasks.

## Overview

This MCP server provides high-level orchestration for AI-powered coding agents. It manages tasks and sessions, allowing you to:

- Create and manage coding tasks
- Assign tasks to Claude Code or Gemini CLI
- Track task progress and status
- Generate reports on completed work
- Maintain persistent state across sessions

## Core Tools

The server implements 5 core tools:

### 1. `create_task`
Create a new coding task and optionally start it immediately.

```json
{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication to the API",
  "model": "claude",
  "command": "Implement JWT authentication for the Express API",
  "project_path": "/path/to/project",
  "priority": "high",
  "start_immediately": true
}
```

### 2. `update_task`
Send commands to an active task and update its status.

```json
{
  "task_id": "task_12345",
  "command": "Add password hashing using bcrypt",
  "update": {
    "progress": 50,
    "add_log": "Implemented user model with password hashing"
  }
}
```

### 3. `end_task`
Complete a task, save logs, and generate reports.

```json
{
  "task_id": "task_12345",
  "status": "completed",
  "summary": "Successfully implemented JWT authentication with bcrypt password hashing",
  "generate_report": true
}
```

### 4. `report_task`
Generate reports on task progress and outcomes.

```json
{
  "task_ids": ["task_12345", "task_67890"],
  "report_type": "detailed",
  "format": "markdown"
}
```

### 5. `update_stats`
Get current statistics on tasks and sessions.

```json
{
  "include_tasks": true,
  "include_sessions": true
}
```

## Architecture

The server acts as an orchestrator that:
- Manages task lifecycle (create, update, complete)
- Handles session management for Claude Code and Gemini CLI
- Persists state to survive restarts
- Provides unified interface for both AI assistants

## State Persistence

Task state is persisted to `/data/coding-agent-state` in the Docker container, ensuring tasks survive container restarts.

## Setup

1. Configure environment variables in `.env`:
   ```bash
   ANTHROPIC_API_KEY=your_key_here
   GEMINI_API_KEY=your_key_here
   JWT_SECRET=your_secret_here
   ```

2. Build and run with Docker:
   ```bash
   docker-compose up -d
   ```

3. The server will be available on port 3000.

## Integration

This server is designed to be used with MCP-compatible clients that can:
- Create high-level coding tasks
- Send incremental commands to AI agents
- Monitor progress and retrieve results

The actual code generation and file manipulation is handled by the Claude Code CLI and Gemini CLI - this server orchestrates their usage.