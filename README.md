# SystemPrompt Coding Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Twitter Follow](https://img.shields.io/twitter/follow/tyingshoelaces_?style=social)](https://twitter.com/tyingshoelaces_)
[![Discord](https://img.shields.io/discord/1255160891062620252?color=7289da&label=discord)](https://discord.com/invite/wkAbSuPWpr)

**Control AI coding agents from anywhere** • [Website](https://systemprompt.io) • [Documentation](https://docs.systemprompt.io/coding-agent)

---

<div align="center">
  <h3>🎁 100% Free and Open Source</h3>
  <p>Built by <a href="https://systemprompt.io">systemprompt.io</a> — creators of the world's first native mobile MCP client</p>
  
  <h3>📱 Get the Mobile App</h3>
  <a href="https://apps.apple.com/us/app/systemprompt-mcp-client/id6746670168">
    <img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us" alt="Download on App Store" height="50">
  </a>
  <a href="https://play.google.com/store/apps/details?id=com.systemprompt.mcp">
    <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" height="50">
  </a>
</div>

---

## What is This?

**SystemPrompt Coding Agent** is an MCP server that orchestrates AI coding assistants (Claude Code CLI and Gemini CLI) to perform complex programming tasks autonomously. It bridges your local development environment with AI agents, enabling them to write, test, and refactor code on your behalf.

### 🌟 Three Key Differentiators

**1. Remote-First Architecture**  
Transform your local machine into a remote coding endpoint. Access your development environment from anywhere—no complex networking required.

**2. Mobile Native Experience**  
Purpose-built for the SystemPrompt mobile app. Start coding tasks with your voice, monitor progress in real-time, and get push notifications when tasks complete.

**3. Full MCP Protocol**  
Leverages every MCP feature: persistent state management, real-time notifications, interactive prompts, and pre-configured task templates.

## 🚨 Security Notice

**⚠️ CRITICAL: This server grants AI agents full access to your local machine with NO built-in authentication. (yet)**

### Security Implications

- **Full System Access**: AI agents can read, write, and execute code in your `PROJECT_ROOT`
- **No Authentication**: Anyone with your server URL has complete access
- **Remote Code Execution**: AI agents execute commands on your machine

### Mandatory Security Measures

1. **Never expose directly to the internet**
2. **Treat server URLs as passwords**
3. **Use VPN or SSH tunnels for remote access**
4. **Restrict `PROJECT_ROOT` to non-sensitive directories**
5. **Monitor agent activity through logs**

*Zero-trust OAuth authentication coming in v1.0*

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- API Keys:
  - [Anthropic API Key](https://console.anthropic.com) (Claude Code)
  - [Google AI API Key](https://makersuite.google.com/app/apikey) (Gemini)

### 30-Second Setup

```bash
# Clone and setup
git clone https://github.com/systempromptio/systemprompt-coding-agent.git
cd systemprompt-coding-agent
npm install

# Configure (edit with your API keys)
cp .env.example .env
nano .env

# Run with Docker
docker-compose up -d

# Or run locally
npm run build && npm start
```

### Essential Configuration

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
PROJECT_ROOT=/path/to/your/code  # ⚠️ AI agents have FULL access here

# Security (coming soon)
JWT_SECRET=generate-a-long-random-string
REMOTE_AUTH_TOKEN=another-random-string
```

## Core Features

### 🤖 AI Agent Orchestration

- **Multi-Agent Support**: Seamlessly switch between Claude Code and Gemini
- **Task Management**: Create, track, and manage coding tasks
- **Git Integration**: Automatic branch creation and management
- **Session Isolation**: Each task runs in its own context
- **Real-time Streaming**: Watch AI agents work in real-time

### 📱 Mobile-First Design

- **Voice Commands**: "Create a login form with validation"
- **Push Notifications**: Get alerts when tasks complete
- **Quick Actions**: Pre-defined templates for common tasks
- **Remote Control**: Manage your dev environment from anywhere

### 🔧 MCP Protocol Features

- **Persistent State**: Tasks survive server restarts
- **Resource Management**: Expose task data as MCP resources
- **Interactive Prompts**: AI agents can ask for clarification
- **Progress Notifications**: Real-time status updates
- **Structured Data**: Full schema validation

## Tool Reference

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

## Architecture

```
┌─────────────────────────────────────────┐
│        SystemPrompt Mobile App          │
│           (iOS/Android)                 │
└──────────────────┬──────────────────────┘
                   │ Remote MCP
┌──────────────────▼──────────────────────┐
│          Desktop MCP Clients            │
│      (Claude Desktop, Cline, etc.)      │
└──────────────────┬──────────────────────┘
                   │ Local MCP
┌──────────────────▼──────────────────────┐
│       SystemPrompt Coding Agent         │
│  ┌────────────────────────────────────┐ │
│  │     Docker Container State         │ │
│  │  • Tasks  • Sessions  • Resources  │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │        Agent Orchestrator          │ │
│  │  • Claude Code  • Gemini CLI       │ │
│  └────────────────────────────────────┘ │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         Your Local Machine              │
│          PROJECT_ROOT                   │
└─────────────────────────────────────────┘
```

## Production Deployment

### Secure Docker Setup

```yaml
version: '3.8'
services:
  coding-agent:
    image: systemprompt/coding-agent:latest
    environment:
      - NODE_ENV=production
    volumes:
      - ./state:/data/state
      - /projects:/projects:ro  # Read-only
    ports:
      - "127.0.0.1:3000:3000"  # Local only
    security_opt:
      - no-new-privileges:true
    user: "1000:1000"
    restart: unless-stopped
```

### Nginx Reverse Proxy

```nginx
server {
    server_name code.yourdomain.com;
    
    location / {
        auth_basic "Restricted";
        auth_basic_user_file /etc/nginx/.htpasswd;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
}
```

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

- **Documentation**: [docs.systemprompt.io](https://docs.systemprompt.io)
- **GitHub Issues**: [Report bugs](https://github.com/systempromptio/systemprompt-coding-agent/issues)
- **Discord**: [Join our community](https://discord.com/invite/wkAbSuPWpr)
- **Twitter**: [@tyingshoelaces_](https://twitter.com/tyingshoelaces_)

## License

MIT License - see [LICENSE](LICENSE)

---

<div align="center">
  <strong>Built with ❤️ by <a href="https://systemprompt.io">SystemPrompt.io</a></strong><br>
  <em>AI-Powered Development from Anywhere</em>
</div>