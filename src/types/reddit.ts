/**
 * @file Reddit API type definitions
 * @module types/reddit
 * 
 * @remarks
 * This module contains type definitions for interacting with the Reddit API.
 * These types are used throughout the MCP Reddit server to ensure type safety
 * and provide clear interfaces for Reddit data structures.
 */

/**
 * Represents a Reddit post (submission).
 * 
 * @remarks
 * Posts are the primary content type on Reddit. They can be either self/text posts
 * or link posts that point to external content.
 * 
 * @example
 * ```typescript
 * const post: RedditPost = {
 *   id: "abc123",
 *   title: "Check out this TypeScript MCP server!",
 *   author: "reddit_user",
 *   subreddit: "typescript",
 *   selftext: "I built an MCP server for Reddit...",
 *   score: 42,
 *   createdUtc: 1699564800,
 *   numComments: 15,
 *   permalink: "/r/typescript/comments/abc123/check_out_this_typescript_mcp_server/"
 * };
 * ```
 */
export interface RedditPost {
  /** Unique identifier for the post (without t3_ prefix) */
  id: string;
  /** Title of the post (max 300 characters) */
  title: string;
  /** Username of the post author */
  author: string;
  /** Name of the subreddit (without r/ prefix) */
  subreddit: string;
  /** Text content for self posts (markdown format) */
  selftext?: string;
  /** URL for link posts or the post's Reddit URL for self posts */
  url?: string;
  /** Net upvotes (upvotes - downvotes) */
  score: number;
  /** Unix timestamp of post creation */
  createdUtc: number;
  /** Number of comments on the post */
  numComments: number;
  /** Relative URL path to the post on Reddit */
  permalink: string;
}

/**
 * Represents a Reddit comment.
 * 
 * @remarks
 * Comments are replies to posts or other comments. They form threaded discussions
 * and are a key part of Reddit's community interaction.
 */
export interface RedditComment {
  /** Unique identifier for the comment (without t1_ prefix) */
  id: string;
  /** Username of the comment author */
  author: string;
  /** Content of the comment in markdown format */
  body: string;
  /** Net upvotes (upvotes - downvotes) */
  score: number;
  /** Unix timestamp of comment creation */
  createdUtc: number;
  /** Relative URL path to the comment on Reddit */
  permalink: string;
}

/**
 * Represents a comment with its nested replies.
 * 
 * @remarks
 * Reddit comments are organized in a tree structure where each comment
 * can have multiple replies, which can in turn have their own replies.
 * This creates the threaded discussion format Reddit is known for.
 */
export interface RedditCommentThread {
  /** The comment at this level of the thread */
  comment: RedditComment;
  /** Array of reply threads to this comment */
  replies: RedditCommentThread[];
}

/**
 * Represents a Reddit post with its comment tree.
 * 
 * @remarks
 * This interface combines post data with the full comment thread,
 * useful for displaying or analyzing complete Reddit discussions.
 */
export interface RedditPostWithComments extends RedditPost {
  /** The complete comment thread for this post */
  comments: RedditCommentThread[];
}

/**
 * Represents a Reddit user account.
 * 
 * @remarks
 * Contains basic information about a Reddit user including their karma scores
 * and account status.
 */
export interface RedditUser {
  /** Username (without u/ prefix) */
  name: string;
  /** Unix timestamp of account creation */
  createdUtc: number;
  /** Total karma earned from comments */
  commentKarma: number;
  /** Total karma earned from posts/links */
  linkKarma: number;
  /** Whether the user moderates any subreddits */
  isMod: boolean;
}

/**
 * Represents a Reddit subreddit (community).
 * 
 * @remarks
 * Subreddits are topic-based communities where users can post content and engage
 * in discussions. Each subreddit has its own rules, moderators, and culture.
 * 
 * @example
 * ```typescript
 * const subreddit: RedditSubreddit = {
 *   displayName: "typescript",
 *   title: "TypeScript Programming Language",
 *   publicDescription: "TypeScript is a typed superset of JavaScript...",
 *   subscribers: 150000,
 *   createdUtc: 1234567890,
 *   over18: false,
 *   allowedPostTypes: ["text", "link"],
 *   rules: [
 *     {
 *       title: "Be respectful",
 *       description: "Treat everyone with respect..."
 *     }
 *   ],
 *   postRequirements: {
 *     title: { minLength: 10, maxLength: 300 },
 *     flairRequired: true
 *   }
 * };
 * ```
 */
