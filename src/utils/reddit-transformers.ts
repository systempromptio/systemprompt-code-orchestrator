/**
 * @file Reddit API response transformation utilities
 * @module utils/reddit-transformers
 * 
 * @remarks
 * This module provides utilities for transforming raw Reddit API responses
 * into strongly-typed TypeScript objects. It handles data normalization,
 * type conversion, and provides type guards for runtime validation.
 * 
 * The Reddit API returns data in various formats with inconsistent types
 * (e.g., numbers as strings). These transformers ensure consistent, type-safe
 * data structures throughout the application.
 * 
 * @see {@link https://www.reddit.com/dev/api/} Reddit API Documentation
 */

import { z } from 'zod';
import type {
  RedditNotification as ConfigRedditNotification,
  RedditMessage,
} from '../types/config.js';
import type {
  RedditPost,
  RedditComment,
  RedditSubreddit,
  RedditNotification as ApiRedditNotification,
  SubscribedSubreddit,
} from '../types/reddit.js';

/**
 * Raw post data structure from Reddit API
 * @internal
 */
interface RedditApiPostData {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  selftext?: string;
  url?: string;
  score: number | string;
  created_utc: number | string;
  num_comments: number | string;
  permalink: string;
  [key: string]: unknown;
}

/**
 * Raw comment data structure from Reddit API
 * @internal
 */
interface RedditApiCommentData {
  id: string;
  body: string;
  author: string;
  subreddit: string;
  score: number | string;
  created_utc: number | string;
  permalink: string;
  parent_id: string;
  link_id: string;
  [key: string]: unknown;
}

/**
 * Raw subreddit data structure from Reddit API
 * @internal
 */
interface RedditApiSubredditData {
  display_name: string;
  title: string;
  description?: string;
  subscribers?: number | string;
  public_description?: string;
  submission_type: string;
  subreddit_type: string;
  created_utc: number | string;
  over18: boolean;
  rules?: Array<{
    short_name?: string;
    title: string;
    description: string;
  }>;
  title_min_length?: number;
  title_max_length?: number;
  allowed_title_prefixes?: string[];
  banned_title_phrases?: string[];
  body_required?: boolean;
  body_min_length?: number;
  body_max_length?: number;
  flair_required?: boolean;
  [key: string]: unknown;
}

/**
 * Raw notification data structure from Reddit API
 * @internal
 */
interface RedditApiNotificationData {
  id: string;
  subject: string;
  body: string;
  author: string;
  created_utc: number | string;
  new: boolean;
  [key: string]: unknown;
}

/**
 * Raw message data structure from Reddit API
 * @internal
 */
interface RedditApiMessageData {
  id: string;
  subject: string;
  body: string;
  author: string;
  dest: string;
  created_utc: number | string;
  new: boolean;
  [key: string]: unknown;
}

/**
 * Zod schema for validating Reddit API post data
 */
const RedditApiPostSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  author: z.string().min(1),
  subreddit: z.string().min(1),
  permalink: z.string().min(1),
  score: z.number().optional(),
  num_comments: z.number().optional(),
  created_utc: z.number().optional(),
  selftext: z.string().optional(),
  url: z.string().optional(),
  is_self: z.boolean().optional(),
  over_18: z.boolean().optional(),
  stickied: z.boolean().optional(),
  locked: z.boolean().optional(),
  spoiler: z.boolean().optional(),
  upvote_ratio: z.number().optional(),
}).passthrough(); // Allow additional properties

/**
 * Type guard to check if data is a valid Reddit post
 * 
 * @param data - Unknown data to validate
 * @returns True if data matches Reddit post structure
 * 
 * @example
 * ```typescript
 * if (isRedditPostData(response)) {
 *   console.log(response.title); // Type-safe access
 * }
 * ```
 */
export const isRedditPostData = (
  data: unknown,
): data is RedditApiPostData => {
  return RedditApiPostSchema.safeParse(data).success;
};

