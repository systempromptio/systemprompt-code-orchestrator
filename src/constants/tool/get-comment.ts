import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const getComment: Tool = {
  name: "get_comment",
  description:
    "Retrieves a specific Reddit comment and optionally its complete discussion thread. This tool should be used when you need to examine a particular comment's content, context, and responses. It's useful for understanding discussion flow, gathering context for replies, or analyzing conversation threads. When includeThread is true, it provides the full context of the discussion including parent comments and all replies, helping understand the complete conversation context.",
  inputSchema: {
    type: "object",
    required: ["id"],
    properties: {
      id: {
        type: "string",
        description:
          "The unique identifier of the comment to retrieve. Must be a valid Reddit comment ID (prefixed with 't1_'). The ID can be found in the comment's permalink or through Reddit's API.",
      },
      includeThread: {
        type: "boolean",
        description:
          "When true, fetches the entire comment thread including parent comments and all replies. This provides full context but may return a larger amount of data. When false, only fetches the specific comment.",
        default: false,
      },
    },
  },
  _meta: {
    hidden: true,
    title: "Get Comment",
    type: "server",
  },
};

export const getCommentSuccessMessage =
  "The user has successfully fetched a Reddit comment. Summarize the content concisely.";
