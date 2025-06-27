# Server Infrastructure

This directory contains the HTTP server infrastructure that hosts the MCP protocol and handles OAuth authentication.

## Files Overview

### Core Server Components

#### `config.ts`
Server configuration including:
- Environment variable validation
- OAuth settings (client ID, secret, redirect URLs)
- JWT configuration for session management
- Valid redirect URIs for security

#### `routes.ts`
Main routing logic that:
- Sets up MCP protocol endpoints (`/mcp`)
- Handles session creation and management
- Implements health checks and utility endpoints
- Manages the lifecycle of MCP server instances per session

#### `mcp-server.ts`
MCP server factory and management:
- Creates MCP server instances for authenticated sessions
- Registers request handlers (tools, sampling)
- Manages server registry for notification routing
- Provides session-based server access

### Authentication System

#### `oauth-server.ts`
Complete OAuth2 implementation for Reddit:
- Authorization endpoint (`/oauth/authorize`)
- Token exchange endpoint (`/oauth/token`)
- PKCE (Proof Key for Code Exchange) support
- JWT-based session tokens
- Well-known OAuth metadata endpoint

#### `auth-store.ts`
In-memory authentication storage:
- Stores Reddit access tokens per session
- Provides auth context for API calls
- Handles session cleanup

### Supporting Infrastructure

#### `middleware.ts`
Express middleware for:
- Rate limiting (configurable per endpoint)
- Protocol version validation
- Request size limits
- CORS handling

#### `session-manager.ts`
Session lifecycle management:
- Tracks active MCP sessions
- Implements session timeouts (30 minutes)
- Handles graceful cleanup
- Provides session monitoring

#### `types.ts`
TypeScript interfaces for:
- OAuth flow types
- Session data structures
- Server configuration

## Request Flow

1. **Initial Connection**
   ```
   Client → /oauth/authorize → Reddit OAuth → /oauth/callback → JWT Token
   ```

2. **MCP Connection**
   ```
   Client (with JWT) → /mcp → Session Creation → MCP Server Instance
   ```

3. **Subsequent Requests**
   ```
   Client → /mcp (with session ID) → Route to Existing Session → Handle Request
   ```

## Key Features

### Multi-User Support
- Each user gets their own MCP server instance
- Sessions are isolated with separate auth contexts
- Supports concurrent users on the same deployment

### Security
- JWT tokens for session management
- PKCE for OAuth security
- Rate limiting to prevent abuse
- Request size limits
- CORS properly configured

### Session Management
- Automatic timeout after 30 minutes of inactivity
- Graceful cleanup of resources
- Session monitoring endpoints

## Configuration

Required environment variables:
```bash
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_jwt_secret_min_32_chars
```

Optional:
```bash
PORT=3000
OAUTH_ISSUER=https://your-domain.com
```

## Error Handling

The server implements comprehensive error handling:
- OAuth errors return appropriate error pages
- MCP errors follow the JSON-RPC error format
- Session errors trigger cleanup and re-authentication
- All errors are logged with context

## Extending the Server

To add new functionality:

1. **New Routes**: Add to `routes.ts`
2. **New Middleware**: Add to `middleware.ts` and apply in routes
3. **New Auth Methods**: Extend `oauth-server.ts`
4. **New Session Features**: Modify `session-manager.ts`