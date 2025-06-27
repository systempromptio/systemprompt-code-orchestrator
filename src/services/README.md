# Services Directory

This directory contains service implementations that handle external API interactions, data processing, and business logic. Services encapsulate all the complexity of working with external systems, providing clean interfaces for handlers.

## Overview

Services are the "how" of the MCP server:
- How to authenticate with external APIs
- How to make API requests
- How to transform data
- How to handle errors and retries

## Directory Structure

### Core Services

#### `systemprompt-service.ts`
Integration with SystemPrompt.io API:
- Processes sampling callbacks
- Handles API authentication
- Manages request/response flow
- Provides error handling

### Reddit Services (`/reddit`)

Comprehensive Reddit API integration:

#### Core Components
- **`reddit-service.ts`** - Main facade coordinating all Reddit operations
- **`reddit-auth-service.ts`** - OAuth authentication and token management
- **`reddit-fetch-service.ts`** - Base class for API requests with common functionality
- **`reddit-post-service.ts`** - Post operations (create, fetch, search)
- **`reddit-subreddit-service.ts`** - Subreddit-specific operations
- **`index.ts`** - Public exports

## Architecture Patterns

### Singleton Pattern
All services use singleton pattern for global access:
```typescript
class MyService {
  private static instance: MyService;
  
  public static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService();
    }
    return MyService.instance;
  }
}
```

### Facade Pattern
Main service coordinates specialized services:
```typescript
class RedditService {
  private authService: RedditAuthService;
  private postService: RedditPostService;
  
  // Coordinates multiple services for complex operations
}
```

### Inheritance Hierarchy
Base classes provide common functionality:
```
RedditFetchService (base)
  ├── RedditPostService
  └── RedditSubredditService
```

## Key Features

### Authentication Management
- OAuth2 flow implementation
- Token storage and refresh
- Session-based authentication
- Automatic retry on auth failure

### API Request Handling
- Rate limiting compliance
- Automatic retries with backoff
- Error transformation
- Response caching where appropriate

### Data Transformation
- Convert Reddit API responses to internal formats
- Handle API versioning differences
- Normalize data structures
- Type-safe interfaces

## Reddit Service Details

### RedditService
Main entry point providing:
- Post operations (search, create, fetch)
- Comment operations (create, fetch, reply)
- Subreddit operations (info, posts, search)
- User operations (messages, notifications)

### RedditAuthService
Handles authentication lifecycle:
- Store credentials per session
- Validate token expiry
- Refresh tokens when needed
- Provide auth headers

### RedditFetchService
Base class providing:
- HTTP request methods (GET, POST, PUT)
- Error handling and retry logic
- Rate limit management
- Response parsing

### RedditPostService
Specialized for post operations:
- Create posts with validation
- Search with various filters
- Fetch post details and comments
- Handle post metadata

### RedditSubredditService
Subreddit-specific operations:
- Fetch subreddit info
- Get subreddit posts
- Check posting rules
- Analyze subreddit activity

## Error Handling

Services implement comprehensive error handling:

```typescript
try {
  const result = await apiCall();
  return result;
} catch (error) {
  if (error.status === 401) {
    // Handle auth error
    await this.refreshAuth();
    return this.retry();
  } else if (error.status === 429) {
    // Handle rate limit
    await this.waitForRateLimit();
    return this.retry();
  }
  // Transform to user-friendly error
  throw new ServiceError(message, code);
}
```

## Adding New Services

To add a new service:

1. **Create Service Class**
   ```typescript
   export class MyService {
     private static instance: MyService;
     
     public static getInstance(): MyService {
       // Singleton implementation
     }
     
     public async myOperation(): Promise<Result> {
       // Operation implementation
     }
   }
   ```

2. **Implement Error Handling**
   - Define custom error types
   - Transform API errors
   - Add retry logic

3. **Add Authentication**
   - Store credentials
   - Add auth headers
   - Handle refresh

4. **Export Public Interface**
   - Export from index.ts
   - Document methods
   - Provide types

## Testing Services

When testing services:
- Mock external API calls
- Test error scenarios
- Verify retry logic
- Check rate limit handling
- Test auth refresh

## Extending for Other APIs

To adapt for a different API:

1. **Replace Reddit Directory**
   - Create new API directory (e.g., `/twitter`)
   - Implement auth service
   - Create API-specific services

2. **Update SystemPrompt Service**
   - Modify for your use case
   - Update callback handling

3. **Implement Base Classes**
   - Create fetch base class
   - Add common functionality
   - Implement retry logic

4. **Define Data Models**
   - Create TypeScript interfaces
   - Add validation
   - Implement transformers

This service layer provides a clean separation between external APIs and the MCP protocol implementation, making it easy to adapt for different platforms.