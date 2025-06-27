# Authentication Guide for E2E Tests

## Overview

The Reddit MCP Server uses a two-layer authentication system:

1. **Reddit OAuth Application**: Server authenticates with Reddit using client credentials
2. **MCP JWT Tokens**: Server issues JWT tokens containing Reddit user tokens

## Token Flow

```
User → MCP Server → Reddit API
         ↓
    MCP JWT Token
    (contains Reddit tokens)
```

## Authentication Process

### 1. Server Configuration

The server needs Reddit app credentials in `.env`:
```env
REDDIT_CLIENT_ID=your_reddit_app_id
REDDIT_CLIENT_SECRET=your_reddit_app_secret
JWT_SECRET=your-secure-random-string
```

### 2. OAuth Flow

1. Client makes unauthenticated request to `/mcp`
2. Server returns 401 with `WWW-Authenticate` header
3. Client follows OAuth flow to authorize with Reddit
4. Server exchanges Reddit auth code for tokens
5. Server creates MCP JWT containing Reddit tokens
6. Client uses MCP JWT for all subsequent requests

### 3. Token Structure

MCP JWT payload contains:
```json
{
  "sub": "RedditUsername",
  "reddit_access_token": "...",
  "reddit_refresh_token": "...",
  "iat": 1750856286,
  "exp": 1750942686,
  "aud": "reddit-mcp-server",
  "iss": "http://localhost:3000"
}
```

## Running Tests

### Prerequisites

1. Valid MCP JWT token (obtained through OAuth flow)
2. Token saved in `e2e-test/.env`:
   ```env
   MCP_ACCESS_TOKEN=your-mcp-jwt-token
   ```

### Execution

```bash
cd e2e-test
npm install
npm test
```

## Common Issues

### 403 Forbidden on reddit://config

This occurs when the Reddit token lacks the `mysubreddits` scope. The test suite handles this gracefully as it's an expected limitation based on the OAuth scopes requested.

### Token Expiration

MCP JWT tokens expire after 24 hours. You'll need to go through the OAuth flow again to get a fresh token.

## Security Notes

1. **Never commit tokens** to version control
2. **Tokens are user-specific** - each user needs their own OAuth flow
3. **Server validates all tokens** using the configured JWT_SECRET
4. **Reddit tokens are embedded** in MCP JWT for API access