/**
 * Transforms raw Reddit API post data into a typed RedditPost object
 * 
 * @param data - Raw post data from Reddit API
 * @returns Normalized RedditPost object
 * @throws {Error} Thrown if data doesn't match expected structure
 * 
 * @remarks
 * This function normalizes Reddit API responses by:
 * - Converting string numbers to actual numbers
 * - Handling optional fields safely
 * - Validating required fields
 * 
 * @example
 * ```typescript
 * const rawPost = await fetch('/api/post.json');
 * const post = transformPost(rawPost.data);
 * console.log(post.score); // Guaranteed to be a number
 * ```
 */
export const transformPost = (data: unknown): RedditPost => {
  if (!isRedditPostData(data)) {
    throw new Error("Invalid post data received from Reddit API");
  }

  return {
    id: data.id,
    title: data.title,
    author: data.author,
    subreddit: data.subreddit,
    selftext: data.selftext || undefined,
    url: data.url || undefined,
    score: Number(data.score),
    createdUtc: Number(data.created_utc),
    numComments: Number(data.num_comments),
    permalink: data.permalink,
  };
};

/**
 * Type guard to check if data is a valid Reddit comment
 * 
 * @param data - Unknown data to validate
 * @returns True if data matches Reddit comment structure
 */
export const isRedditCommentData = (
  data: unknown,
): data is RedditApiCommentData => {
  const comment = data as Record<string, unknown>;
  return (
    typeof comment?.id === "string" &&
    typeof comment?.author === "string" &&
    typeof comment?.body === "string" &&
    typeof comment?.permalink === "string"
  );
};

/**
 * Transforms raw Reddit API comment data into a typed RedditComment object
 * 
 * @param data - Raw comment data from Reddit API
 * @returns Normalized RedditComment object
 * @throws {Error} Thrown if data doesn't match expected structure
 */
export const transformComment = (data: unknown): RedditComment => {
  if (!isRedditCommentData(data)) {
    throw new Error("Invalid comment data received from Reddit API");
  }

  return {
    id: data.id,
    author: data.author,
    body: data.body,
    score: Number(data.score),
    createdUtc: Number(data.created_utc),
    permalink: data.permalink,
  };
};

/**
 * Type guard to check if data is a valid Reddit subreddit
 * 
 * @param data - Unknown data to validate
 * @returns True if data matches Reddit subreddit structure
 */
export const isRedditSubredditData = (
  data: unknown,
): data is RedditApiSubredditData => {
  const subreddit = data as Record<string, unknown>;
  return (
    typeof subreddit?.display_name === "string" &&
    typeof subreddit?.title === "string" &&
    typeof subreddit?.public_description === "string"
  );
};

/**
 * Transforms raw Reddit API subreddit data into a typed RedditSubreddit object
 * 
 * @param data - Raw subreddit data from Reddit API
 * @returns Normalized RedditSubreddit object with rules and requirements
 * @throws {Error} Thrown if data doesn't match expected structure
 * 
 * @remarks
 * This function extracts and normalizes:
 * - Basic subreddit information
 * - Posting rules and requirements
 * - Title and body constraints
 * - Allowed post types based on submission_type
 */
