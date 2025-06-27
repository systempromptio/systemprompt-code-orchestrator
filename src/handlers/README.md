# Handler Functions

This directory contains the core handler functions that process MCP (Model Context Protocol) requests and implement the business logic for interacting with Reddit.

## Overview

Handlers are the bridge between the MCP protocol and Reddit's API. They:
- Process incoming tool calls from AI clients
- Execute Reddit API operations
- Handle AI-assisted content generation through sampling
- Send notifications about operation results

## File Structure

### Core Handlers

#### `tool-handlers.ts`
Main entry point for tool execution:
- Routes tool calls to appropriate handlers
- Validates tool arguments
- Handles errors consistently
- Returns properly formatted MCP responses

#### `sampling.ts`
Manages AI-assisted content generation:
- Sends sampling requests to the AI client
- Routes responses to appropriate callbacks
- Handles session-specific server instances
- Provides progress notifications

#### `notifications.ts`
Notification system for real-time updates:
- Operation status notifications
- Progress tracking
- Error notifications
- Broadcast to all sessions or specific session

#### `prompt-handlers.ts`
Manages prompt templates for tools:
- Provides system prompts for each tool
- Currently returns empty (prompts defined in constants)

#### `resource-handlers.ts`
Resource management for MCP protocol:
- Lists available resources
- Currently implements minimal resource support

### Callback Handlers (`/callbacks`)

Handlers that process AI-generated content:

- **`create-post.ts`** - Posts AI-generated content to Reddit
- **`create-comment.ts`** - Creates comments with AI assistance
- **`create-message.ts`** - Sends private messages
- **`suggest-action.ts`** - Analyzes content and suggests actions

### Tool Handlers (`/tools`)

Individual tool implementations:

#### Search and Discovery
- **`search-reddit.ts`** - Search posts across Reddit
- **`get-channel.ts`** - Get subreddit information

#### Content Retrieval
- **`get-post.ts`** - Fetch post details and comments
- **`get-comment.ts`** - Get specific comment thread
- **`get-notifications.ts`** - Retrieve user notifications

#### Content Creation
- **`create-post.ts`** - Submit new posts
- **`create-comment.ts`** - Reply to posts/comments
- **`create-message.ts`** - Send private messages

### Supporting Files

#### `action-schema.ts`
JSON schema definitions for:
- Suggested actions structure
- Validation of AI responses

## Request Flow

### Tool Execution Flow
```
1. Client sends tool call → tool-handlers.ts
2. Handler validates arguments
3. Handler calls specific tool function
4. Tool executes Reddit API call
5. Result formatted and returned
6. Notification sent about completion
```

### Sampling Flow
```
1. Tool needs AI assistance → sends sampling request
2. sampling.ts routes to correct server instance
3. Client generates content with AI
4. Callback handler receives result
5. Callback executes Reddit operation
6. Notification sent with outcome
```

## Key Patterns

### Authentication Context
All handlers receive authentication context through:
```typescript
interface MCPToolContext {
  sessionId: string;
  authInfo: RedditAuthInfo;
}
```

### Error Handling
Consistent error handling across all handlers:
- Validation errors return clear messages
- API errors are wrapped with context
- All errors logged with details
- User-friendly error messages

### Notification Pattern
Operations follow this pattern:
1. Send "operation started" notification
2. Execute operation
3. Send result notification (success or error)

## Adding New Tools

To add a new tool:

1. Create handler in `/tools` directory
2. Add tool definition in `/constants/tool`
3. Register in `tool-handlers.ts`
4. Add to tool list in constants
5. Implement proper error handling
6. Add notifications for user feedback

## Example Tool Handler

```typescript
export async function handleRedditSearch(
  args: SearchRedditArgs,
  context: MCPToolContext
): Promise<ToolResponse> {
  try {
    // Validate arguments
    validateSearchArgs(args);
    
    // Get Reddit service with auth
    const reddit = new RedditService(context.authInfo);
    
    // Execute search
    const results = await reddit.search({
      query: args.query,
      subreddit: args.subreddit,
      sort: args.sort,
      limit: args.limit
    });
    
    // Send success notification
    await sendOperationNotification(
      'search_reddit',
      `Found ${results.length} results`,
      context.sessionId
    );
    
    // Return formatted response
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2)
      }]
    };
  } catch (error) {
    // Send error notification
    await sendOperationNotification(
      'search_reddit',
      `Search failed: ${error.message}`,
      context.sessionId
    );
    throw error;
  }
}
```

## Testing Considerations

When testing handlers:
- Mock Reddit API responses
- Test error scenarios
- Verify notification sending
- Check session handling
- Validate argument parsing

## Extending for New MCP Servers

When adapting this template for a new MCP server:

1. **Replace Tool Handlers**: Create handlers for your domain
2. **Update Callbacks**: Implement callbacks for your use cases
3. **Modify Notifications**: Adapt notification types
4. **Change Services**: Replace Reddit service with your API
5. **Update Types**: Define your domain-specific types