# Services

This directory contains the core service implementations for the SystemPrompt Coding Agent.

## Overview

Services manage the core functionality of the coding agent orchestrator:
- Agent lifecycle management
- Task execution and tracking
- State persistence
- Process communication

## Service Architecture

### Agent Services

#### `agent-manager.ts`
Central manager for all coding agents:
- Manages Claude Code and Gemini CLI instances
- Handles agent allocation for tasks
- Monitors agent health and availability
- Provides failover and retry logic

#### `claude-code-service.ts`
Claude Code CLI integration:
- Spawns and manages Claude Code processes
- Handles command execution
- Parses Claude Code output
- Manages Claude-specific configurations

#### `gemini-cli-service.ts`
Gemini CLI integration:
- Manages Gemini CLI processes
- Executes Gemini commands
- Handles Gemini-specific features

#### `claude-code-host-executor.ts`
Host executor for Claude Code:
- Manages Claude Code execution environment
- Handles host-specific operations

### Task Management

#### `task-manager.ts`
Orchestrates task execution:
- Creates and assigns tasks to agents
- Monitors task progress
- Handles task cancellation
- Manages task queuing

#### `task-store.ts`
In-memory task storage:
- Stores active tasks
- Provides task queries
- Manages task state transitions

### State Management

#### `state-persistence.ts`
Persistent state management:
- Saves task state to disk
- Restores state on restart
- Handles state migrations

## Service Patterns

### Agent Lifecycle
```typescript
1. Agent requested for task
2. AgentManager allocates available agent
3. Agent executes task
4. Agent reports completion
5. Agent returned to pool
```

### Task Execution Flow
```typescript
1. Task created via MCP tool
2. TaskManager assigns to agent
3. Agent executes task
4. Progress reported via notifications
5. Results stored in TaskStore
6. State persisted to disk
```

## Error Handling

Services implement robust error handling:
- Process failures trigger automatic retry
- Failed agents are restarted
- Tasks can be reassigned to healthy agents
- All errors logged with context

## Adding New Services

To add a new service:

1. Create service class in this directory
2. Implement standard lifecycle methods
3. Add to dependency injection
4. Document service patterns
5. Add appropriate tests

## Service Configuration

Services can be configured via environment variables:
- `MAX_CONCURRENT_AGENTS` - Maximum agents to run
- `TASK_TIMEOUT` - Default task timeout
- `STATE_PERSIST_INTERVAL` - State save frequency

## Monitoring

Services expose metrics for monitoring:
- Active agent count
- Task queue length
- Success/failure rates
- Average task duration

## Testing Services

When testing services:
- Mock external processes
- Test error scenarios
- Verify state persistence
- Check resource cleanup
- Monitor memory usage