export const transformSubreddit = (data: unknown): RedditSubreddit => {
  if (!isRedditSubredditData(data)) {
    throw new Error("Invalid subreddit data received from Reddit API");
  }

  const rules = Array.isArray(data.rules) ? data.rules : [];

  return {
    displayName: data.display_name,
    title: data.title,
    publicDescription: data.public_description || '',
    subscribers: Number(data.subscribers),
    createdUtc: Number(data.created_utc),
    over18: Boolean(data.over18),
    allowedPostTypes: extractAllowedPostTypes(data),
    rules: rules.map((rule) => ({
      title: rule.short_name || rule.title,
      description: rule.description,
    })),
    postRequirements: {
      title: {
        minLength: typeof data.title_min_length === "number" ? data.title_min_length : undefined,
        maxLength: typeof data.title_max_length === "number" ? data.title_max_length : undefined,
        allowedPrefixes: Array.isArray(data.allowed_title_prefixes)
          ? data.allowed_title_prefixes
          : undefined,
        bannedPhrases: Array.isArray(data.banned_title_phrases)
          ? data.banned_title_phrases
          : undefined,
      },
      body: {
        required: typeof data.body_required === "boolean" ? data.body_required : undefined,
        minLength: typeof data.body_min_length === "number" ? data.body_min_length : undefined,
        maxLength: typeof data.body_max_length === "number" ? data.body_max_length : undefined,
      },
      flairRequired: typeof data.flair_required === "boolean" ? data.flair_required : undefined,
    },
  };
};

/**
 * Transforms raw Reddit API notification data into a typed notification object
 * 
 * @param data - Raw notification data from Reddit API
 * @returns Normalized notification object with proper type classification
 * 
 * @remarks
 * This function determines the notification type based on various indicators:
 * - was_comment field indicates comment/post replies
 * - parent_id prefix (t3_ for posts, t1_ for comments)
 * - subject field for messages and mentions
 * - Handles deleted authors and missing fields gracefully
 */
export const transformNotification = (data: unknown): ApiRedditNotification => {
  const notification = data as RedditApiNotificationData;
  // Determine notification type and subject
  let type: ApiRedditNotification["type"] = "other";
  let subject = String(notification.subject || "");

  // For comment replies, we need to check link_title to determine if it's a post or comment reply
  if ((notification as any).was_comment) {
    const id = String((notification as any).parent_id || "");
    if (id.startsWith("t3_")) {
      type = "post_reply";
      // For post replies, use the post title as subject
      subject = String((notification as any).link_title || "Comment on your post");
    } else {
      type = "comment_reply";
      // For comment replies, use a descriptive subject
      subject = "Reply to your comment";
    }
  } else if (notification.subject === "username mention") {
    type = "username_mention";
    subject = "Username mention";
  } else if (notification.subject && !(notification as any).was_comment) {
    type = "message";
    // For messages, use the original subject
    subject = String(notification.subject);
  }

  return {
    id: String((notification as any).name || ""), // name contains the full ID with prefix
    name: String((notification as any).name || ""),
    type,
    subject,
    body: String(notification.body || ""),
    createdUtc: Number(notification.created_utc || 0),
    date: (notification as any).date instanceof Date ? (notification as any).date : new Date(),
    author: String(notification.author || "[deleted]"),
    subreddit: typeof (notification as any).subreddit === "string" ? (notification as any).subreddit : undefined,
    context: typeof (notification as any).context === "string" ? (notification as any).context : undefined,
    parentId: typeof (notification as any).parent_id === "string" ? (notification as any).parent_id : undefined,
    isNew: Boolean(notification.new),
    permalink:
      typeof (notification as any).permalink === "string" ? (notification as any).permalink : ((notification as any).context as string | undefined),
  };
};

/**
 * Transforms raw Reddit API message data into a typed RedditMessage object
 * 
 * @param data - Raw message data from Reddit API
 * @returns Normalized RedditMessage object
 * 
 * @remarks
 * Handles private messages with proper field mapping and default values
 */
export const transformMessage = (data: unknown): RedditMessage => {
  const message = data as RedditApiMessageData;
  return {
    id: String((message as any).name || ""),
    type: "message",
    subject: String(message.subject || ""),
    parent_id: String((message as any).parent_id || (message as any).name || ""),
    author: String(message.author || "[deleted]"),
    body: String(message.body || ""),
    created_utc: Number(message.created_utc || 0),
    unread: Boolean(message.new),
  };
};

/**
 * Converts an API notification to the config notification format
 * 
 * @param notification - API notification object
 * @returns Config-formatted notification or message
 * 
 * @remarks
 * This function bridges the gap between Reddit API format and the
 * MCP server's internal config format, handling both messages and
 * notifications with appropriate field mapping.
 */
