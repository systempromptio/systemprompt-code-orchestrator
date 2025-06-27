# Code Structure Guide

This document provides an overview of the Reddit MCP server code structure and architecture.

## Overview

The Reddit MCP server follows a clean, modular architecture with clear separation of concerns:

```
src/
├── index.ts              # Main entry point for CLI/direct execution
├── server.ts            # Core HTTP/Express server setup
├── server/              # Server infrastructure modules
│   ├── mcp.ts          # MCP protocol handler with session management
│   ├── oauth.ts         # OAuth 2.1 provider implementation
│   ├── middleware.ts    # Express middleware (rate limiting, validation)
│   ├── auth-store.ts    # Simple auth info storage for sessions
│   └── config.ts        # Server configuration
├── handlers/            # Request handlers
│   ├── tool-handlers.ts # MCP tool implementations with Zod validation
│   ├── prompt-handlers.ts # Prompt processing and resource injection
│   ├── resource-handlers.ts # Resource management
│   ├── sampling.ts      # AI content generation
│   ├── notifications.ts # Server-to-client notifications
│   ├── callbacks/       # Sampling callbacks for operations
│   │   ├── index.ts     # Callback exports
│   │   └── suggest-action.ts # Action suggestion callback
│   └── tools/           # Individual tool implementations
│       ├── get-channel.ts
│       ├── get-post.ts
│       ├── get-comment.ts
│       ├── get-notifications.ts
│       ├── search-reddit.ts
│       ├── elicitation-example.ts
│       ├── sampling-example.ts
│       ├── structured-data-example.ts
│       ├── validation-example.ts
│       ├── logging.ts
│       ├── types.ts     # Tool handler types
│       └── index.ts     # Tool exports
├── services/            # Business logic
│   └── reddit/          # Reddit API integration
│       ├── reddit-service.ts
│       ├── reddit-auth-service.ts
│       ├── reddit-fetch-service.ts
│       ├── reddit-post-service.ts
│       └── reddit-subreddit-service.ts
├── types/               # TypeScript type definitions
│   ├── reddit.ts        # Reddit-specific types
│   ├── config.ts        # Configuration types
│   ├── sampling.ts      # Sampling types
│   ├── request-context.ts # Request context types
│   └── index.ts         # Type exports
├── utils/               # Utility functions
│   ├── logger.ts        # Logging utilities
│   ├── reddit-transformers.ts # Reddit data transformers
│   └── validation.ts    # Validation utilities
└── constants/           # Constants and configurations
    ├── tools.ts         # Tool definitions
    ├── resources.ts     # Resource definitions
    ├── sampling/        # Sampling prompt templates
    │   ├── index.ts
    │   ├── suggest-action.ts
    │   └── code-generation-example.ts
    ├── server/          # Server configuration constants
    │   └── server-config.ts
    └── tool/            # Individual tool constants
        ├── get-channel.ts
        ├── get-post.ts
        ├── get-comment.ts
        ├── get-notifications.ts
        ├── search-reddit.ts
        ├── elicitation-example.ts
        ├── sampling-example.ts
        ├── structured-data-example.ts
        ├── validation-example.ts
        └── logging.ts
```

## Key Architecture Decisions

### 1. Single Entry Point
- `index.ts` serves as the main entry point for CLI execution
- `server.ts` provides the core HTTP server setup
- Clean separation between application entry and server infrastructure

### 2. Separation of Concerns
- **HTTP Layer**: `server.ts` handles Express setup and routing
- **OAuth Layer**: `oauth.ts` manages authentication flows
- **MCP Layer**: `mcp.ts` handles protocol operations and sessions
- **Business Logic**: Services contain Reddit-specific logic

### 3. Session Management
- Centralized in `mcp.ts` with automatic cleanup
- Auth info stored separately in `auth-store.ts` for callback access
- Global instance pattern for notification support
- Each session includes StreamableHTTPServerTransport and MCP Server instance

### 4. Tool Architecture
- Individual tool implementations in `handlers/tools/`
- Centralized validation using Zod schemas in `tool-handlers.ts`
- Type-safe tool arguments with proper interfaces
- Example tools demonstrate MCP capabilities

### 5. Clean Dependencies
- No circular dependencies
- Clear module boundaries
- Type-safe interfaces between layers
- Proper import/export organization

## Core Modules

