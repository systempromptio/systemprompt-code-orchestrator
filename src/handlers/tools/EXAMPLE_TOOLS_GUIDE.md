# MCP Example Tools Guide

This guide explains the three example tools that demonstrate key MCP (Model Context Protocol) patterns: elicitation, sampling, and structured data.

## Overview

These example tools serve as tutorials for developers building MCP servers. They demonstrate:

1. **Elicitation** - How to request additional information from users
2. **Sampling** - How to leverage AI for content generation
3. **Structured Data** - How to return machine-readable data alongside text

## Example Tools

### 1. Elicitation Example (`elicitation_example`)

Demonstrates how servers can request additional information from users during tool execution.

**Use Cases:**
- Requesting user credentials
- Gathering preferences
- Collecting profile information

**Example Usage:**
```json
{
  "tool": "elicitation_example",
  "arguments": {
    "elicitationType": "user_profile",
    "customMessage": "We need your profile info to personalize the experience"
  }
}
```

**Elicitation Types:**
- `user_profile` - Name, email, preferences
- `preferences` - Content types, sort order, NSFW settings
- `credentials` - API keys and secrets

**Key Pattern:**
The tool creates an elicitation request with a JSON schema that defines what information is needed. The client prompts the user and returns their response.

### 2. Sampling Example (`sampling_example`)

Demonstrates how servers can make nested LLM calls to enable AI-assisted operations.

**Use Cases:**
- Content summarization
- Text generation
- Language translation
- Content analysis

**Example Usage:**
```json
{
  "tool": "sampling_example",
  "arguments": {
    "taskType": "summarize",
    "content": "Long article text here..."
  }
}
```

**Task Types:**
- `summarize` - Create concise summaries
- `generate` - Generate new content with style options
- `analyze` - Provide detailed analysis and insights
- `translate` - Translate to other languages

**Key Pattern:**
The tool creates a sampling request with messages and model preferences. The client uses its LLM to generate a response that the server can then use.

### 3. Structured Data Example (`structured_data_example`)

Demonstrates how tools can return both human-readable text and machine-readable structured data.

**Use Cases:**
- Returning API data in structured format
- Providing data for programmatic consumption
- Enabling type-safe client integrations

**Example Usage:**
```json
{
  "tool": "structured_data_example",
  "arguments": {
    "dataType": "user",
    "includeNested": true
  }
}
```

**Data Types:**
- `user` - User profile with stats and preferences
- `analytics` - Metrics and trends data
- `weather` - Location and forecast information
- `product` - Product details with pricing and inventory

**Key Pattern:**
The tool returns both a text description and a `structuredContent` field containing the full data object that conforms to a defined schema.

## Implementation Details

### File Locations

- **Tool Handlers**: `/src/handlers/tools/`
  - `elicitation-example.ts`
  - `sampling-example.ts`
  - `structured-data-example.ts`

- **Tool Definitions**: `/src/constants/tool/`
  - `elicitation-example.ts`
  - `sampling-example.ts`
  - `structured-data-example.ts`

### Adding to Your MCP Server

1. **Copy the pattern** from these example tools
2. **Adapt for your domain** - Replace example data with your API
3. **Define schemas** - Create appropriate JSON schemas
4. **Implement handlers** - Process requests and return responses

### Testing the Examples

You can test these tools using any MCP client:

```bash
# List all tools including examples
mcp-client list-tools

# Call elicitation example
mcp-client call-tool elicitation_example '{"elicitationType": "preferences"}'

# Call sampling example
mcp-client call-tool sampling_example '{"taskType": "analyze", "content": "Sample text"}'

# Call structured data example
mcp-client call-tool structured_data_example '{"dataType": "analytics", "includeNested": true}'
```

## Best Practices

### Elicitation
- Keep schemas simple and flat
- Only request essential information
- Provide clear messages to users
- Handle all response types (accept/reject/cancel)

### Sampling
- Choose appropriate model hints
- Balance intelligence vs speed priorities
- Set reasonable token limits
- Use callbacks for async processing

### Structured Data
- Always include text representation
- Define clear output schemas
- Validate structured content
- Handle errors gracefully

## Extending the Examples

These examples are designed to be modified:

1. **Replace mock data** with real API calls
2. **Add authentication** where needed
3. **Implement actual elicitation** flows
4. **Connect to real LLMs** for sampling
5. **Return real structured data** from your services

## Additional Resources

- [MCP Elicitation Spec](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation)
- [MCP Sampling Spec](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling)
- [MCP Tools Spec](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)

These example tools provide a foundation for understanding and implementing advanced MCP patterns in your own servers.