export function transformToConfigNotification(
  notification: ApiRedditNotification,
): ConfigRedditNotification | RedditMessage {
  if (notification.type === "message") {
    return {
      id: notification.id,
      type: "message",
      subject: notification.subject,
      parent_id: notification.parentId || notification.id,
      author: notification.author,
      body: notification.body,
      created_utc: notification.createdUtc,
      unread: notification.isNew,
    };
  }

  return {
    id: notification.id,
    type: notification.type,
    subject: notification.subject,
    parent_id: notification.parentId || "",
    subreddit: notification.subreddit || "",
    author: notification.author,
    body: notification.body || "",
    created_utc: notification.createdUtc,
    permalink: notification.permalink || "",
    unread: notification.isNew,
  };
}

/**
 * Extracts allowed post types from subreddit submission_type field
 * 
 * @param data - Raw subreddit data
 * @returns Array of allowed post types
 * 
 * @remarks
 * Reddit's submission_type field can be:
 * - "any": Both text and link posts allowed
 * - "self": Only text posts allowed
 * - "link": Only link posts allowed
 * 
 * @internal
 */
const extractAllowedPostTypes = (data: unknown): string[] => {
  const types: string[] = [];
  const subredditData = data as Record<string, unknown>;

  if (subredditData.submission_type === "any" || subredditData.submission_type === "self") {
    types.push("text");
  }
  if (subredditData.submission_type === "any" || subredditData.submission_type === "link") {
    types.push("link");
  }

  return types.length > 0 ? types : ["text", "link"];
};

/**
 * Type guard to check if data is a valid subscribed subreddit
 * 
 * @param data - Unknown data to validate
 * @returns True if data matches subscribed subreddit structure
 * 
 * @remarks
 * This guard is more strict than general subreddit data as it validates
 * fields that are guaranteed to be present for subscribed subreddits.
 */
export const isSubscribedSubredditData = (
  data: unknown,
): data is {
  id: string;
  name: string;
  display_name: string;
  title: string;
  public_description: string;
  subscribers: number;
  over18: boolean;
  url: string;
  icon_img?: string;
  created_utc: number;
  subreddit_type: string;
} => {
  const subreddit = data as Record<string, unknown>;
  return (
    typeof subreddit?.id === "string" &&
    typeof subreddit?.name === "string" &&
    typeof subreddit?.display_name === "string" &&
    typeof subreddit?.title === "string" &&
    typeof subreddit?.public_description === "string" &&
    typeof subreddit?.subscribers === "number" &&
    typeof subreddit?.over18 === "boolean" &&
    typeof subreddit?.url === "string" &&
    typeof subreddit?.created_utc === "number" &&
    typeof subreddit?.subreddit_type === "string"
  );
};

/**
 * Transforms raw Reddit API subscribed subreddit data into a typed object
 * 
 * @param data - Raw subscribed subreddit data from Reddit API
 * @returns Normalized SubscribedSubreddit object
 * @throws {Error} Thrown if data doesn't match expected structure
 * 
 * @example
 * ```typescript
 * const subData = await fetch('/subreddits/mine/subscriber.json');
 * const subreddit = transformSubscribedSubreddit(subData.data);
 * console.log(`Subscribed to: ${subreddit.displayName}`);
 * ```
 */
export const transformSubscribedSubreddit = (data: unknown): SubscribedSubreddit => {
  if (!isSubscribedSubredditData(data)) {
    throw new Error("Invalid subscribed subreddit data received from Reddit API");
  }

  return {
    id: data.id,
    name: data.name,
    displayName: data.display_name,
    title: data.title,
    subscribers: data.subscribers,
    description: data.public_description,
    isNsfw: data.over18,
    url: data.url,
    icon: data.icon_img,
    createdUtc: data.created_utc,
    type: data.subreddit_type,
  };
};
