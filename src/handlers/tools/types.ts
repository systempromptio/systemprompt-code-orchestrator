import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { RedditErrorType } from "../../types/reddit.js";
import type { RedditService } from "../../services/reddit/reddit-service.js";

// Context passed to individual tool handlers
export interface ToolHandlerContext {
  redditService: RedditService;
  userId: string;
  sessionId?: string;
  progressToken?: string | number;
}

export type ToolHandler<T = any> = (
  args: T,
  context: ToolHandlerContext,
) => Promise<CallToolResult>;

// Standard response type for all tool handlers
export interface ToolResponse<T = any> {
  status: "success" | "error";
  message: string;
  result?: T;
  error?: {
    type: RedditErrorType | string;
    details?: any;
  };
}

// Helper function to format tool responses
export function formatToolResponse<T>(
  response: Partial<ToolResponse<T>> & Pick<ToolResponse<T>, "message">,
): CallToolResult {
  const standardResponse: ToolResponse<T> = {
    status: response.status || "success",
    message: response.message,
    ...(response.result && { result: response.result }),
    ...(response.error && { error: response.error }),
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(standardResponse, null, 2),
      },
    ],
  };
}

export interface RedditSubredditConfig {
  name: string;
  description?: string;
  tags?: string[];
}

export interface RedditPreferences {
  defaultSort?: "hot" | "new" | "top" | "rising" | "controversial";
  timeFilter?: "hour" | "day" | "week" | "month" | "year" | "all";
  contentFilter?: "all" | "posts" | "comments";
  nsfwFilter?: boolean;
  minimumScore?: number;
  maxPostsPerRequest?: number;
}

export interface FetchRedditContentArgs {
  sortBy: "hot" | "new" | "top" | "rising" | "controversial";
  timeFilter?: "hour" | "day" | "week" | "month" | "year" | "all";
  limit?: number;
  subreddits?: string;
}

export interface GetChannelArgs {
  sort: "hot" | "new" | "controversial";
  subreddit: string;
}

export interface GetPostArgs {
  id: string;
}

export interface GetNotificationsArgs {
  filter?: "all" | "unread" | "messages" | "comments" | "mentions";
  limit?: number;
  markRead?: boolean;
  excludeIds?: string[];
  excludeTypes?: Array<"comment_reply" | "post_reply" | "username_mention" | "message" | "other">;
  excludeSubreddits?: string[];
  after?: string;
  before?: string;
}

export interface DeleteNotificationArgs {
  notificationId: string;
}

export interface ConfigureInstructionsArgs {
  content: string;
}

export interface CreateRedditPostArgs {
  /** Subreddit to post to */
  subreddit: string;
  /** Instructions for generating the post content */
  content: string;
  /** Type of post to create */
}

export interface CreateRedditCommentArgs {
  /** Subreddit where the reply will be posted */
  subreddit: string;
  /** Instructions for generating the reply content */
  content: string;
  /** ID of the parent post/comment to reply to */
  id: string;
}

export interface SearchRedditArgs {
  query: string;
  subreddit?: string;
  sort?: "relevance" | "hot" | "new" | "top";
  time?: "hour" | "day" | "week" | "month" | "year" | "all";
  limit?: number;
}

export interface GetCommentArgs {
  id: string;
  includeThread?: boolean;
}

export interface SendReplyArgs {
  /** The ID of the parent post or comment to reply to (must start with t1_ for comments or t3_ for posts) */
  id: string;
  /** The markdown text of the reply (max 10000 characters) */
  text: string;
  /** Whether to send reply notifications */
  sendreplies?: boolean;
}

export interface DeleteContentArgs {
  /** The ID of the resource to delete */
  id: string;
}

export interface EditContentArgs {
  /** The ID of the resource to edit */
  id: string;
  /** The new content for the resource */
  content: string;
}

export interface CreateRedditMessageArgs {
  /** The username of the recipient */
  recipient: string;
  /** The subject of the message */
  subject: string;
  /** The content of the message */
  content: string;
}
