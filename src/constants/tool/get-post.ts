/**
 * @file Tool definition for retrieving Reddit posts
 * @module constants/tool/get-post
 * 
 * @remarks
 * This module defines the MCP tool for fetching complete Reddit posts
 * including their metadata and comment threads.
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/core/tools | MCP Tools}
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP tool definition for retrieving a Reddit post.
 * 
 * @remarks
 * This tool fetches complete post data including:
 * - Post metadata (title, author, score, etc.)
 * - Post content (selftext for text posts, URL for link posts)
 * - Complete comment tree with all replies
 * - Vote counts and awards
 * 
 * The tool is marked as hidden (_meta.hidden = true) which means it
 * won't appear in the standard tool list but can be invoked directly.
 * 
 * @example
 * Tool invocation:
 * ```json
 * {
 *   "tool": "get_post",
 *   "arguments": {
 *     "id": "t3_abc123"
 *   }
 * }
 * ```
 * 
 * @see {@link https://www.reddit.com/dev/api/#GET_comments_{article} | Reddit API: Get Comments}
 */
export const getPost: Tool = {
  name: "get_post",
  description:
    "Retrieves a complete Reddit post including its title, content, metadata, and all associated comments and reply threads. This tool should be used when you need to examine a specific post's full context, including its discussion. It's particularly useful for understanding the complete conversation around a post, analyzing community responses, or preparing to engage with the discussion. The tool provides access to all post details including awards, vote counts, posting time, and the full comment tree.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description:
          "The unique identifier of the post to retrieve. Must be a valid Reddit post ID (prefixed with 't3_'). The ID can be found in the post's URL or through Reddit's API.",
      },
    },
    required: ["id"],
  },
  _meta: {
    hidden: true,
    title: "Get Post",
    type: "server",
  },
};

/**
 * Success message template for the get_post tool.
 * 
 * @remarks
 * This message is used as a prompt for the AI assistant after
 * successfully retrieving a Reddit post. It guides the assistant
 * to summarize the results and offer further assistance.
 */
export const getPostSuccessMessage =
  "The user has retrieved a post from Reddit. Read and understand the results, present a summary of the results to the user and ask if they would like to get another post.";
