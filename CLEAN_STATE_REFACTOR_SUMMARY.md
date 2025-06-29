# Clean State Tool Refactor Summary

## Overview
The `clean_state` tool has been refactored to have a simpler interface that only accepts an optional ID parameter.

## Changes Made

### 1. Tool Schema (`src/constants/tool/orchestrator/clean-state.ts`)
- **Before**: Complex schema with multiple boolean options (clean_tasks, clean_sessions, keep_recent, force, dry_run)
- **After**: Simple schema with single optional `id` parameter
- **Description**: "Delete a specific task by ID or delete all tasks if no ID is provided"

### 2. Handler Implementation (`src/handlers/tools/orchestrator/clean-state.ts`)
- Simplified logic to only handle two cases:
  - If `id` is provided: Delete that specific task
  - If `id` is not provided: Delete all tasks
- Updated logging messages to reflect "deletion" instead of "cleanup"
- Returns summary of deleted tasks

### 3. Type Definition (`src/handlers/tools/orchestrator/utils/types.ts`)
- Updated `CleanStateArgsSchema` to use `id` instead of `task_id`
- Schema now has single optional string field

## Usage Examples

```typescript
// Delete a specific task
await client.callTool({
  name: 'clean_state',
  arguments: {
    id: 'task_123'
  }
});

// Delete all tasks
await client.callTool({
  name: 'clean_state',
  arguments: {}
});
```

## Benefits
1. **Simpler Interface**: Users only need to know about one optional parameter
2. **Clearer Intent**: The tool name and description clearly indicate what it does
3. **Consistent Behavior**: Always deletes tasks, either one or all
4. **Less Complex**: Removed unnecessary options that added complexity