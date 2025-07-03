<div align="center">
  
  # 🚀 SystemPrompt Coding Agent
  
  ### Turn Your Workstation into a Remotely Accessible AI Coding Assistant
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Twitter Follow](https://img.shields.io/twitter/follow/tyingshoelaces_?style=social)](https://twitter.com/tyingshoelaces_)
  [![Discord](https://img.shields.io/discord/1255160891062620252?color=7289da&label=discord)](https://discord.com/invite/wkAbSuPWpr)
  
  **[Website](https://systemprompt.io)** • **[Documentation](https://docs.systemprompt.io/coding-agent)** • **[Watch Demo Video](https://www.loom.com/share/8e4b8631d1a149d9801f2b96235dcd0b)**

</div>

---

<div align="center">
  
  ### 💯 100% Free and Open Source
  
  **We appreciate your support!** If you find this project useful, please consider:
  
  ⭐ **Star** this repo • 📢 **Share** with your network • 🐛 **Report issues** • 🤝 **Contribute** code
  
  *Every star, share, and contribution helps us improve this tool for the community!*
  
</div>

---

<div align="center">
  
  ### 📱 Works with Any MCP Client
  
  **This server is 100% free and open source** and works with any MCP-compatible client.
  
  We also offer a **paid subscription** native mobile app (SystemPrompt) designed for voice-first interactions with this server.  
  The mobile app is still in early development but provides a native mobile experience for controlling your coding agent from anywhere.
  
  <a href="https://apps.apple.com/us/app/systemprompt-mcp-client/id6746670168">
    <img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us" alt="Download on App Store" height="50">
  </a>
  <a href="https://play.google.com/store/apps/details?id=com.systemprompt.mcp">
    <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" height="50">
  </a>
  
</div>

---

## 📋 Quick Navigation

**Getting Started**: [Quick Start](#quick-start) | [Security](#-security-notice) | [Remote Access](#remote-access-options)  
**Documentation**: [Architecture](#technical-architecture) | [Tools](#tool-reference) | [Templates](#pre-built-prompts)  
**Components**: [Daemon](docs/daemon.md) | [Docker](docs/docker-architecture.md) | [MCP Server](docs/mcp-server.md) | [Agent Manager](docs/agent-manager.md)  
**Features**: [Tunnel Access](docs/tunnel-remote-access.md) | [Push Notifications](docs/push-notifications.md) | [State Persistence](docs/state-persistence.md)

## What is This?

This is the **SystemPrompt Coding Agent** - a cutting-edge project that converts your workstation into a remotely-accessible MCP (Model Context Protocol) server that any MCP client can connect to. It's part of the [SystemPrompt.io](https://systemprompt.io/documentation) ecosystem, which is pioneering native mobile voice-controlled AI orchestration for developers.

### About SystemPrompt.io

SystemPrompt is an experimental, community-driven project (currently at v0.01) that enables developers to interact with AI and execute complex workflows using natural language voice commands. The project is:

- **Self-funded and indie** - Built by a single founder with the community
- **Rapidly iterating** - "Visceral, raw, cutting edge software" that's evolving quickly  
- **Mobile-first** - Native iOS and Android apps for voice-controlled development
- **Transparent about its stage** - Early but functional, "like having a very eager but slightly confused robot"

### How This Coding Agent Works

Send coding tasks from anywhere, and AI agents (Claude out of the box, extendable for any) execute directly on your actual machine. Your code never leaves your computer, but you can control it from anywhere through:

- **Voice commands** via the SystemPrompt mobile app
- **Any MCP-compatible client**
- **The included inspector tool**

This project exposes your local machine as an MCP server that can be remotely controlled. The AI agents run directly on your machine with access to your real development environment and tools.

### Why This Exists

The SystemPrompt mobile app users kept asking "but what do I do with it?" The answer: **manage your own development environment and agents remotely**. This coding agent is THE killer use case at this stage of the adoption curve for MCP servers - enabling developers to code from anywhere using just their voice.

## Quick Start [Requires Claude Code, Docker]

```bash
# Clone and setup
git clone https://github.com/systempromptio/systemprompt-code-orchestrator
cd systemprompt-code-orchestrator

# Install and run
npm i 
npm run setup
npm run start

# Test with the inspector
npm run inspector
```

The created tasks which can be exectued with the inspector should tunnel to your Claude Code installation, save structured logs inside the Docker container (exposed as MCP resources), and enable execution through the inspector (and any MCP client).

### Prerequisites

The setup script will check for these automatically:

- Node.js 18+ (required)
- Docker & Docker Compose (required)
- Claude Code CLI (optional but recommended - the setup script will guide you)

### Essential Commands

```bash
npm run start    # Start all services (daemon + Docker)
npm run stop     # Stop all services gracefully
npm run status   # Check service health
npm run logs     # View real-time logs
npm run tunnel   # Start with internet tunnel (requires Cloudflare)
```

### Essential Configuration

```env
# Required (setup will prompt for this)
PROJECT_ROOT=/path/to/your/code  # ⚠️ AI agents have FULL access here

# Optional (with defaults)
PORT=3000
COMPOSE_PROJECT_NAME=systemprompt-coding-agent

# Optional (for additional features)
CLOUDFLARE_TOKEN=your_token  # For tunnel access
PUSH_TOKEN=your_token        # For mobile notifications
```

## Technical Architecture

```
MCP Client (Mobile/Desktop)
    |
    v
Docker Container (MCP Server)
    - Handles MCP protocol
    - Resource subscriptions
    - Event streaming
    |
    v
Host Bridge Daemon (TCP Socket)
    - Command routing
    |
    v
Host Machine
    - AI agent execution
    - File system access
```

### Key Technical Innovations

**1. Real-Time Resource Subscription Model**

The server implements the MCP SDK's `listChanged` pattern for resource subscriptions. When a task state changes:

```typescript
// Client subscribes to task resources, notified by listChanged notifications
client.listResources()
client.getResource({ uri: "task://abc-123" })

// When task updates, server automatically:
// 1. Saves task to disk (JSON persistence)
await this.persistence.saveTask(updatedTask);

// 2. Emits internal event
this.emit("task:updated", updatedTask);

// 3. Sends MCP notification to subscribed clients
await sendResourcesUpdatedNotification(`task://${taskId}`, sessionId);
// This triggers: { method: "notifications/resources/updated", params: { uri: "task://abc-123" } }

// Client receives notification and can re-fetch the updated resource
```

This enables real-time task monitoring without polling - clients stay synchronized with task state changes as they happen.

**2. Push Notifications for Task Completion**

Integrated Firebase Cloud Messaging (FCM) support sends push notifications to mobile devices when tasks complete:

```typescript
// Task completes → Push notification sent
{
  notification: {
    title: "Task Complete",
    body: "Your refactoring task finished successfully"
  },
  data: {
    taskId: "abc-123",
    status: "completed",
    duration: "45s"
  }
}
```

Perfect for long-running tasks - start a task, go about your day, get notified when it's done.

**3. Stateful Process Management**

- Tasks persist to disk as JSON with atomic writes
- Process sessions maintained across daemon restarts
- Comprehensive state machine for task lifecycle:
  ```
  pending → in_progress → waiting → completed
                      ↓
                    failed
  ```

### Event-Driven Architecture

All operations emit events consumed by multiple subsystems:
- **Logger**: Structured JSON logs with context
- **State Manager**: Task status updates
- **Notifier**: Push notifications to mobile clients
- **Metrics**: Performance and usage analytics

## Remote Access Options

### 🌐 Internet Access via Cloudflare Tunnel

More complex options like opening a Cloudflare tunnel to expose an HTTPS URL to your local machine are documented, but not included by default (do at your own risk).

```bash
npm run tunnel
```

This will:
- Create a secure HTTPS tunnel to your local server
- Display both the public URL and local network addresses
- Enable access from anywhere (including mobile devices)

[→ Full Tunnel Documentation](docs/tunnel-remote-access.md)

### 🏠 Local Network Access

If you prefer to keep everything on your local network:

1. **Start the server normally:**
   ```bash
   npm start
   ```

2. **Access from devices on the same network:**
   - Find your machine's IP address
   - Connect using: `http://YOUR_IP:3000/mcp`

## Core Features

### 🤖 AI Agent Orchestration

- **Multi-Agent Support**: Claude Code CLI out of the box, extendable for any agent
- **Task Management**: Create, track, and manage coding tasks - [Task Management →](docs/task-management.md)
- **Session Isolation**: Each task runs in its own context - [Claude Integration →](docs/claude-code-integration.md)
- **Real-time Streaming**: Watch AI agents work in real-time - [Event System →](docs/event-system-and-logging.md)

### 📱 Mobile-First Design

- **Voice Commands**: "Create a login form with validation"
- **Push Notifications**: Get alerts when tasks complete - [Push Notifications →](docs/push-notifications.md)
- **Quick Actions**: Pre-defined templates for common tasks - [Prompt Templates →](docs/prompt-templates.md)
- **Remote Control**: Manage your dev environment from anywhere

### 🔧 MCP Protocol Features

- **Persistent State**: Tasks survive server restarts - [State Persistence →](docs/state-persistence.md)
- **Resource Management**: Expose task data as MCP resources - [Tools & Resources →](docs/tools-and-resources.md)
- **Interactive Prompts**: AI agents can ask for clarification
- **Progress Notifications**: Real-time status updates
- **Structured Data**: Full schema validation - [MCP Server →](docs/mcp-server.md)

## Tool Reference

[→ Full Tools and Resources Documentation](docs/tools-and-resources.md)

### Task Orchestration

| Tool | Description | Example |
|------|-------------|---------|
| `create_task` | Start new AI coding session | `{"title": "Add auth", "tool": "CLAUDECODE", "instructions": "..."}` |
| `update_task` | Send additional instructions | `{"process": "session_123", "instructions": "..."}` |
| `end_task` | Complete and cleanup | `{"task_id": "task_123", "status": "completed"}` |
| `report_task` | Generate task reports | `{"task_ids": ["task_123"], "format": "markdown"}` |

### System Management

| Tool | Description | Example |
|------|-------------|---------|
| `check_status` | Verify agent availability | `{"test_sessions": true, "verbose": true}` |
| `update_stats` | Get system statistics | `{"include_tasks": true}` |
| `clean_state` | Cleanup old tasks | `{"keep_recent": true, "dry_run": true}` |

## Pre-Built Prompts

SystemPrompt includes powerful prompt templates for common coding tasks. [→ Full Prompt Templates Documentation](docs/prompt-templates.md)

### 🐛 Bug Fixing
```javascript
{
  "prompt_template": "bug_fix",
  "variables": {
    "bug_description": "Login fails after password reset",
    "error_logs": "401 Unauthorized at auth.js:42"
  }
}
```

### ⚛️ React Components
```javascript
{
  "prompt_template": "react_component",
  "variables": {
    "component_name": "UserDashboard",
    "features": ["data visualization", "real-time updates", "export functionality"]
  }
}
```

### 🧪 Unit Testing
```javascript
{
  "prompt_template": "unit_test",
  "variables": {
    "target_files": ["src/auth/*.js"],
    "framework": "jest",
    "coverage_target": 85
  }
}
```

## 📚 Comprehensive Documentation

### Core Architecture

- **[Daemon](docs/daemon.md)** - The host-side bridge that executes commands and manages Claude processes
- **[Docker Architecture](docs/docker-architecture.md)** - How the Docker container and host machine interact
- **[MCP Server](docs/mcp-server.md)** - The Model Context Protocol server implementation

### AI Agent Systems

- **[Agent Manager](docs/agent-manager.md)** - Central orchestrator for all AI agent sessions
- **[Claude Code Integration](docs/claude-code-integration.md)** - How Claude Code CLI is integrated and managed
- **[Task Management](docs/task-management.md)** - Task lifecycle, persistence, and state management

### Protocol & API

- **[Tools and Resources](docs/tools-and-resources.md)** - MCP tools and resources implementation
- **[Event System and Logging](docs/event-system-and-logging.md)** - Real-time event streaming and structured logging

### Additional Features

- **[Testing Framework](docs/testing-framework.md)** - E2E testing setup and best practices
- **[Tunnel and Remote Access](docs/tunnel-remote-access.md)** - Cloudflare tunnel setup for internet access
- **[State Persistence](docs/state-persistence.md)** - How tasks and sessions persist across restarts
- **[Push Notifications](docs/push-notifications.md)** - Mobile push notification integration
- **[Prompt Templates](docs/prompt-templates.md)** - Pre-built prompt system for common tasks

## Performance Optimizations

1. **Streaming Output**: Agent output streamed in chunks, not buffered
2. **Lazy Resource Loading**: Resources fetched on-demand
3. **Connection Pooling**: Reused TCP connections to daemon
4. **Efficient State Persistence**: Only changed fields written to disk

## Development

### Project Structure
```
systemprompt-coding-agent/
├── src/
│   ├── server.ts           # MCP server setup
│   ├── handlers/           # Protocol handlers
│   ├── services/           # Agent services
│   ├── constants/          # Tool definitions
│   └── types/              # TypeScript types
├── docker-compose.yml
└── package.json
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

For security issues, email security@systemprompt.io

## Support

- **Documentation**: [docs.systemprompt.io](https://systemprompt.io/documentation)
- **GitHub Issues**: [Report bugs](https://github.com/systempromptio/systemprompt-code-orchestrator/issues)
- **Discord**: [Join our community](https://discord.com/invite/wkAbSuPWpr)
- **Twitter**: [@tyingshoelaces_](https://twitter.com/tyingshoelaces_)

## Future Roadmap

1. **Multi-Agent Orchestration**: Coordinate multiple AI agents on complex tasks
2. **Incremental Computation**: Cache and reuse AI outputs
3. **Distributed Execution**: Spread tasks across multiple machines
4. **Web UI Dashboard**: Browser-based monitoring and control

## MCP Client Options

While this server works with any MCP-compatible client, for a mobile voice-controlled experience, check out [SystemPrompt.io](https://systemprompt.io) - still early, but a native iOS/Android app designed specifically for voice-driven AI coding workflows. We want to create these tasks and interact with them asynchronously with our voice!

## License

MIT License - see [LICENSE](LICENSE)

---

<div align="center">
  <strong>Built with love by <a href="https://systemprompt.io">SystemPrompt.io</a></strong><br>
  <em>AI-Powered Development from Anywhere</em>
</div>