export interface RedditSubreddit {
  /** The subreddit name as it appears in URLs (without r/) */
  displayName: string;
  /** The full title/headline of the subreddit */
  title: string;
  /** Public description shown in subreddit sidebar */
  publicDescription: string;
  /** Number of subscribers */
  subscribers: number;
  /** Unix timestamp of subreddit creation */
  createdUtc: number;
  /** Whether the subreddit contains adult content */
  over18: boolean;
  /** Types of posts allowed (e.g., "text", "link", "image", "video") */
  allowedPostTypes: string[];
  /** Subreddit rules that all posts must follow */
  rules: Array<{
    /** Short title of the rule */
    title: string;
    /** Full description of what the rule entails */
    description: string;
  }>;
  /** Requirements for posting in the subreddit */
  postRequirements: {
    /** Title requirements */
    title?: {
      /** Minimum character length for titles */
      minLength?: number;
      /** Maximum character length for titles */
      maxLength?: number;
      /** Required title prefixes (e.g., "[Question]", "[Discussion]") */
      allowedPrefixes?: string[];
      /** Phrases that are not allowed in titles */
      bannedPhrases?: string[];
    };
    /** Post body requirements */
    body?: {
      /** Whether a text body is required for posts */
      required?: boolean;
      /** Minimum character length for post body */
      minLength?: number;
      /** Maximum character length for post body */
      maxLength?: number;
    };
    /** Whether posts must have a flair assigned */
    flairRequired?: boolean;
  };
}

export interface RedditApiResponse<T> {
  kind: string;
  data: {
    children?: Array<{
      kind: string;
      data: T;
    }>;
    [key: string]: any;
  };
}

export interface FetchPostsOptions {
  sort: "hot" | "new" | "controversial";
  subreddit: string;
  timeFilter?: string;
  limit?: number;
}

export interface RedditServiceConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  appName: string;
  appVersion: string;
  username: string;
}

export interface RedditAuthResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}

/**
 * Parameters for creating a new Reddit post
 * Matches Reddit's /api/submit endpoint requirements
 */
export interface RedditPostParams {
  /** Subreddit to post to (without r/ prefix) */
  subreddit: string;
  /** Post title (1-300 characters) */
  title: string;
  /** Type of post - 'self' for text posts, 'link' for URL posts */
  content?: string;
  /** URL for link posts */
  url?: string;
  /** Flair ID if the subreddit requires it */
  flair_id?: string;
  /** Flair text if the subreddit requires it */
  flair_text?: string;
  /** Whether to send replies to inbox */
  sendreplies?: boolean;
  /** Whether to mark as NSFW */
  nsfw?: boolean;
  /** Whether to mark as spoiler */
  spoiler?: boolean;
}

/**
 * Response from creating a post
 * Matches Reddit's /api/submit response
 */
export interface RedditPostResponse {
  /** Post ID with t3_ prefix */
  id: string;
  /** Full reddit URL to the post */
  url: string;
  /** Post title */
  title: string;
  /** Subreddit the post was created in */
  subreddit: string;
  /** Full permalink */
  permalink: string;
}

/**
 * Parameters for sending a reply
 * Used for both comments and post replies
 */
export interface RedditReplyParams {
  /**
   * ID of parent thing to reply to, with prefix
   * t1_ prefix for replying to comments
   * t3_ prefix for replying to posts
   */
  id: string;
  /** The markdown text of the comment (10000 char max) */
  text: string;
  /** Whether to send reply notifications */
  sendreplies?: boolean;
}

/**
 * Response from creating a reply
 * Matches Reddit's comment creation response
 */
export interface RedditReplyResponse {
  /** Comment ID with t1_ prefix */
  id: string;
  /** The created comment's text */
  body: string;
  /** Full permalink to the comment */
  permalink: string;
}

export interface SubredditRulesResponse {
  rules: Array<{
    short_name: string;
    description: string;
  }>;
}

export interface SubredditRequirements {
  allowedPostTypes: string[];
  rules: Array<{
    title: string;
    description: string;
  }>;
  titleRequirements?: {
    minLength?: number;
    maxLength?: number;
    allowedPrefixes?: string[];
    bannedPhrases?: string[];
  };
  bodyRequirements?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  };
  flairRequired?: boolean;
}

