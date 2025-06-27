# SystemPrompt MCP Server - Coding Agent Orchestrator

An MCP (Model Context Protocol) server that orchestrates AI coding agents (Claude Code CLI and Gemini CLI) to perform complex coding tasks autonomously. This server acts as a bridge between MCP clients and AI coding tools, enabling automated code generation, refactoring, testing, and more.

## What is This?

The SystemPrompt MCP Server is a task orchestration system that:
- **Manages AI Coding Sessions**: Creates and controls Claude Code or Gemini CLI instances
- **Handles Complex Tasks**: Breaks down coding requests into manageable tasks with branch management
- **Provides MCP Interface**: Exposes tools through the standardized Model Context Protocol
- **Tracks Progress**: Maintains task state, logs, and session information
- **Supports Concurrent Operations**: Run multiple AI coding sessions simultaneously

## How It Works

```mermaid
graph LR
    A[MCP Client] -->|MCP Protocol| B[SystemPrompt Server]
    B --> C[Task Manager]
    C --> D[Claude Code CLI]
    C --> E[Gemini CLI]
    D --> F[Your Codebase]
    E --> F
```

1. **MCP Client** sends a request to create a task (e.g., "implement user authentication")
2. **SystemPrompt Server** creates a task and spawns the requested AI tool
3. **AI Tool** (Claude Code or Gemini CLI) executes in your project directory
4. **Task Manager** tracks progress and manages the session lifecycle
5. **Results** are streamed back to the MCP client in real-time

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose (for containerized deployment)
- API keys for the AI tools you want to use:
  - Anthropic API key (for Claude Code)
  - Google AI API key (for Gemini CLI)

## Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/systempromptio/systemprompt-mcp-server.git
cd systemprompt-mcp-server

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and add your API keys and project path
nano .env

# Build the TypeScript project
npm run build

# Start the server
node build/index.js
```

### Docker Deployment

```bash
# Build and run with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop server
docker-compose down
```

## Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```env
# API Keys (required)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Project Configuration
PROJECT_ROOT=/path/to/your/project  # Where AI tools will execute
PORT=3000                           # Server port (optional)

# Optional Configuration
JWT_SECRET=your_jwt_secret_here     # For future auth features
STATE_PATH=/data/state              # State persistence location
```

### MCP Client Configuration

Add the server to your MCP client configuration:

#### Claude Desktop (claude_desktop_config.json)

```json
{
  "mcpServers": {
    "systemprompt-coding": {
      "command": "node",
      "args": ["/path/to/systemprompt-mcp-server/build/index.js"]
    }
  }
}
```

#### Cline/Other MCP Clients

```json
{
  "systemprompt-coding": {
    "command": "node",
    "args": ["/path/to/systemprompt-mcp-server/build/index.js"],
    "env": {
      "ANTHROPIC_API_KEY": "your_key",
      "GEMINI_API_KEY": "your_key",
      "PROJECT_ROOT": "/path/to/your/project"
    }
  }
}
```

## Core Tools

### 1. create_task

Creates a new coding task and immediately starts the AI agent.

```typescript
{
  "title": "Add user authentication",
  "tool": "CLAUDECODE",  // or "GEMINICLI"
  "instructions": "Implement JWT-based authentication with login and signup endpoints",
  "branch": "feature/auth"
}
```

**Parameters:**
- `title`: Short, descriptive title for the task
- `tool`: Which AI tool to use (`"CLAUDECODE"` or `"GEMINICLI"`)
- `instructions`: Detailed instructions for what needs to be done
- `branch`: Git branch name (will be created if it doesn't exist)

### 2. update_task

Send additional commands or instructions to an active task.

```typescript
{
  "task_id": "task_abc123",
  "command": "Add password reset functionality",
  "status": "in_progress"  // optional
}
```

### 3. end_task

Complete a task and save all logs and artifacts.

```typescript
{
  "task_id": "task_abc123",
  "reason": "Task completed successfully"
}
```

### 4. check_task_status

Get the current status of a specific task.

```typescript
{
  "task_id": "task_abc123"
}
```

### 5. update_stats

Get overall statistics about tasks and sessions.

```typescript
{} // No parameters required
```

## Usage Examples

### Example 1: Implementing a New Feature

```javascript
// Create a task to implement a shopping cart feature
const response = await mcp.call('create_task', {
  title: 'Implement shopping cart',
  tool: 'CLAUDECODE',
  instructions: `
    Create a shopping cart feature with the following:
    1. Add to cart functionality
    2. Update quantities
    3. Remove items
    4. Calculate totals with tax
    5. Persist cart in localStorage
    6. Add unit tests
  `,
  branch: 'feature/shopping-cart'
});

