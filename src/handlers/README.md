# Handler Functions

This directory contains the core handler functions that process MCP (Model Context Protocol) requests and implement the business logic for the SystemPrompt Coding Agent.

## Overview

Handlers are the bridge between the MCP protocol and the coding agent orchestration system. They:
- Process incoming tool calls from AI clients
- Execute agent management operations
- Handle task creation and monitoring
- Send notifications about operation results

## File Structure

### Core Handlers

#### `tool-handlers.ts`
Main entry point for tool execution:
- Routes tool calls to appropriate handlers
- Validates tool arguments
- Handles errors consistently
- Returns properly formatted MCP responses

#### `notifications.ts`
Notification system for real-time updates:
- Operation status notifications
- Progress tracking
- Error notifications
- Broadcast to all sessions or specific session

#### `prompt-handlers.ts`
Manages prompt templates for tools:
- Provides system prompts for each tool
- Currently returns empty (prompts have been removed)

#### `resource-handlers.ts`
Resource management for MCP protocol:
- Lists available resources
- Currently implements minimal resource support

#### `roots-handlers.ts`
Handles filesystem root listings for the MCP protocol

#### `resource-templates-handler.ts`
Manages resource templates for dynamic URIs

### Callback Handlers (`/callbacks`)

Handlers that process AI-generated content:
- **`suggest-action.ts`** - Analyzes content and suggests actions

### Tool Handlers (`/tools`)

Individual tool implementations:

#### Orchestrator Tools (`/tools/orchestrator`)
- **`create-task.ts`** - Create new coding tasks
- **`check-status.ts`** - Check task execution status
- **`report-task.ts`** - Report task completion
- **`cancel-task.ts`** - Cancel running tasks
- **`list-tasks.ts`** - List all tasks
- **`get-task-output.ts`** - Retrieve task output
- **`cleanup-agents.ts`** - Clean up agent processes
- **`show-agent-output.ts`** - Display agent output

### Prompt Handlers (`/prompts`)

Template prompts for common coding tasks:
- **`bug-fixing.ts`** - Bug fixing strategies
- **`refactoring.ts`** - Code refactoring guidelines
- **`unit-testing.ts`** - Unit test creation
- **`react-components.ts`** - React component development

## Request Flow

### Tool Execution Flow
```
1. Client sends tool call → tool-handlers.ts
2. Handler validates arguments
3. Handler calls specific tool function
4. Tool executes agent operation
5. Result formatted and returned
6. Notification sent about completion
```

## Key Patterns

### Error Handling
Consistent error handling across all handlers:
- Validation errors return clear messages
- Operation errors are wrapped with context
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
2. Add tool definition in handler
3. Register in `tool-handlers.ts`
4. Implement proper error handling
5. Add notifications for user feedback

## Example Tool Handler

```typescript
export async function handleCreateTask(
  args: CreateTaskArgs
): Promise<ToolResponse> {
  try {
    // Validate arguments
    validateTaskArgs(args);
    
    // Create task
    const taskId = await taskManager.createTask({
      description: args.description,
      agent: args.agent,
      requirements: args.requirements
    });
    
    // Send success notification
    await sendOperationNotification(
      'create_task',
      `Task created with ID: ${taskId}`
    );
    
    // Return formatted response
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ taskId }, null, 2)
      }]
    };
  } catch (error) {
    // Send error notification
    await sendOperationNotification(
      'create_task',
      `Task creation failed: ${error.message}`
    );
    throw error;
  }
}
```

## Testing Considerations

When testing handlers:
- Mock agent service responses
- Test error scenarios
- Verify notification sending
- Check session handling
- Validate argument parsing

## Extending the System

When adding new functionality:

1. **Create Tool Handlers**: Implement handlers for new operations
2. **Update Services**: Add new agent services if needed
3. **Modify Notifications**: Add appropriate notification types
4. **Define Types**: Create TypeScript interfaces for new data
5. **Document Usage**: Update this README with new patterns