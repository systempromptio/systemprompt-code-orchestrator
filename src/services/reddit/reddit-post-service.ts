/**
 * @file Reddit post and comment service
 * @module services/reddit/reddit-post-service
 * 
 * @remarks
 * This service handles all post and comment-related operations for the Reddit API.
 * It extends RedditFetchService to inherit common fetching functionality and adds
 * specific methods for creating, fetching, and interacting with posts and comments.
 * 
 * The service handles:
 * - Fetching posts with various sort options
 * - Creating new posts (text, link, image, video, gallery)
 * - Sending comments and replies
 * - Fetching individual posts and comments
 * - Managing notifications and messages
 * - Searching Reddit content
 * 
 * @see {@link https://www.reddit.com/dev/api/#section_listings} Reddit Listings API
 * @see {@link https://www.reddit.com/dev/api/#section_links_and_comments} Reddit Links & Comments API
 */

import { DEFAULT_POST_LIMIT, DEFAULT_NOTIFICATION_LIMIT } from '../../constants.js';

import type { RedditMessageParams, RedditMessageResponse ,
  RedditPost,
  RedditPostParams,
  RedditPostResponse,
  RedditApiResponse,
  FetchPostsOptions,
  RedditCommentThread,
  RedditPostWithComments,
  RedditNotification,
  FetchNotificationsOptions,
  RedditComment} from '../../types/reddit.js';
import { RedditError 
} from '../../types/reddit.js';


import {
  transformPost,
  transformComment,
  transformNotification,
} from '../../utils/reddit-transformers.js';

import type { RedditAuthService } from './reddit-auth-service.js';
import { RedditFetchService } from './reddit-fetch-service.js';

/**
 * Service for handling Reddit post and comment operations
 * 
 * @remarks
 * This service extends RedditFetchService to provide specialized methods
 * for working with Reddit posts, comments, and user interactions.
 * All methods include automatic rate limiting and error handling.
 * 
 * @example
 * ```typescript
 * const postService = new RedditPostService(
 *   'https://oauth.reddit.com',
 *   authService,
 *   2000 // 2 second rate limit
 * );
 * 
 * const posts = await postService.fetchPosts({
 *   subreddit: 'programming',
 *   sort: 'hot',
 *   limit: 25
 * });
 * ```
 */
export class RedditPostService extends RedditFetchService {
  /**
   * Creates a new Reddit post service
   * 
   * @param baseUrl - The base URL for Reddit API requests (https://oauth.reddit.com)
   * @param authService - The authentication service instance
   * @param rateLimitDelay - Delay in milliseconds between API requests
   */
  constructor(baseUrl: string, authService: RedditAuthService, rateLimitDelay: number) {
    super(baseUrl, authService, rateLimitDelay);
  }

  /**
   * Fetches posts from Reddit based on the provided options
   * 
   * @param options - Options for fetching posts
   * @param options.sort - Sort order: 'hot', 'new', or 'controversial'
   * @param options.limit - Maximum number of posts to fetch (default: 25)
   * @param options.subreddit - Subreddit to fetch from (optional)
   * @returns Array of Reddit posts
   * @throws {RedditError} Thrown if sort option is invalid or API request fails
   * 
   * @example
   * ```typescript
   * // Fetch hot posts from a specific subreddit
   * const posts = await postService.fetchPosts({
   *   subreddit: 'typescript',
   *   sort: 'hot',
   *   limit: 50
   * });
   * 
   * // Fetch new posts from home feed
   * const homePosts = await postService.fetchPosts({
   *   sort: 'new',
   *   limit: 25
   * });
   * ```
   */
  public async fetchPosts(
    options: FetchPostsOptions = { sort: "hot", subreddit: "" },
  ): Promise<RedditPost[]> {
    const { sort = "hot", limit = DEFAULT_POST_LIMIT, subreddit } = options;

    switch (sort) {
      case "hot":
        return this.getHotPosts(subreddit, limit);
      case "new":
        return this.getNewPosts(subreddit, limit);
      case "controversial":
        return this.getControversialPosts(subreddit, limit);
      default:
        throw new RedditError(`Invalid sort option: ${sort}`, "VALIDATION_ERROR");
    }
  }