// Task starts immediately and Claude Code begins implementation
// Monitor progress through the task_id returned
```

### Example 2: Refactoring Code

```javascript
// Create a refactoring task
const response = await mcp.call('create_task', {
  title: 'Refactor user service',
  tool: 'GEMINICLI',
  instructions: `
    Refactor the user service to:
    - Use dependency injection
    - Add proper error handling
    - Implement repository pattern
    - Add comprehensive logging
    - Ensure all tests still pass
  `,
  branch: 'refactor/user-service'
});
```

### Example 3: Bug Fixing

```javascript
// Create a bug fix task
const response = await mcp.call('create_task', {
  title: 'Fix authentication bug',
  tool: 'CLAUDECODE',
  instructions: `
    Debug and fix the issue where users can't log in after password reset.
    Check the password hashing logic and session management.
    Add tests to prevent regression.
  `,
  branch: 'bugfix/auth-after-reset'
});

// Later, add more context if needed
await mcp.call('update_task', {
  task_id: response.task_id,
  command: 'Also check if the reset token is being properly invalidated'
});
```

## How Tasks Work

1. **Task Creation**: When you create a task, the server:
   - Generates a unique task ID
   - Creates/switches to the specified Git branch
   - Spawns the selected AI tool (Claude Code or Gemini CLI)
   - Sends your instructions to the AI

2. **Task Execution**: The AI tool:
   - Analyzes your codebase
   - Plans the implementation
   - Makes changes to files
   - Runs tests if requested
   - Provides real-time feedback

3. **Task Completion**: When finished:
   - All changes remain in the Git branch
   - Logs are saved for review
   - Session resources are cleaned up
   - You can review and merge the changes

## Best Practices

1. **Clear Instructions**: Provide detailed, specific instructions for best results
2. **Use Branches**: Always specify a branch to keep changes isolated
3. **One Task Per Feature**: Break complex features into multiple tasks
4. **Include Tests**: Ask the AI to write tests for code changes
5. **Review Changes**: Always review AI-generated code before merging

## Architecture

```
systemprompt-mcp-server/
├── src/
│   ├── handlers/          # MCP request handlers
│   ├── services/          # Core services (task, agent management)
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── docker-compose.yml     # Docker configuration
├── Dockerfile            # Container definition
└── .env.example          # Environment template
```

## Advanced Features

### State Persistence
Tasks and their state are persisted to disk, surviving server restarts.

### Concurrent Sessions
Run multiple AI coding sessions simultaneously on different tasks.

### Git Integration
Automatic branch creation and management for each task.

### Real-time Streaming
Get live updates as the AI tools work on your code.

## Troubleshooting

### AI Tool Not Starting
- Ensure API keys are correctly set in `.env`
- Check that `PROJECT_ROOT` points to a valid directory
- Verify Docker is running (for containerized deployment)

### Permission Issues
- Ensure the server has write access to `PROJECT_ROOT`
- Check Docker volume permissions if using containers

### Git Branch Issues
- Ensure your project is a Git repository
- Commit or stash changes before creating tasks

## Security Considerations

- **API Keys**: Store securely, never commit to version control
- **Project Access**: The server has full access to `PROJECT_ROOT`
- **Network**: Use HTTPS in production environments
- **Isolation**: Run in containers for better isolation

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs.

## License

MIT License - see LICENSE file for details

## Support

- Issues: [GitHub Issues](https://github.com/systempromptio/systemprompt-mcp-server/issues)
- Discussions: [GitHub Discussions](https://github.com/systempromptio/systemprompt-mcp-server/discussions)
- Documentation: [SystemPrompt Docs](https://systemprompt.io)