# Utils Directory

This directory contains utility functions and helpers that provide reusable functionality across the application. These utilities handle common tasks like validation, data transformation, logging, and protocol compliance.

## Overview

Utilities are the "helpers" of the MCP server:
- Helper functions for common tasks
- Data transformation and formatting
- Validation and error handling
- Cross-cutting concerns

## File Structure

### Core Utilities

#### `logger.ts`
Centralized logging system:
- Structured logging with levels
- Context-aware log messages
- Performance tracking
- Error logging with stack traces

#### `validation.ts`
Input validation utilities:
- Schema-based validation
- Type checking functions
- Parameter validation
- Error message formatting

#### `tool-validation.ts`
Tool-specific validation:
- Validates tool arguments
- Checks required parameters
- Type-safe validation
- Clear error messages

### Data Transformation

#### `reddit-transformers.ts`
Reddit API data transformations:
- Convert API responses to internal types
- Format Reddit content for display
- Handle nested data structures
- Normalize inconsistent data

#### `message-handlers.ts`
Message processing utilities:
- Format content for MCP responses
- Structure multi-part messages
- Handle different content types
- Provide consistent output

## Key Functions

### Logging
```typescript
logger.info('Operation started', { 
  operation: 'search',
  params: { query: 'test' }
});

logger.error('Operation failed', {
  error: error.message,
  stack: error.stack
});
```

### Validation
```typescript
// Validate required string
validateRequiredString(value, 'fieldName');

// Validate optional number with range
validateOptionalNumber(value, 'fieldName', 0, 100);

// Validate enum value
validateEnum(value, ['option1', 'option2'], 'fieldName');
```

### Transformation
```typescript
// Transform Reddit post
const post = transformRedditPost(apiResponse);

// Format for display
const formatted = formatRedditContent(post);
```

## Utility Patterns

### Error Handling
Consistent error creation:
```typescript
export function createValidationError(
  field: string, 
  message: string
): Error {
  return new Error(`Validation error for ${field}: ${message}`);
}
```

### Type Guards
Runtime type checking:
```typescript
export function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
```

### Data Normalization
Consistent data formatting:
```typescript
export function normalizeUsername(username: string): string {
  return username.toLowerCase().trim();
}
```

### Safe Access
Defensive programming:
```typescript
export function safeGet<T>(
  obj: any, 
  path: string, 
  defaultValue: T
): T {
  const value = path.split('.').reduce(
    (acc, part) => acc?.[part], 
    obj
  );
  return value ?? defaultValue;
}
```

## Best Practices

### Function Design
- Single responsibility
- Clear parameter names
- Defensive programming
- Proper error handling

### Naming Conventions
- Functions: `camelCase` verbs
- Constants: `UPPER_SNAKE_CASE`
- Types: `PascalCase`
- Private functions: `_prefixed`

### Documentation
- JSDoc for public functions
- Clear parameter descriptions
- Return type documentation
- Usage examples

### Testing
- Unit test all utilities
- Test edge cases
- Test error conditions
- Mock external dependencies

## Adding New Utilities

To add a new utility:

1. **Create Utility File**
   ```typescript
   // my-utility.ts
   
   /**
    * Does something useful
    * @param input - The input data
    * @returns The processed result
    */
   export function myUtility(input: string): string {
     // Implementation
   }
   ```

2. **Add Tests**
   ```typescript
   // __tests__/my-utility.test.ts
   describe('myUtility', () => {
     it('should process input correctly', () => {
       expect(myUtility('test')).toBe('expected');
     });
   });
   ```

3. **Export if Needed**
   - Export from specific domain file
   - Or create new export file

## Common Utilities Reference

### Validation Functions
- `validateRequiredString()` - Ensures non-empty string
- `validateOptionalString()` - Validates optional string
- `validateUrl()` - Validates URL format
- `validateEnum()` - Validates enum values
- `validateArray()` - Validates array with items

### Transformation Functions
- `transformRedditPost()` - Reddit post transformation
- `transformRedditComment()` - Comment transformation
- `formatRedditContent()` - Content formatting
- `truncateText()` - Text truncation with ellipsis

### Helper Functions
- `delay()` - Promise-based delay
- `retry()` - Retry with backoff
- `chunk()` - Array chunking
- `debounce()` - Function debouncing

## Extending for Other APIs

When adapting for a new API:

1. **Replace API Transformers**
   - Remove `reddit-transformers.ts`
   - Create your API transformers
   - Update type imports

2. **Update Validation**
   - Add API-specific validation
   - Update parameter checks
   - Add new constraints

3. **Maintain Core Utils**
   - Keep logger
   - Keep base validation
   - Keep general helpers

This utility layer provides the foundation for consistent, reliable operations throughout the MCP server.