# Server Configuration Constants

This directory contains server-level configuration and constants for the Reddit MCP server.

## Overview

Server configuration has been moved here from `/src/config` to better organize constants and configuration together. This follows the pattern of keeping all static definitions in the constants directory.

## Files

### `server-config.ts`

Defines the MCP server metadata and capabilities:

- **Server Implementation** (`serverConfig`)
  - Server name and version
  - Metadata including description, icon, and features
  - Runtime environment information
  - Custom data like supported Reddit scopes

- **Server Capabilities** (`serverCapabilities`)
  - **Tools**: Executable functions (search, create posts, etc.)
  - **Sampling**: AI-assisted content generation
  - **Prompts**: Pre-defined templates (currently empty)
  - **Resources**: Structured data access (currently empty)

- **Additional Configuration** (`SERVER_CONFIG`)
  - Session timeout settings
  - Rate limiting configuration
  - Request size limits
  - Protocol version information

## MCP Protocol Version

The server uses MCP protocol version **2025-06-18** (latest) as defined in the specification.

## Capabilities Explained

### Tools
Functions that the AI model can call to interact with Reddit:
- Search posts and comments
- Retrieve subreddit information
- Create posts and comments
- Send messages
- Analyze content

### Sampling
Enables nested LLM calls for:
- Content generation
- Text summarization
- Language translation
- Content analysis

### Prompts
Pre-defined templates for common operations. Currently not implemented but the capability is declared for future use.

### Resources
Structured data that can be exposed to clients. Currently not implemented but the capability is declared for future use.

## Usage

Import the configuration in server initialization:

```typescript
import { serverConfig, serverCapabilities } from '../constants/server/server-config';

const server = new Server(serverConfig, serverCapabilities);
```

## Notes

- The protocol version is handled by the MCP SDK
- Empty capability objects (`{}`) indicate default settings
- Additional capabilities like elicitation are implemented through tools
EOF < /dev/null
