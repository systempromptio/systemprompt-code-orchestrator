/**
 * @file Resource constants for the MCP server
 * @module constants/resources
 */

/**
 * Resource definitions for the MCP server
 */
export const RESOURCES = [
  {
    uri: "reddit://config",
    name: "Reddit Configuration",
    description: "Current Reddit authentication and configuration settings",
    mimeType: "application/json",
  },
  {
    uri: "guidelines://code-generation",
    name: "Code Generation Guidelines",
    description: "Best practices and guidelines for generating code",
    mimeType: "text/markdown",
  },
  {
    uri: "guidelines://reddit-api",
    name: "Reddit API Guidelines",
    description: "Guidelines for interacting with Reddit API",
    mimeType: "text/markdown",
  },
  {
    uri: "guidelines://content-creation",
    name: "Content Creation Guidelines",
    description: "Guidelines for creating Reddit posts, comments, and messages",
    mimeType: "text/markdown",
  },
  {
    uri: "demo://json-data",
    name: "Demo JSON Data",
    description: "Example JSON resource showing structured data",
    mimeType: "application/json",
  },
  {
    uri: "demo://plain-text",
    name: "Demo Plain Text",
    description: "Example plain text resource",
    mimeType: "text/plain",
  },
  {
    uri: "template://user-profile",
    name: "User Profile Template",
    description: "Dynamic template that includes user information",
    mimeType: "text/markdown",
  },
  {
    uri: "stats://server",
    name: "Server Statistics",
    description: "Real-time server statistics and metrics",
    mimeType: "application/json",
  },
] as const;

/**
 * Resource content templates
 */
export const RESOURCE_CONTENT = {
  CODE_GENERATION_GUIDELINES: `# Code Generation Guidelines

## General Principles
1. **Write clean, readable code** - Use descriptive variable names and add comments where necessary
2. **Follow established patterns** - Maintain consistency with existing codebase conventions
3. **Handle errors gracefully** - Always include proper error handling and validation
4. **Consider performance** - Optimize for efficiency without sacrificing readability
5. **Test your code** - Include unit tests for critical functionality

## Best Practices
- Use TypeScript for type safety
- Follow ESLint rules and prettier formatting
- Implement proper logging for debugging
- Document complex functions with JSDoc comments
- Use async/await for asynchronous operations
- Validate inputs and sanitize user data
- Follow SOLID principles and design patterns

## Security Considerations
- Never expose sensitive data in logs or responses
- Validate and sanitize all user inputs
- Use environment variables for configuration
- Implement proper authentication and authorization
- Follow OWASP security guidelines`,

  REDDIT_API_GUIDELINES: `# Reddit API Guidelines

## Authentication
- Always use OAuth2 for authentication
- Store tokens securely and refresh when needed
- Handle rate limits gracefully

## API Usage
1. **Respect rate limits** - Reddit API has strict rate limiting
2. **Use appropriate endpoints** - Choose the most efficient endpoint for your needs
3. **Handle pagination** - Implement proper pagination for large datasets
4. **Cache responses** - Cache frequently accessed data to reduce API calls

## Content Guidelines
- Follow Reddit's content policy
- Respect subreddit rules and moderation
- Use appropriate flair when posting
- Avoid spam and self-promotion

## Error Handling
- Handle 401 (Unauthorized) by refreshing tokens
- Handle 429 (Too Many Requests) with exponential backoff
- Log errors for debugging but don't expose sensitive data
- Provide meaningful error messages to users`,

  CONTENT_CREATION_GUIDELINES: `# Reddit Content Creation Guidelines

## Creating Posts
1. **Choose the right subreddit** - Ensure your content fits the community
2. **Follow subreddit rules** - Read and follow each subreddit's specific rules
3. **Use descriptive titles** - Make titles clear and engaging
4. **Add appropriate flair** - Use flair to categorize your post
5. **Include relevant content** - Provide value to the community

## Writing Comments
- Be respectful and constructive
- Add to the discussion meaningfully
- Stay on topic
- Use proper formatting (markdown)
- Cite sources when making claims

## Sending Messages
- Keep messages concise and clear
- Use appropriate subject lines
- Be professional and courteous
- Don't spam or harass users
- Respect privacy and boundaries

## Content Quality
- Proofread before posting
- Use proper grammar and spelling
- Format for readability
- Include relevant links and sources
- Update posts with edits when necessary`,

  DEMO_PLAIN_TEXT: `This is a plain text resource demonstrating simple text content.

It can contain multiple lines and paragraphs.

Key features:
- Simple text format
- No special formatting
- Easy to read and process
- Suitable for logs, notes, or simple documentation

This resource type is useful for:
1. Configuration files
2. Log outputs
3. Simple documentation
4. Raw data exports`,
} as const;

/**
 * Server information constants
 */
export const SERVER_INFO = {
  name: "systemprompt-mcp-reddit",
  version: "2.0.0",
} as const;

/**
 * Error messages for resource operations
 */
export const RESOURCE_ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: "Authentication required: Reddit access token not found",
  INVALID_URI: (uri: string) => `Invalid resource URI: ${uri}. Available resources: reddit://config, guidelines://*, demo://*, template://user-profile, stats://server`,
  FETCH_FAILED: (error: unknown) => `Failed to fetch resource: ${error instanceof Error ? error.message : "Unknown error"}`,
  LIST_FAILED: (error: unknown) => `Failed to list resources: ${error instanceof Error ? error.message : "Unknown error"}`,
} as const;