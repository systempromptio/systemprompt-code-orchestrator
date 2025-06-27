import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const getNotifications: Tool = {
  name: "get_notifications",
  description:
    "Fetches and manages Reddit notifications (inbox items) with advanced filtering options. This tool should be used to monitor and handle various types of Reddit interactions including comment replies, post replies, username mentions, and private messages. It provides flexible filtering options to focus on specific notification types, manage read/unread status, and exclude unwanted content. Use this tool to stay updated on Reddit interactions and manage your notification inbox effectively.",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        enum: ["all", "unread", "messages", "comments", "mentions"],
        description:
          "Filter notifications by type: 'all' for everything, 'unread' for new notifications, 'messages' for private messages, 'comments' for comment replies, 'mentions' for username mentions.",
      },
      limit: {
        type: "number",
        description:
          "Maximum number of notifications to fetch. Use this to control the volume of notifications returned.",
      },
      markRead: {
        type: "boolean",
        description:
          "When true, marks fetched notifications as read. Set to false to preserve unread status.",
      },
      excludeIds: {
        type: "array",
        items: { type: "string" },
        description:
          "Array of notification IDs to exclude from results. Useful for filtering out specific notifications.",
      },
      excludeTypes: {
        type: "array",
        items: {
          type: "string",
          enum: ["comment_reply", "post_reply", "username_mention", "message", "other"],
        },
        description:
          "Array of notification types to exclude. Use this to filter out specific types of interactions.",
      },
      excludeSubreddits: {
        type: "array",
        items: { type: "string" },
        description:
          "Array of subreddit names to exclude notifications from. Helps focus on specific communities.",
      },
      after: {
        type: "string",
        description:
          "Fetch notifications after this notification ID. Used for pagination and getting newer notifications.",
      },
      before: {
        type: "string",
        description:
          "Fetch notifications before this notification ID. Used for pagination and getting older notifications.",
      },
    },
  },
  _meta: {
    ignore: false,
    hidden: true,
    title: "Get Notifications",
    type: "server",
  },
};

export const getRedditNotificationsSuccessMessage =
  "The user has successfully fetched their notifications from Reddit. Read and understand the results, present a summary of the results to the user.";
