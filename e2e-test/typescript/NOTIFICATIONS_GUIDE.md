# MCP SDK Notifications Guide

## Overview

The MCP SDK uses a schema-based approach for handling notifications. Each notification type has a corresponding schema that must be imported and used when setting up notification handlers.

## Common Error

The error "Cannot read properties of undefined (reading 'method')" occurs when trying to use the old object-based notification handler syntax:

```typescript
// ❌ INCORRECT - This will cause the error
client.setNotificationHandler({
  resourceListChanged: async () => {
    // handler code
  }
});
```

## Correct Usage

Import the notification schemas and set handlers individually:

```typescript
// ✅ CORRECT
import { ResourceListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';

client.setNotificationHandler(ResourceListChangedNotificationSchema, (notification) => {
  console.log('Resource list changed:', notification);
});
```

## Available Notification Schemas

### 1. Resource Notifications
```typescript
import { 
  ResourceListChangedNotificationSchema,  // Fired when resources are added/removed
  ResourceUpdatedNotificationSchema       // Fired when a resource's content changes
} from '@modelcontextprotocol/sdk/types.js';

// Usage
client.setNotificationHandler(ResourceListChangedNotificationSchema, (notification) => {
  console.log('Resource list changed');
});

client.setNotificationHandler(ResourceUpdatedNotificationSchema, (notification) => {
  console.log('Resource updated:', notification.params.uri);
});
```

### 2. Tool Notifications
```typescript
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';

client.setNotificationHandler(ToolListChangedNotificationSchema, (notification) => {
  console.log('Tool list changed');
});
```

### 3. Prompt Notifications
```typescript
import { PromptListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';

client.setNotificationHandler(PromptListChangedNotificationSchema, (notification) => {
  console.log('Prompt list changed');
});
```

### 4. Progress Notifications
```typescript
import { ProgressNotificationSchema } from '@modelcontextprotocol/sdk/types.js';

client.setNotificationHandler(ProgressNotificationSchema, (notification) => {
  const { progress, total } = notification.params;
  const percentage = total ? Math.round((progress / total) * 100) : 0;
  console.log(`Progress: ${percentage}%`);
});
```

### 5. Logging Notifications
```typescript
import { LoggingMessageNotificationSchema } from '@modelcontextprotocol/sdk/types.js';

client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
  console.log(`[${notification.params.level}] ${notification.params.data}`);
});
```

### 6. Other Notifications
```typescript
import { 
  RootsListChangedNotificationSchema,   // Root directories changed
  CancelledNotificationSchema,          // Operation cancelled
  InitializedNotificationSchema         // Server initialized
} from '@modelcontextprotocol/sdk/types.js';
```

## Important Notes

1. **Handler Replacement**: Setting a new handler for the same notification type replaces the previous handler.

2. **Enable Notifications**: When creating the client, ensure notifications are enabled in capabilities:
   ```typescript
   const client = new Client(
     { name: 'my-client', version: '1.0.0' },
     {
       capabilities: {
         resources: {
           subscribe: true,
           listChanged: true
         }
       }
     }
   );
   ```

3. **Notification Structure**: All notifications follow the JSON-RPC notification format:
   ```typescript
   {
     method: "notifications/resources/list_changed",
     params: { /* notification-specific parameters */ }
   }
   ```

4. **Error Handling**: Notification handlers should not throw errors. If they do, the client will handle them gracefully without affecting the connection.

## Example: Complete Setup

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { 
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ProgressNotificationSchema
} from '@modelcontextprotocol/sdk/types.js';

// Create client with notifications enabled
const client = new Client(
  { name: 'my-client', version: '1.0.0' },
  {
    capabilities: {
      resources: {
        subscribe: true,
        listChanged: true
      }
    }
  }
);

// Set up notification handlers
client.setNotificationHandler(ResourceListChangedNotificationSchema, (notification) => {
  console.log('Resource list changed at:', new Date().toISOString());
});

client.setNotificationHandler(ResourceUpdatedNotificationSchema, (notification) => {
  console.log('Resource updated:', notification.params.uri);
});

client.setNotificationHandler(ProgressNotificationSchema, (notification) => {
  const { progress, total } = notification.params;
  console.log(`Progress: ${progress}/${total}`);
});

// Connect and use the client
await client.connect(transport);
```

## Testing

See the following test files for working examples:
- `test-notifications-simple.ts` - Basic notification handling
- `test-notifications-comprehensive.ts` - All notification types and patterns
- `test-e2e.ts` - Notifications in a real workflow