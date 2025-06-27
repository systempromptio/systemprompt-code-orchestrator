# SystemPrompt MCP Server - Coding Agent Orchestrator

**A powerful Model Context Protocol (MCP) server that orchestrates AI-powered coding assistants to perform complex software development tasks.**

## 📋 Short Description (for GitHub)

MCP server for orchestrating AI coding agents (Claude Code CLI & Gemini CLI). Features task management, process execution, Git integration, and dynamic resource discovery. Full TypeScript implementation with Docker support and Cloudflare Tunnel integration. Implements complete MCP spec including tools, resources, prompts, and resource templates.

## 🎯 Repository Topics/Tags

- `mcp-server`
- `model-context-protocol`
- `ai-orchestration`
- `claude-code`
- `gemini-cli`
- `typescript`
- `docker`
- `cloudflare-tunnel`
- `task-management`
- `coding-assistant`
- `developer-tools`
- `ai-agents`

## 📝 Full Description

### Overview

SystemPrompt MCP Server is an enterprise-grade orchestration platform for AI-powered coding assistants. It implements the full Model Context Protocol (MCP) specification, enabling seamless integration with any MCP-compatible AI tool to perform complex software development tasks.

### Key Capabilities

**🤖 AI Agent Orchestration**
- Orchestrate multiple AI models (Claude Code, Gemini CLI) for coding tasks
- Create, track, and manage development tasks with full lifecycle support
- Execute commands and processes with real-time output streaming
- Built-in Git integration for version control operations

**🔧 Complete MCP Implementation**
- **Tools**: Task management, status checking, system control
- **Resources**: Dynamic discovery with URI templates for flexible access
- **Prompts**: 20+ pre-built prompts for testing, React, debugging, refactoring
- **Roots**: Filesystem boundary management
- **Resource Templates**: Parameterized URIs for dynamic resource access

**🏗️ Enterprise Architecture**
- Full TypeScript with strict type safety
- Event-driven architecture for real-time updates
- Session isolation with automatic cleanup
- Comprehensive error handling and recovery
- Docker-ready with health checks and monitoring

### Use Cases

- **Automated Testing**: Generate comprehensive test suites with 100% coverage
- **Component Development**: Create React components with best practices
- **Bug Resolution**: AI-assisted debugging and performance optimization
- **Code Refactoring**: Modernize legacy code and improve architecture
- **CI/CD Integration**: Automate development workflows

### Technical Stack

- **Core**: TypeScript, Node.js, Express.js
- **Protocol**: Model Context Protocol SDK v1.13+
- **Validation**: Zod for runtime type safety
- **Containerization**: Docker with multi-stage builds
- **Networking**: Cloudflare Tunnel for secure exposure
- **State Management**: Persistent task and session storage

### Getting Started

```bash
# Quick start with Docker
docker-compose up -d

# Access MCP endpoint
http://localhost:3000/mcp
```

### Community & Support

- Full documentation in `/docs`
- Example integrations in `/examples`
- Active Discord community
- Regular updates and improvements

---

**Perfect for**: Development teams, AI tool builders, automation engineers, and anyone looking to enhance their development workflow with AI assistance.