### server.ts
Main HTTP server that:
- Creates Express application
- Initializes OAuth and MCP handlers
- Sets up middleware and routes
- Configures CORS and security
- Exports `createApp()` and `startServer()` functions

### server/mcp.ts
MCP protocol handler that:
- Manages session lifecycle with automatic cleanup
- Creates MCP server instances per session using the SDK
- Handles request routing to tools, prompts, resources
- Provides notification support via global instance
- Implements proper session isolation

### server/oauth.ts
OAuth 2.1 provider that:
- Implements complete authorization flow with PKCE
- Manages JWT tokens and refresh logic
- Provides auth middleware for request validation
- Handles Reddit OAuth integration
- Supports well-known endpoints for metadata

### server/middleware.ts
Express middleware that provides:
- Rate limiting per IP/session
- Request size validation
- Protocol version validation
- Authentication context injection
- Error handling and logging

### server/auth-store.ts
Authentication storage that:
- Stores Reddit credentials per session
- Provides thread-safe access to auth info
- Used by callback handlers for authenticated operations
- Simple in-memory storage for development

## Data Flow

1. **Request arrives** at Express server (`server.ts`)
2. **Middleware** applies rate limiting and validation (`middleware.ts`)
3. **OAuth middleware** validates authentication (`oauth.ts`)
4. **MCP handler** processes the request (`mcp.ts`)
5. **Session** is created or retrieved with auth context
6. **Tool/Prompt/Resource handler** executes the operation
7. **Zod validation** ensures type safety for inputs/outputs
8. **Reddit service** performs API operations if needed
9. **Response** is sent back to client with proper formatting

## Session Architecture

Each MCP session includes:
- Unique session ID
- StreamableHTTPServerTransport
- MCP Server instance
- Reddit auth info
- Timeout management

Sessions are automatically cleaned up after 30 minutes of inactivity.

## Notification System

The notification system uses a global instance pattern:
1. `MCPHandler` instance is set globally when created
2. Handlers can retrieve it via `getMCPHandlerInstance()`
3. Notifications can be sent to specific sessions or broadcast

## Best Practices

1. **Always use absolute imports** from src/
2. **Keep handlers thin** - business logic in services
3. **Use TypeScript strictly** - no `any` types
4. **Handle errors gracefully** with proper logging
5. **Clean up resources** in session lifecycle

## Adding New Features

To add a new MCP tool:
1. Create tool constant in `constants/tool/your-tool.ts`
2. Implement handler in `handlers/tools/your-tool.ts`
3. Add Zod schema to `handlers/tool-handlers.ts`
4. Register in tool arrays in `constants/tools.ts`
5. Export from `handlers/tools/index.ts`
6. Add types to `types/` if needed

To add a new service:
1. Create service in `services/your-service/`
2. Use dependency injection for auth context
3. Handle errors with custom error types
4. Add appropriate logging with the logger utility
5. Create proper TypeScript interfaces in `types/`

To add a new sampling prompt:
1. Create prompt in `constants/sampling/your-prompt.ts`
2. Implement callback in `handlers/callbacks/your-callback.ts`
3. Register callback in the sampling handler
4. Export from appropriate index files

## Environment Variables

Required:
- `REDDIT_CLIENT_ID`: Reddit OAuth client ID
- `REDDIT_CLIENT_SECRET`: Reddit OAuth client secret  
- `JWT_SECRET`: Secret for JWT signing

Optional:
- `PORT`: Server port (default: 3000)
- `OAUTH_ISSUER`: OAuth issuer URL (default: http://localhost:3000)
- `REDIRECT_URL`: OAuth redirect URL (default: auto-generated)
- `REDDIT_USER_AGENT`: Reddit API user agent string
- `REDDIT_USERNAME`: Reddit username for logging
- `NODE_ENV`: Environment (development/production)

## Current Tool Implementations

### Reddit Tools
- **get_channel**: Retrieve subreddit posts with sorting options
- **get_post**: Fetch specific Reddit post with comments
- **get_comment**: Retrieve comment with optional thread context
- **get_notifications**: Fetch user notifications and messages
- **search_reddit**: Search Reddit with filters and pagination

### Example Tools (for learning/demonstration)
- **elicitation_example**: Demonstrates user input gathering
- **sampling_example**: Shows AI-assisted content generation
- **structured_data_example**: Demonstrates data formatting
- **validation_example**: Shows input validation with Zod
- **mcp_logging**: Utility for server-side logging