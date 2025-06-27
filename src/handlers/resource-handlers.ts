import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type {
  ListResourcesResult,
  ReadResourceRequest,
  ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';
import { RedditService } from '../services/reddit/reddit-service.js';
import { 
  RESOURCES, 
  RESOURCE_CONTENT, 
  RESOURCE_ERROR_MESSAGES,
  SERVER_INFO
} from '../constants/resources.js';



export async function handleListResources(): Promise<ListResourcesResult> {
  try {
    return { resources: [...RESOURCES] };
  } catch (error) {
    throw new Error(RESOURCE_ERROR_MESSAGES.LIST_FAILED(error));
  }
}

export async function handleResourceCall(
  request: ReadResourceRequest,
  extra?: { authInfo?: AuthInfo },
): Promise<ReadResourceResult> {
  const authInfo = extra?.authInfo;

  try {
    const { uri } = request.params;

    if (uri === "reddit://config") {
      if (!authInfo?.extra?.redditAccessToken) {
        throw new Error(RESOURCE_ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
      }

      const redditService = new RedditService({
        accessToken: authInfo.extra.redditAccessToken as string,
        refreshToken: authInfo.extra.redditRefreshToken as string,
      });

      const config = await redditService.getRedditConfig();
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "application/json",
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }

    if (uri === "guidelines://code-generation") {
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "text/markdown",
            text: RESOURCE_CONTENT.CODE_GENERATION_GUIDELINES,
          },
        ],
      };
    }

    if (uri === "guidelines://reddit-api") {
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "text/markdown",
            text: RESOURCE_CONTENT.REDDIT_API_GUIDELINES,
          },
        ],
      };
    }

    if (uri === "guidelines://content-creation") {
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "text/markdown",
            text: RESOURCE_CONTENT.CONTENT_CREATION_GUIDELINES,
          },
        ],
      };
    }

    if (uri === "demo://json-data") {
      const demoData = {
        title: "Example JSON Resource",
        type: "demonstration",
        features: ["structured data", "nested objects", "arrays"],
        metadata: {
          created: new Date().toISOString(),
          version: "1.0.0",
          author: "MCP Server"
        },
        examples: [
          { id: 1, name: "First Example", active: true },
          { id: 2, name: "Second Example", active: false }
        ]
      };

      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "application/json",
            text: JSON.stringify(demoData, null, 2),
          },
        ],
      };
    }

    if (uri === "demo://plain-text") {
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "text/plain",
            text: RESOURCE_CONTENT.DEMO_PLAIN_TEXT,
          },
        ],
      };
    }

    if (uri === "template://user-profile") {
      const username = authInfo?.extra?.redditUsername || "anonymous_user";
      const timestamp = new Date().toISOString();
      
      const profileTemplate = `# User Profile

**Username**: ${username}
**Generated**: ${timestamp}
**Session Active**: ${authInfo ? "Yes" : "No"}

## Authentication Status
- Reddit Access Token: ${authInfo?.extra?.redditAccessToken ? "✓ Present" : "✗ Missing"}
- Refresh Token: ${authInfo?.extra?.redditRefreshToken ? "✓ Present" : "✗ Missing"}

## Available Actions
Based on your authentication status, you can:
${authInfo?.extra?.redditAccessToken ? 
`- View your notifications and messages
- Access your subreddit subscriptions
- Search Reddit content
- View posts and comments` : 
`- Browse public subreddits (read-only)
- Search public content
- View public posts and comments`}

---
*This is a dynamically generated resource that changes based on the current session.*`;

      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "text/markdown",
            text: profileTemplate,
          },
        ],
      };
    }

    if (uri === "stats://server") {
      const stats = {
        server: {
          name: SERVER_INFO.name,
          version: SERVER_INFO.version,
          uptime: process.uptime(),
          platform: process.platform,
          nodeVersion: process.version,
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: "MB"
        },
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        capabilities: {
          tools: true,
          prompts: true,
          resources: true,
          sampling: true
        }
      };

      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "application/json",
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    }

    throw new Error(RESOURCE_ERROR_MESSAGES.INVALID_URI(uri));
  } catch (error) {
    throw new Error(RESOURCE_ERROR_MESSAGES.FETCH_FAILED(error));
  }
}
