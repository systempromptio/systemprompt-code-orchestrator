# Systemprompt Coding Agent - Architecture Documentation

## Fundamental Architecture: Host-Daemon-Docker Bridge

### Overview

The Systemprompt Coding Agent uses a three-tier architecture:

1. **Host Machine**: Where the actual project files and git repositories exist
2. **Daemon (Host Bridge)**: A Node.js process running on the host that acts as a bridge
3. **Docker Container (MCP Server)**: The isolated environment running the MCP protocol server

### Critical Design Principle: Git Operations on Host

**IMPORTANT**: All git operations and file manipulations MUST happen on the host machine through the daemon, NOT inside the Docker container.

### Branch-Based Task Execution Flow

When a task is created with a specific branch:

1. **Task Creation (Docker → Daemon)**
   - MCP server receives `create_task` with branch parameter
   - MCP server requests daemon to prepare the environment

2. **Environment Preparation (Daemon on Host)**
   - Daemon executes on the HOST machine:
     ```bash
     cd /path/to/project  # Navigate to project root on HOST
     git stash           # Save any uncommitted changes
     git checkout -b feature-branch  # Create/switch to the branch
     ```

3. **Agent Process Creation (Daemon on Host)**
   - Daemon spawns Claude/Gemini process IN THE SAME SHELL SESSION
   - This ensures the AI agent operates on the correct branch
   - Working directory is set to the project root on HOST

4. **Task Execution (AI Agent on Host)**
   - Claude/Gemini runs with the checked-out branch
   - All file operations happen directly on HOST filesystem
   - Changes are made to the actual project files

5. **Task Completion**
   - Changes remain on the feature branch
   - User can review, commit, and push as needed

### Why This Architecture?

1. **Docker Container Isolation**: The MCP server runs in Docker for consistency and isolation
2. **No Git in Docker**: Docker container has no git - it's just the protocol server
3. **Host File Access**: Daemon provides controlled access to host filesystem
4. **Branch Isolation**: Each task can work on its own git branch
5. **Real File Changes**: AI agents modify actual project files, not container copies

### Implementation Details

#### Daemon Responsibilities
- Execute shell commands on host (git, file operations)
- Spawn AI agent processes (claude, gemini) with proper environment
- Maintain working directory context
- Stream output back to Docker container

#### Docker Container Responsibilities
- Run MCP protocol server
- Handle client connections
- Validate requests
- Delegate execution to daemon

#### Communication Flow
```
Client → MCP Server (Docker) → Daemon (Host) → AI Agent Process (Host)
                                      ↓
                                Git Repository (Host)
```

### Key Code Locations

- **Daemon**: `/daemon/src/host-bridge-daemon.ts`
- **Create Task Handler**: `/src/handlers/tools/orchestrator/create-task.ts`
- **Agent Manager**: `/src/services/agent-manager.ts`

### Testing

E2E tests must verify:
1. Branch is created on host before agent starts
2. Agent process runs in the context of that branch
3. File changes appear in the correct branch
4. Git status shows changes in the expected branch

### Common Pitfalls to Avoid

1. **DON'T** try to run git commands inside Docker container
2. **DON'T** copy files between Docker and host unnecessarily  
3. **DON'T** assume Docker container has access to git state
4. **DO** always use daemon for host operations
5. **DO** verify branch context before starting agents
6. **DO** maintain clear separation of concerns

### Example Task Flow

```typescript
// 1. Task created with branch
create_task({
  tool: "CLAUDECODE",
  branch: "feature/add-auth",
  instructions: "Add JWT authentication"
})

// 2. Daemon executes (on HOST):
// $ cd /project/root
// $ git checkout -b feature/add-auth
// $ claude "Add JWT authentication"

// 3. Claude runs on HOST in feature/add-auth branch
// Makes changes directly to project files

// 4. After completion:
// $ git status
// On branch feature/add-auth
// Changes not staged for commit:
//   modified: src/auth.ts
//   new file: src/jwt.ts
```

This architecture ensures that AI agents work with real project files on the correct git branches, while maintaining the benefits of Docker containerization for the MCP server.