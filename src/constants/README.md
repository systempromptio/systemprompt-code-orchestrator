# Constants Directory

This directory contains all static definitions, schemas, and prompts used throughout the Reddit MCP server. It serves as the single source of truth for tool definitions and sampling configurations.

## Overview

Constants define the "what" of the MCP server:
- What tools are available
- What parameters they accept
- What prompts guide AI responses
- What schemas validate data

## Directory Structure

### Core Files

#### `tools.ts`
Master list of all available tools:
- Exports array of tool definitions
- Each tool references its schema in `/tool` directory
- Used by `tool-handlers.ts` to list available tools

#### `message-handler.ts`
Message formatting utilities:
- Structures Reddit content for display
- Formats posts, comments, and messages
- Provides consistent output format

### Server Configuration (`/server`)

Server-level configuration and constants:
- **`server-config.ts`** - MCP server metadata and capabilities
- Protocol version and feature declarations
- Session and rate limiting configuration

### Tool Definitions (`/tool`)

Each file defines a tool's schema and metadata:

#### Search and Discovery Tools
- **`search-reddit.ts`** - Search parameters and description
- **`get-channel.ts`** - Subreddit info retrieval schema

#### Content Retrieval Tools
- **`get-post.ts`** - Post fetching parameters
- **`get-comment.ts`** - Comment thread schema
- **`get-notifications.ts`** - Notification retrieval

#### Content Creation Tools
- **`create-post.ts`** - Post submission schema
- **`create-comment.ts`** - Comment creation parameters
- **`create-message.ts`** - Private message schema


### Sampling Definitions (`/sampling`)

Prompts and schemas for AI-assisted operations:

- **`create-post.ts`** - Post generation prompts and schema
- **`create-comment.ts`** - Comment generation guidance
- **`create-message.ts`** - Message composition prompts
- **`suggest-action.ts`** - Action suggestion prompts
- **`index.ts`** - Exports all sampling messages

## Schema Structure

Each tool definition follows this pattern:

```typescript
export const TOOL_NAME = {
  name: 'tool_name',
  description: 'What this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description'
      },
      param2: {
        type: 'number',
        description: 'Another parameter',
        minimum: 0
      }
    },
    required: ['param1']
  }
};
```

## Sampling Message Structure

Sampling definitions include:

```typescript
export const SAMPLING_NAME = {
  systemPrompt: 'Instructions for the AI',
  schemaName: 'response_schema_name',
  schemaDescription: 'What the schema represents',
  schema: {
    // JSON Schema for validating AI responses
  }
};
```

## Key Patterns

### Consistent Naming
- Tool constants: `TOOL_NAME` (uppercase)
- Sampling constants: `SAMPLING_NAME` (uppercase)
- Schema properties: `camelCase`

### Schema Validation
All schemas use JSON Schema Draft 7:
- Required fields clearly marked
- Descriptions for all properties
- Type constraints and validations
- Examples where helpful

### Prompt Engineering
Sampling prompts follow best practices:
- Clear instructions
- Expected format specification
- Examples when needed
- Constraints and guidelines

## Adding New Tools

To add a new tool:

1. **Create Schema File**
   ```typescript
   // /tool/my-new-tool.ts
   export const MY_NEW_TOOL = {
     name: 'my_new_tool',
     description: 'What it does',
     inputSchema: { ... }
   };
   ```

2. **Add to Tools List**
   ```typescript
   // tools.ts
   import { MY_NEW_TOOL } from './tool/my-new-tool';
   
   export const TOOLS = [
     // ... existing tools
     MY_NEW_TOOL
   ];
   ```

3. **Create Handler**
   Implement the handler in `/handlers/tools/`

## Adding Sampling Operations

For AI-assisted operations:

1. **Create Sampling Definition**
   ```typescript
   // /sampling/my-operation.ts
   export const MY_OPERATION_SAMPLING = {
     systemPrompt: 'Generate a ...',
     schema: { ... }
   };
   ```

2. **Export from Index**
   ```typescript
   // /sampling/index.ts
   export * from './my-operation';
   ```

3. **Implement Callback**
   Create callback handler in `/handlers/callbacks/`

## Best Practices

### Schema Design
- Make required fields minimal
- Provide sensible defaults
- Use clear, descriptive names
- Add helpful descriptions

### Prompt Design
- Be specific about output format
- Include examples for complex tasks
- Set clear boundaries
- Guide tone and style

### Validation
- Use strict type checking
- Validate string formats
- Set reasonable limits
- Provide clear error messages

## Maintenance

When updating schemas:
1. Consider backward compatibility
2. Update handler validation
3. Test with various inputs
4. Update documentation

This directory is the foundation of the MCP server's interface - changes here affect how AI clients interact with Reddit.