  /**
   * Formats a subreddit name by removing the r/ prefix if present
   * 
   * @param subreddit - The subreddit name to format
   * @returns Formatted subreddit name without r/ prefix
   * @internal
   */
  private formatSubreddit(subreddit?: string): string {
    if (!subreddit) {return "";}
    return subreddit.replace(/^r\//, "");
  }

  /**
   * Fetches hot posts from Reddit
   * 
   * @param subreddit - Optional subreddit to fetch from
   * @param limit - Maximum number of posts to fetch
   * @returns Array of hot posts
   * @throws {RedditError} Thrown if API request fails
   * @internal
   */
  private async getHotPosts(subreddit?: string, limit: number = 10): Promise<RedditPost[]> {
    const formattedSubreddit = this.formatSubreddit(subreddit);
    const endpoint = formattedSubreddit
      ? `/r/${formattedSubreddit}/hot.json?limit=${limit}`
      : `/hot.json?limit=${limit}`;

    const data = await this.redditFetch<RedditApiResponse<RedditPost>>(endpoint);
    return data.data.children?.map((child) => transformPost(child.data)) ?? [];
  }

  /**
   * Fetches new posts from Reddit
   * 
   * @param subreddit - Optional subreddit to fetch from
   * @param limit - Maximum number of posts to fetch
   * @returns Array of new posts sorted by creation time
   * @throws {RedditError} Thrown if API request fails
   * @internal
   */
  private async getNewPosts(subreddit?: string, limit: number = 10): Promise<RedditPost[]> {
    const formattedSubreddit = this.formatSubreddit(subreddit);
    const endpoint = formattedSubreddit
      ? `/r/${formattedSubreddit}/new.json?limit=${limit}`
      : `/new.json?limit=${limit}`;

    const data = await this.redditFetch<RedditApiResponse<RedditPost>>(endpoint);
    return data.data.children?.map((child) => transformPost(child.data)) ?? [];
  }

  /**
   * Fetches controversial posts from Reddit
   * 
   * @param subreddit - Optional subreddit to fetch from
   * @param limit - Maximum number of posts to fetch
   * @returns Array of controversial posts
   * @throws {RedditError} Thrown if API request fails
   * @internal
   */
  private async getControversialPosts(
    subreddit?: string,
    limit: number = 10,
  ): Promise<RedditPost[]> {
    const formattedSubreddit = this.formatSubreddit(subreddit);
    const endpoint = formattedSubreddit
      ? `/r/${formattedSubreddit}/controversial.json?limit=${limit}`
      : `/controversial.json?limit=${limit}`;

    const data = await this.redditFetch<RedditApiResponse<RedditPost>>(endpoint);
    return data.data.children?.map((child) => transformPost(child.data)) ?? [];
  }

  /**
   * Creates a new post on Reddit
   * 
   * @param params - Parameters for creating the post
   * @param params.subreddit - The subreddit to post in (without r/ prefix)
   * @param params.title - The post title (1-300 characters)
   * @param params.content - The post content (text/markdown)
   * @returns Response containing the created post details
   * @throws {RedditError} Thrown if required fields are missing or API request fails
   * 
   * @remarks
   * This method currently only supports text posts. For link, image, video,
   * or gallery posts, additional parameters would need to be implemented.
   * 
   * @example
   * ```typescript
   * const post = await postService.createPost({
   *   subreddit: 'test',
   *   title: 'My First Post',
   *   content: 'This is the post content'
   * });
   * ```
   */
  public async createPost(params: RedditPostParams): Promise<RedditPostResponse> {
    const { subreddit, title, content } = params;

    if (!subreddit || !title || !content) {
      throw new RedditError("Missing required fields", "VALIDATION_ERROR");
    }

    const formData = new URLSearchParams();
    formData.append("sr", subreddit);
    formData.append("title", title);
    formData.append("text", content);

    const response = await this.redditFetch<RedditPostResponse>("/api/submit", {
      method: "POST",
      body: formData,
    });

    return response;
  }

  /**
   * Fetches a single Reddit post by ID, including its comments
   * 
   * @param id - The post ID (with or without t3_ prefix)
   * @returns The post with its comment tree
   * @throws {RedditError} Thrown if post not found or API request fails
   * 
   * @remarks
   * This method fetches both the post metadata and its comment tree.
   * Comments are returned as a nested structure preserving the thread hierarchy.
   * 
   * @example
   * ```typescript
   * const post = await postService.fetchPostById('abc123');
   * console.log(post.title);
   * console.log(`${post.comments.length} top-level comments`);
   * 
   * // Access nested replies
   * post.comments.forEach(thread => {
   *   console.log(thread.comment.body);
   *   console.log(`${thread.replies.length} replies`);
   * });
   * ```
   */
  public async fetchPostById(id: string): Promise<RedditPostWithComments> {
    try {
      // Reddit API requires the post ID to be prefixed with t3_
      const formattedId = id.startsWith("t3_") ? id : `t3_${id}`;

      // First, fetch the post info
      const postEndpoint = `/api/info.json?id=${formattedId}`;
      const postData = await this.redditFetch<RedditApiResponse<RedditPost>>(postEndpoint);

      if (!postData.data.children || postData.data.children.length === 0) {
        throw new RedditError(`Post with ID ${id} not found`, "API_ERROR");
      }

      const post = transformPost(postData.data.children[0].data);

      // Then fetch the comments
      const rawid = id.replace("t3_", "");
      const commentsEndpoint = `/comments/${rawid}.json`;
      const commentsData = await this.redditFetch<any[]>(commentsEndpoint);

      // Reddit returns an array with 2 elements: [0] = post data, [1] = comments data
      if (!commentsData || commentsData.length < 2) {
        // Return post without comments if comments data is missing
        return {
          ...post,
          comments: [],
        };
      }

      // Process the comment tree
      const commentListing = commentsData[1].data.children;
      const comments = this.processCommentTree(commentListing);

      return {
        ...post,
        comments,
      };
    } catch (error) {
      throw new RedditError(
        `Failed to fetch post: ${error instanceof Error ? error.message : "Unknown error"}`,
        "API_ERROR",
        error,
      );
    }
  }

  /**
   * Recursively processes a Reddit comment tree into a structured format
   * 
   * @param commentListing - Raw comment data from Reddit API
   * @returns Array of comment threads with nested replies
   * 
   * @remarks
   * This method recursively processes the comment tree structure returned by Reddit.
   * Each comment can have replies, which can have their own replies, etc.
   * The method preserves this hierarchical structure.
   * 
   * @internal
   */
  private processCommentTree(commentListing: any[]): RedditCommentThread[] {
    if (!commentListing || !Array.isArray(commentListing)) {
      return [];
    }

    return commentListing
      .filter((item) => item.kind === "t1")
      .map((item) => {
        const comment = transformComment(item.data);

        // Process replies if they exist
        let replies: RedditCommentThread[] = [];
        if (
          item.data.replies &&
          typeof item.data.replies === "object" &&
          item.data.replies.data &&
          item.data.replies.data.children
        ) {
          replies = this.processCommentTree(item.data.replies.data.children);
        }

        return {
          comment,
          replies,
        };
      });
  }

  /**
   * Fetches user notifications from Reddit inbox
   * 
   * @param options - Options for filtering and paginating notifications
   * @param options.filter - Filter type: 'all', 'unread', 'messages', 'comments', 'mentions'
   * @param options.limit - Maximum number of notifications to fetch (default: 25)
   * @param options.after - Pagination cursor for next page
   * @param options.before - Pagination cursor for previous page
   * @param options.markRead - Whether to mark fetched notifications as read
   * @returns Array of notifications
   * @throws {RedditError} Thrown if API request fails
   * 
   * @example
   * ```typescript
   * // Get all unread notifications
   * const unread = await postService.fetchNotifications({
   *   filter: 'unread',
   *   limit: 50
   * });
   * 
   * // Get only comment replies
   * const comments = await postService.fetchNotifications({
   *   filter: 'comments',
   *   limit: 25
   * });
   * ```
   */
  public async fetchNotifications(
    options: FetchNotificationsOptions = {},
  ): Promise<RedditNotification[]> {
    try {
      const filter = options.filter || "all";
      const limit = options.limit || DEFAULT_NOTIFICATION_LIMIT;

      // Determine the endpoint based on the filter
      let endpoint = "";
      switch (filter) {
        case "unread":
          endpoint = "/message/unread.json";
          break;
        case "messages":
          endpoint = "/message/messages.json";
          break;
        case "comments":
          endpoint = "/message/comments.json";
          break;
        case "mentions":
          endpoint = "/message/mentions.json";
          break;
        case "all":
        default:
          endpoint = "/message/inbox.json";
          break;
      }

      // Add parameters
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      if (options.after) {params.append("after", options.after);}
      if (options.before) {params.append("before", options.before);}

      endpoint += `?${params.toString()}`;

      const data = await this.redditFetch<RedditApiResponse<any>>(endpoint);

      if (!data.data.children) {
        return [];
      }

      let notifications = data.data.children.map((item) => transformNotification(item.data));

      // Apply client-side filters
      if (options.excludeIds?.length) {
        notifications = notifications.filter((n) => !options.excludeIds?.includes(n.id));
      }

      if (options.excludeTypes?.length) {
        notifications = notifications.filter((n) => !options.excludeTypes?.includes(n.type));
      }

      if (options.excludeSubreddits?.length) {
        notifications = notifications.filter(
          (n) => !n.subreddit || !options.excludeSubreddits?.includes(n.subreddit),
        );
      }

      if (options.markRead && notifications.length > 0 && filter !== "unread") {
        const ids = notifications.filter((n) => n.isNew).map((n) => n.id);
        if (ids.length > 0) {
          await this.markMessagesRead(ids);
        }
      }

      return notifications;
    } catch (error) {
      throw new RedditError(
        `Failed to fetch notifications: ${error instanceof Error ? error.message : "Unknown error"}`,
        "API_ERROR",
        error,
      );
    }
  }

  public async deleteMessage(id: string): Promise<void> {
    try {
      const formData = new URLSearchParams({
        id,
      });

      await this.redditFetch("/api/del_msg", {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      throw new RedditError(
        `Failed to delete message: ${error instanceof Error ? error.message : "Unknown error"}`,
        "API_ERROR",
        error,
      );
    }
  }

  private async markMessagesRead(ids: string[]): Promise<void> {
    const formData = new URLSearchParams({
      id: ids.join(","),
    });

    await this.redditFetch("/api/read_message", {
      method: "POST",
      body: formData,
    });
  }

  /**
   * Fetches a single comment by its ID
   * @param id - The ID of the comment to fetch
   * @returns Promise<RedditComment>
   */
  public async fetchCommentById(id: string): Promise<RedditComment> {
    try {
      // Reddit API requires the comment ID to be prefixed with t1_
      const formattedId = id.startsWith("t1_") ? id : `t1_${id}`;

      const endpoint = `/api/info.json?id=${formattedId}`;
      const response = await this.redditFetch<RedditApiResponse<RedditComment>>(endpoint);

      if (!response.data.children || response.data.children.length === 0) {
        throw new RedditError(`Comment with ID ${id} not found`, "API_ERROR");
      }

      return transformComment(response.data.children[0].data);
    } catch (error) {
      throw new RedditError(
        `Failed to fetch comment: ${error instanceof Error ? error.message : "Unknown error"}`,
        "API_ERROR",
        error,
      );
    }
  }

  /**
   * Fetches a comment thread (comment with all its replies) by the comment ID and post ID
   * @param id - The ID of the post containing the comment
   * @param id - The ID of the comment to fetch with its replies
   * @returns Promise<RedditCommentThread>
   */
  public async fetchCommentThread(parentId: string, id: string): Promise<RedditCommentThread> {
    try {
      // Reddit API endpoint for fetching a specific comment thread
      const endpoint = `/comments/${parentId.replace("t3_", "")}/comment/${id.replace("t1_", "")}.json`;
      const response = await this.redditFetch<any[]>(endpoint);

      if (!response || response.length < 2 || !response[1].data.children?.[0]) {
        throw new RedditError(`Comment thread not found`, "API_ERROR");
      }

      // The first comment in the thread is our target comment
      const commentData = response[1].data.children[0];

      if (commentData.kind !== "t1") {
        throw new RedditError(`Invalid comment data received`, "API_ERROR");
      }

      const comment = transformComment(commentData.data);

      // Process replies if they exist
      let replies: RedditCommentThread[] = [];
      if (
        commentData.data.replies &&
        typeof commentData.data.replies === "object" &&
        commentData.data.replies.data?.children
      ) {
        replies = this.processCommentTree(commentData.data.replies.data.children);
      }

      return {
        comment,
        replies,
      };
    } catch (error) {
      throw new RedditError(
        `Failed to fetch comment thread: ${error instanceof Error ? error.message : "Unknown error"}`,
        "API_ERROR",
        error,
      );
    }
  }

  public async searchReddit(options: {
    query: string;
    subreddit?: string;
    sort?: "relevance" | "hot" | "new" | "top";
    time?: "hour" | "day" | "week" | "month" | "year" | "all";
    limit?: number;
  }): Promise<RedditPost[]> {
    const { query, subreddit, sort = "relevance", time = "all", limit = DEFAULT_POST_LIMIT } = options;
    const formattedSubreddit = this.formatSubreddit(subreddit);

    let endpoint = formattedSubreddit ? `/r/${formattedSubreddit}/search.json` : "/search.json";

    const params = new URLSearchParams({
      q: query,
      sort,
      t: time,
      limit: limit.toString(),
      restrict_sr: formattedSubreddit ? "true" : "false",
    });

    endpoint += `?${params.toString()}`;

    const data = await this.redditFetch<RedditApiResponse<RedditPost>>(endpoint);
    return data.data.children?.map((child) => transformPost(child.data)) ?? [];
  }

  /**
   * Sends a reply to a post or comment
   * @param id - The ID of the parent post or comment to reply to
   * @param text - The content of the reply
   * @returns Promise<any> - The API response
   */
  public async sendReply(id: string, text: string): Promise<any> {
    try {
      const formData = new URLSearchParams({
        parent: id,
        text: text,
      });

      const response = await this.redditFetch("/api/comment", {
        method: "POST",
        body: formData,
      });

      return response;
    } catch (error) {
      throw new RedditError(
        `Failed to send reply: ${error instanceof Error ? error.message : "Unknown error"}`,
        "API_ERROR",
        error,
      );
    }
  }

  public async sendComment(id: string, text: string): Promise<any> {
    try {
      const response = await this.redditFetch<any>("/api/comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          parent_id: id,
          text,
        }).toString(),
      });

      return {
        id: response.id,
        text: response.text,
        permalink: response.permalink,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sends a private message to another Reddit user
   * 
   * @param params - Message parameters
   * @param params.recipient - Username of recipient (with or without u/ prefix)
   * @param params.subject - Message subject (max 100 characters)
   * @param params.content - Message body (max 10000 characters)
   * @returns Response containing sent message details
   * @throws {RedditError} Thrown if:
   *   - Recipient is missing or invalid
   *   - Reddit API returns errors
   *   - API request fails
   * 
   * @remarks
   * The method automatically:
   * - Cleans the recipient username (removes u/ prefix)
   * - Truncates subject to 100 characters
   * - Generates a unique message ID
   * - Handles Reddit API error responses
   * 
   * @example
   * ```typescript
   * const message = await postService.sendMessage({
   *   recipient: 'username',
   *   subject: 'Hello!',
   *   content: 'This is a test message.'
   * });
   * console.log(`Message sent with ID: ${message.id}`);
   * ```
   */
  public async sendMessage(params: RedditMessageParams): Promise<RedditMessageResponse> {
    try {
      const { recipient, subject, content } = params;

      if (!recipient) {
        throw new RedditError("Recipient is required", "VALIDATION_ERROR");
      }

      // Remove any prefix (u/, /u/, etc) and trim whitespace
      const cleanRecipient = recipient.replace(/^(?:u\/|\/u\/)/i, "").trim();

      if (!cleanRecipient) {
        throw new RedditError("Invalid recipient username", "VALIDATION_ERROR");
      }

      // Create form data with proper encoding
      const formData = new URLSearchParams();
      formData.append("api_type", "json");
      formData.append("subject", subject.slice(0, 100));
      formData.append("text", content);
      formData.append("to", cleanRecipient);

      const response = await this.redditFetch<{
        json: {
          errors: Array<[string, string, string]>; // Reddit returns errors as [name, message, field]
          data?: {
            things: Array<{
              data: {
                id: string;
                name: string;
              };
            }>;
          };
        };
      }>("/api/compose", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });
      // Check for errors in the response
      if (response.json?.errors && response.json.errors.length > 0) {
        const errorMessages = response.json.errors.map(([, message]) => message).join(", ");
        throw new RedditError(`Reddit API Error: ${errorMessages}`, "API_ERROR");
      }

      // Generate a unique ID for the message since Reddit doesn't return one in a consistent format
      const messageId = `t4_${Date.now().toString(36)}`;

      return {
        id: messageId,
        recipient: cleanRecipient,
        subject,
        body: content,
      };
    } catch (error) {
      if (error instanceof RedditError) {
        throw error;
      }
      throw new RedditError(
        `Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`,
        "API_ERROR",
        error,
      );
    }
  }
}
