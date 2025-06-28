# systemprompt-coding-agent

[![npm version](https://img.shields.io/npm/v/@systemprompt/coding-agent.svg)](https://www.npmjs.com/package/@systemprompt/coding-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://hub.docker.com/r/systemprompt/coding-agent)
[![Twitter Follow](https://img.shields.io/twitter/follow/tyingshoelaces_?style=social)](https://twitter.com/tyingshoelaces_)
[![Discord](https://img.shields.io/discord/1234567890?color=7289da&label=discord)](https://discord.gg/systemprompt)

[Website](https://systemprompt.io) | [Documentation](https://docs.systemprompt.io/coding-agent) | [Mobile App](https://systemprompt.io/mobile)

## 🎁 Free and Open Source

This MCP server is **100% free and open source**, sponsored by [systemprompt.io](https://systemprompt.io) — creators of the **world's first native mobile MCP client**.

### 📱 Get the SystemPrompt Mobile App

Control your AI coding agents from anywhere with our native mobile apps:

<div align="center">
  <a href="https://apps.apple.com/us/app/systemprompt-mcp-client/id6746670168">
    <img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&amp;releaseDate=1610841600&h=7e7b68fad19738b5649a1bfb78ff46e9" alt="Download on App Store" height="60">
  </a>
  <a href="https://play.google.com/store/apps/details?id=com.systemprompt.mcp">
    <img src="https://play.google.com/intl/en_us/badges/images/generic/en_badge_web_generic.png" alt="Get it on Google Play" height="60">
  </a>
</div>

**If you find this project useful, we'd appreciate:**
- ⭐ **A star on this repository**
- 👍 **A follow on Twitter [@tyingshoelaces_](https://twitter.com/tyingshoelaces_)**
- 🔗 **Sharing with your network**

Your support helps us continue creating valuable **free and open source** tools for the AI community!

## 🚨 CRITICAL SECURITY WARNING 🚨

**THIS SERVER EXPOSES YOUR LOCAL MACHINE TO THE INTERNET WITH NO BUILT-IN AUTHENTICATION**

### ⚠️ Security Risks

1. **Full System Access**: This server provides AI agents with complete access to your `PROJECT_ROOT` directory
2. **No Authentication**: Currently ships with **NO authentication mechanism** out of the box
3. **Remote Code Execution**: AI agents can execute arbitrary code on your machine
4. **Sensitive Data Exposure**: Any files in your project directory can be read/modified

### 🔒 Security Best Practices

**USE AT YOUR OWN RISK** - Follow these guidelines:

1. **Never expose to public internet** without proper authentication
2. **Treat any public URL as EXTREMELY SENSITIVE** - anyone with the URL has full access
3. **Use VPN or secure tunnels** for remote access
4. **Restrict `PROJECT_ROOT`** to non-sensitive directories only
5. **Monitor all agent activities** through logs and notifications
6. **Use read-only mounts** where possible
7. **Implement network-level security** (firewalls, IP whitelisting)

### 🔐 Coming Soon: Zero-Trust OAuth

We are actively developing a **zero-trust OAuth flow** that will be incorporated in the next major release. Until then, this server should be considered **experimental** and used only in controlled environments.

---

## 🌟 Why Another Agent Orchestrator?

### 1. 🌐 **Remote Endpoint Infrastructure**
Out-of-the-box infrastructure to convert your local orchestrator into a REMOTE endpoint, allowing you to use your local machine from non-local clients. No complex networking setup required - it just works.

### 2. 📱 **Mobile-First Design**
Specifically designed for use with the **SystemPrompt Native Mobile client**. Organize and execute coding tasks directly from your mobile device with a native, optimized experience.

### 3. 🔧 **Full MCP Power**
- **State Management**: Manages state in the Docker container with full persistence
- **Resource Exposure**: Exposes resources through the MCP protocol
- **Notifications**: Real-time notifications for task progress and status
- **Elicitations**: Interactive prompts and confirmations
- **Plug & Play Prompts**: Pre-configured prompts that can be used and customized

## ✨ Features

### Core MCP Implementation

- **🛠️ Tool System**: Comprehensive tools for AI agent orchestration
- **📚 Resources & Prompts**: Dynamic prompt templates and resource management
- **💬 Elicitation**: Dynamic user input gathering during task execution
- **📡 Notifications**: Real-time progress updates and status notifications
- **🔄 State Persistence**: All tasks and sessions survive container restarts
- **🎯 Multi-Agent Support**: Claude Code CLI and Gemini CLI integration

### Agent Orchestration Features

- **Task Management**: Create, update, and track coding tasks
- **Git Integration**: Automatic branch creation and management
- **Session Isolation**: Each task runs in its own isolated session
- **Concurrent Execution**: Run multiple AI agents simultaneously
- **Output Streaming**: Real-time streaming of agent output
- **Error Recovery**: Automatic retry and error handling

### Developer Features

- **TypeScript**: Full type safety with comprehensive interfaces
- **Docker-Based**: Containerized architecture for consistency
- **Modular Design**: Clean separation of concerns
- **Extensible**: Easy to add new AI agents or tools
- **Well-Documented**: Extensive inline documentation

## 📚 Table of Contents

- [Security Warning](#-critical-security-warning-)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Tool Reference](#-tool-reference)
- [Mobile Setup](#-mobile-setup)
- [Advanced Features](#-advanced-features)
- [Docker Deployment](#-docker-deployment)
- [Development](#-development)
- [Code Structure](#-code-structure)
- [Contributing](#-contributing)
- [Support](#-support)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- API keys for:
  - Anthropic (for Claude Code)
  - Google AI (for Gemini CLI)
- SystemPrompt Mobile App (for mobile access)

### Installation

```bash
# Clone the repository
git clone https://github.com/systempromptio/systemprompt-coding-agent.git
cd systemprompt-coding-agent

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Configuration

Create a `.env` file with the following:

```env
# Required API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key
GEMINI_API_KEY=your_gemini_api_key

# Project Configuration
PROJECT_ROOT=/path/to/your/projects  # ⚠️ AI agents have FULL ACCESS to this directory
PORT=3000

# Security (Coming Soon)
JWT_SECRET=your_jwt_secret
REMOTE_AUTH_TOKEN=your_secure_token  # Currently not enforced

# Docker State Management
STATE_PATH=/data/state
RESOURCE_PATH=/data/resources

# Optional
LOG_LEVEL=debug
SESSION_TIMEOUT=3600000  # 1 hour in milliseconds
```

### Running the Server

```bash
# Build TypeScript
npm run build

# Run locally (development)
npm run dev

# Run with Docker (recommended)
docker-compose up -d

# View logs
docker-compose logs -f
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              SystemPrompt Mobile App                     │
│                  (iOS/Android)                          │
└────────────────────────┬────────────────────────────────┘
                         │ Remote MCP
┌────────────────────────┴────────────────────────────────┐
│               Desktop MCP Client                         │
│            (Claude, Cline, etc.)                        │
└────────────────────────┬────────────────────────────────┘
                         │ Local MCP
┌────────────────────────┴────────────────────────────────┐
│              MCP CODING AGENT Server                     │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │    Docker   │  │   Session   │  │  Notification  │  │
│  │  Container  │  │   Manager   │  │    Manager     │  │
│  └─────────────┘  └─────────────┘  └────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                   Handler Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │    Tools    │  │  Resources  │  │   Prompts      │  │
│  │   Handler   │  │   Handler   │  │   Handler      │  │
│  └─────────────┘  └─────────────┘  └────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                   Service Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │ Claude Code │  │ Gemini CLI  │  │     Task       │  │
│  │   Service   │  │   Service   │  │    Manager     │  │
│  └─────────────┘  └─────────────┘  └────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                  Local Machine                           │
│              (PROJECT_ROOT directory)                    │
└─────────────────────────────────────────────────────────┘
```

### Key Components

- **`src/server.ts`**: Main MCP server setup
- **`src/handlers/`**: MCP protocol handlers
- **`src/services/`**: AI agent integration services
- **`src/types/`**: TypeScript type definitions
- **`src/constants/`**: Tool and prompt definitions

## 🛠️ Tool Reference

### Task Management Tools

#### `create_task`
Start a new AI coding session
```typescript
{
  "title": "Implement user authentication",
  "tool": "CLAUDECODE",  // or "GEMINICLI"
  "instructions": "Add JWT authentication with login/signup endpoints",
  "branch": "feature/auth"
}
```

#### `update_task`
Send additional instructions to active AI
```typescript
{
  "process": "session_abc123",
  "instructions": "Also add password reset functionality"
}
```

#### `end_task`
Complete and clean up a task
```typescript
{
  "task_id": "task_abc123",
  "status": "completed",
  "final_command": "npm test",
  "generate_report": true
}
```

#### `report_task`
Generate detailed task reports
```typescript
{
  "task_ids": ["task_abc123"],
  "report_type": "detailed",
  "format": "markdown"
}
```

### System Tools

#### `check_status`
Verify AI tools availability
```typescript
{
  "test_sessions": true,
  "verbose": true
}
```

#### `update_stats`
Get system statistics
```typescript
{
  "include_tasks": true,
  "include_sessions": true
}
```

#### `clean_state`
Clean up completed tasks
```typescript
{
  "clean_tasks": true,
  "keep_recent": true,
  "dry_run": true
}
```

## 📱 Mobile Setup

### Connect from SystemPrompt App

1. **Secure Your Endpoint** (CRITICAL)
   - Use VPN or secure tunnel
   - Never expose directly to internet
   - Treat URLs as passwords

2. **Configure Mobile App**
   - Open SystemPrompt app
   - Settings → MCP Servers
   - Add server with your secure URL

3. **Start Using**
   - Create tasks with voice
   - Monitor progress in real-time
   - Get push notifications

### Mobile Features

- **Voice Commands**: "Create a login form with validation"
- **Quick Actions**: Pre-defined task templates
- **Push Notifications**: Task completion alerts
- **Live Streaming**: Real-time agent output

## 🎯 Advanced Features

### Plug & Play Prompts

Pre-configured prompt templates for common tasks:

#### Bug Fixing
```javascript
{
  "prompt_template": "bug_fix",
  "variables": {
    "bug_description": "Login fails after password reset",
    "error_logs": "401 Unauthorized"
  }
}
```

#### React Components
```javascript
{
  "prompt_template": "react_component",
  "variables": {
    "component_name": "UserProfile",
    "props": ["userId", "onUpdate"],
    "features": ["edit mode", "validation"]
  }
}
```

#### Unit Testing
```javascript
{
  "prompt_template": "unit_test",
  "variables": {
    "target_files": ["src/auth.js"],
    "coverage_target": 80
  }
}
```

### State Persistence

All state managed in Docker volumes:
```yaml
volumes:
  - ./state:/data/state          # Task and session state
  - ./resources:/data/resources  # MCP resources
  - ./logs:/data/logs           # Application logs
  - ./projects:/projects        # Your code (mount as read-only if possible)
```

### Notifications

Real-time updates via MCP protocol:
- Task creation/completion
- Agent output streaming
- Error conditions
- Progress milestones

## 🐳 Docker Deployment

### Production Setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  coding-agent:
    image: systemprompt/coding-agent:latest
    ports:
      - "3000:3000"
    volumes:
      - ./state:/data/state
      - ./logs:/data/logs
      - /path/to/projects:/projects:ro  # Read-only mount
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    user: "1000:1000"  # Non-root user
```

### Security Hardening

1. **Network Security**
   ```bash
   # Use reverse proxy with auth
   server {
     server_name api.yourdomain.com;
     
     location / {
       auth_basic "Restricted";
       auth_basic_user_file /etc/nginx/.htpasswd;
       
       proxy_pass http://localhost:3000;
     }
   }
   ```

2. **Docker Security**
   - Run as non-root user
   - Use read-only mounts where possible
   - Enable security options
   - Limit resource usage

## 💻 Development

### Local Development
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Adding New AI Agents

1. Create service in `src/services/`
2. Add tool definitions in `src/constants/tools/`
3. Implement handlers in `src/handlers/tools/`
4. Update types in `src/types/`

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# With coverage
npm run test:coverage
```

## 📁 Code Structure

```
systemprompt-coding-agent/
├── src/
│   ├── index.ts                 # Entry point
│   ├── server.ts               # MCP server setup
│   ├── handlers/               # MCP protocol handlers
│   │   ├── tool-handlers.ts    # Tool execution
│   │   ├── resource-handlers.ts # Resource management
│   │   ├── prompt-handlers.ts  # Prompt templates
│   │   └── tools/              # Individual tools
│   ├── services/               # AI agent integration
│   │   ├── claude-code-service.ts
│   │   ├── gemini-cli-service.ts
│   │   └── task-manager.ts
│   ├── constants/              # Definitions
│   │   ├── tools.ts
│   │   ├── prompts.ts
│   │   └── resources.ts
│   └── types/                  # TypeScript types
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

### Security Reports

For security issues, please email security@systemprompt.io instead of using public issues.

## 📞 Support

- **Documentation**: [docs.systemprompt.io](https://docs.systemprompt.io)
- **Issues**: [GitHub Issues](https://github.com/systempromptio/systemprompt-coding-agent/issues)
- **Discord**: [Join our community](https://discord.gg/systemprompt)
- **Twitter**: [@tyingshoelaces_](https://twitter.com/tyingshoelaces_)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for Claude and MCP
- [Google](https://google.com) for Gemini
- The MCP community for feedback and contributions

---

Built with ❤️ by [SystemPrompt.io](https://systemprompt.io) - AI-Powered Development from Anywhere

**Remember**: Security is your responsibility. This server provides powerful capabilities - use them wisely.