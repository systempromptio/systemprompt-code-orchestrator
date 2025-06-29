# Orchestrator Tools Development and Testing Guide

## Overview

The Orchestrator tools (`create-task`, `update-task`, `end-task`) provide a complete task lifecycle management system for the Systemprompt Coding Agent. These tools enable creating AI-assisted coding tasks, updating them with new instructions, and properly completing them with comprehensive reports.

## Architecture Overview

### Key Components

1. **MCP Server (Docker)**: Receives tool requests and validates parameters
2. **Daemon (Host)**: Executes git operations and spawns AI agents on the host machine
3. **AI Agents (Claude/Gemini)**: Perform the actual coding tasks in isolated git branches
4. **TaskStore**: Persistent storage for task records and logs

### Task Lifecycle

```
create-task → (git branch) → (start agent) → (initial instructions)
     ↓
update-task → (send new instructions) → (log progress)
     ↓
end-task → (final commands) → (save logs) → (generate report) → (terminate agent)
```

## Development Guide

### 1. Create Task Tool (`create-task.ts`)

#### Purpose
Creates a new task with an AI agent (Claude or Gemini) in an isolated git branch.

#### Key Features to Implement
- **Unique Branch Names**: Include timestamps to prevent collisions
- **Git State Management**: Stash uncommitted changes before switching branches
- **Agent Session Tracking**: Link agent sessions to tasks for monitoring
- **Error Recovery**: Clean up resources if initialization fails

#### Implementation Requirements

```typescript
// Example implementation pattern
async function handleCreateTask(params) {
  // 1. Validate parameters
  if (!params.tool || !['CLAUDECODE', 'GEMINI'].includes(params.tool)) {
    throw new Error('Invalid tool specified');
  }

  // 2. Create task record
  const task = await createTask({
    title: params.title,
    description: params.description,
    tool: params.tool,
    branch: params.branch || `task-${Date.now()}`
  });

  // 3. Setup git branch on host
  await daemon.execute({
    command: 'git stash && git checkout -b ${branch}',
    cwd: '/var/www/html/systemprompt-coding-agent'
  });

  // 4. Start AI agent
  const session = await startAgent({
    tool: params.tool,
    workingDirectory: '/var/www/html/systemprompt-coding-agent'
  });

  // 5. Send initial instructions
  if (params.instructions) {
    await session.sendMessage(params.instructions);
  }
}
```

### 2. Update Task Tool (`update-task.ts`)

#### Purpose
Sends new instructions to an active AI agent session.

#### Key Features to Implement
- **Session State Validation**: Only send to active/busy sessions
- **Progress Logging**: Track all instruction updates
- **Error Messages**: Provide clear feedback when sessions are unavailable

#### Implementation Requirements

```typescript
// Validate session states
const VALID_STATES = ['active', 'busy'];
const INVALID_STATES = {
  terminated: 'Session has already ended',
  error: 'Session is in error state',
  starting: 'Session is still initializing'
};

// Log all updates
await addTaskLog(taskId, {
  action: 'instruction_sent',
  instructions: params.instructions,
  timestamp: new Date()
});
```

### 3. End Task Tool (`end-task.ts`)

#### Purpose
Properly terminates tasks with comprehensive reporting and cleanup.

#### Key Features to Implement
- **Final Command Execution**: Optional last instructions before ending
- **Log Preservation**: Save all session output for analysis
- **Report Generation**: Create detailed metrics and summaries
- **Git Analysis**: Show code changes made during the task

#### Report Structure

```typescript
interface FinalReport {
  taskSummary: {
    id: string;
    title: string;
    duration: string; // "2h 15m 30s"
    status: 'completed' | 'failed' | 'cancelled';
  };
  executionMetrics: {
    totalCommands: number;
    errorCount: number;
    warningCount: number;
  };
  codeChanges: {
    filesModified: string[];
    filesCreated: string[];
    branch: string;
    commitCount: number;
  };
  logs: {
    summary: string;
    highlights: string[];
  };
}
```

## Testing Guide

### End-to-End Test Requirements

Based on the test prompt, your E2E test should verify:

1. **MCP Server Loading**: Verify the server starts and registers tools
2. **Tool Listing**: Confirm all orchestrator tools are available
3. **Task Creation**: Create a task with branch "test" and instructions to create "hello world" HTML
4. **Task Update**: Send new instructions to rename the file to "hello world two"
5. **Status Tracking**: Verify detailed logs at each stage
6. **Task Completion**: End the task and verify:
   - New git branch exists with the correct name
   - HTML file was created and renamed
   - Comprehensive logs are available
   - Final report shows accurate metrics