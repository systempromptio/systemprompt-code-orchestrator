import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const searchReddit: Tool = {
  name: "search_reddit",
  description: "Search Reddit posts across all subreddits or within a specific subreddit",
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: {
        type: "string",
        description: "The search query to find Reddit posts",
      },
      subreddit: {
        type: "string",
        description: "Optional subreddit to restrict the search to",
      },
      sort: {
        type: "string",
        enum: ["relevance", "hot", "new", "top"],
        default: "relevance",
        description: "How to sort the search results",
      },
      time: {
        type: "string",
        enum: ["hour", "day", "week", "month", "year", "all"],
        default: "all",
        description: "Time window for the search results",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        default: 25,
        description: "Maximum number of results to return",
      },
    },
  },
  _meta: {
    title: "Search Reddit",
    hidden: false,
    type: "server",
  },
};

export const searchRedditSuccessMessage =
  "The user has successfully searched Reddit. Read and understand the results, present a summary of the results to the user and ask if they would like to see any specific posts.";