export interface RedditNotification {
  /** Full ID with prefix (t1_, t3_, t4_) */
  id: string;
  /** Full name with prefix */
  name: string;
  type: "comment_reply" | "post_reply" | "username_mention" | "message" | "other";
  subject: string;
  body: string;
  date: Date;
  author: string;
  subreddit?: string;
  context?: string;
  /**
   * ID of parent thing being replied to, with prefix
   * t1_ prefix for comments
   * t3_ prefix for posts
   */
  parentId?: string;
  createdUtc: number;
  isNew: boolean;
  permalink?: string;
}

export interface FetchNotificationsOptions {
  filter?: "all" | "unread" | "messages" | "comments" | "mentions";
  limit?: number;
  markRead?: boolean;
  excludeIds?: string[];
  excludeTypes?: Array<"comment_reply" | "post_reply" | "username_mention" | "message" | "other">;
  excludeSubreddits?: string[];
  after?: string;
  before?: string;
}

export interface FetchSubscribedSubredditsOptions {
  limit?: number;
  after?: string;
}

export interface SubscribedSubreddit {
  id: string;
  name: string;
  displayName: string;
  title: string;
  description: string;
  subscribers: number;
  isNsfw: boolean;
  url: string;
  icon?: string;
  createdUtc: number;
  type: string;
}

export type RedditErrorType =
  | "CONFIGURATION_ERROR"
  | "INITIALIZATION_ERROR"
  | "AUTH_ERROR"
  | "API_ERROR"
  | "RATE_LIMIT_ERROR"
  | "VALIDATION_ERROR";

export class RedditError extends Error {
  constructor(
    message: string,
    public readonly type: RedditErrorType,
    public readonly cause?: any,
  ) {
    super(message);
    this.name = "RedditError";
  }
}

export interface FlairResponse {
  choices: Array<{
    flair_template_id: string;
    text: string;
    text_editable: boolean;
    type: string;
    background_color: string;
    text_color: string;
    mod_only: boolean;
  }>;
}

export interface SubredditFlair {
  id: string;
  text: string;
  type: "text" | "richtext" | "image";
  textEditable?: boolean;
  backgroundColor?: string;
  textColor?: string;
  modOnly?: boolean;
}

export interface RedditCommentParams {
  id: string;
  text: string;
  sendreplies?: boolean;
}

export interface RedditCommentResponse {
  id: string;
  text: string;
  permalink: string;
}

export interface RedditMessageParams {
  /** Username of the recipient */
  recipient: string;
  /** Subject line of the message (1-100 chars) */
  subject: string;
  /** Message content in markdown format (max 10000 chars) */
  content: string;
}

export interface RedditMessageResponse {
  /** Full message ID with t4_ prefix */
  id: string;
  /** Username of the recipient */
  recipient: string;
  /** Subject line of the message */
  subject: string;
  /** Content of the message */
  body: string;
}

export interface RedditService {
  // Authentication
  initialize(): Promise<void>;
  refreshAccessToken(): Promise<void>;

  // Posts and Comments
  createPost(params: RedditPostParams): Promise<RedditPostResponse>;
  sendReply(params: RedditReplyParams): Promise<RedditReplyResponse>;
  getPost(id: string): Promise<RedditPost>;
  getComment(id: string): Promise<RedditComment>;

  // Subreddit Information
  getSubredditInfo(subreddit: string): Promise<RedditSubreddit>;
  getSubredditRules(subreddit: string): Promise<SubredditRulesResponse>;
  getSubredditRequirements(subreddit: string): Promise<SubredditRequirements>;
  /**
   * Fetches available post flairs for a subreddit
   * @param subreddit The subreddit name (without r/ prefix)
   * @returns Array of available flairs
   */
  getSubredditFlairs(subreddit: string): Promise<SubredditFlair[]>;

  // Notifications
  fetchNotifications(options?: FetchNotificationsOptions): Promise<RedditNotification[]>;
  deleteNotification(notificationId: string): Promise<void>;

  // Subscriptions
  fetchSubscribedSubreddits(
    options?: FetchSubscribedSubredditsOptions,
  ): Promise<SubscribedSubreddit[]>;

  sendComment(params: RedditCommentParams): Promise<RedditCommentResponse>;
}
