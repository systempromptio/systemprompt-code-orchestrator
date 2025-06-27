/**
 * @file Main Reddit service implementation
 * @module services/reddit/reddit-service
 * 
 * @remarks
 * This is the primary service class for interacting with the Reddit API in the MCP server.
 * It implements the Facade pattern to coordinate between specialized services:
 * - {@link RedditAuthService} for authentication and token management
 * - {@link RedditPostService} for post and comment operations  
 * - {@link RedditSubredditService} for subreddit-related operations
 * 
 * The service supports both OAuth2 flow (with provided tokens) and environment-based
 * configuration for backward compatibility.
 * 
 * @see {@link https://www.reddit.com/dev/api/} Reddit API Documentation
 * @see {@link https://github.com/reddit-archive/reddit/wiki/OAuth2} Reddit OAuth2 Documentation
 */

import { REDDIT_BASE_URL, DEFAULT_RATE_LIMIT_DELAY } from '../../constants.js';
import type {
  RedditPost,
  RedditServiceConfig,
  RedditPostParams,
  RedditPostResponse,
  RedditReplyParams,
  RedditReplyResponse,
  FetchPostsOptions,
  RedditPostWithComments,
  RedditNotification as ApiRedditNotification,
  FetchNotificationsOptions,
  FetchSubscribedSubredditsOptions,
  SubscribedSubreddit,
  RedditComment,
  RedditCommentThread,
  SubredditFlair,
} from '../../types/reddit.js';
import { RedditError } from '../../types/reddit.js';

import type {
  RedditConfigData,
  RedditNotification as ConfigRedditNotification,
  RedditMessage,
  SubredditInfo,
} from '../../types/config.js';
import { transformToConfigNotification } from '../../utils/reddit-transformers.js';

import { RedditAuthService } from './reddit-auth-service.js';
import { RedditPostService } from './reddit-post-service.js';
import { RedditSubredditService } from './reddit-subreddit-service.js';

/**
 * Response structure for Reddit flair API endpoints
 * @internal
 */
interface FlairResponse {
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

/**
 * Parameters for sending a comment to Reddit
 */
export interface RedditCommentParams {
  /** The parent ID (t1_ for comment, t3_ for post) */
  id: string;
  /** The comment text (markdown supported) */
  text: string;
  /** Whether to send inbox replies to the author */
  sendreplies?: boolean;
}

/**
 * Response from Reddit after successfully posting a comment
 */
export interface RedditCommentResponse {
  /** The unique ID of the created comment */
  id: string;
  /** The comment text */
  text: string;
  /** The permalink URL to the comment */
  permalink: string;
}

/**
 * Parameters for sending a private message on Reddit
 */
export interface RedditMessageParams {
  /** The username of the recipient (without u/ prefix) */
  recipient: string;
  /** The message subject (max 100 characters) */
  subject: string;
  /** The message content (max 10000 characters) */
  content: string;
}

/**
 * Response from Reddit after successfully sending a message
 */
export interface RedditMessageResponse {
  /** The unique ID of the sent message */
  id: string;
  /** The recipient's username */
  recipient: string;
  /** The message subject */
  subject: string;
  /** The message body */
  body: string;
}

/**
 * Default application configuration for Reddit API requests
 * @internal
 */
const DEFAULT_APP_CONFIG = {
  appName: 'Systemprompt MCP Reddit',
  appVersion: '2.0.0',
};

/**
 * Main service class for interacting with the Reddit API
 * 
 * @remarks
 * This service implements the Facade pattern to provide a unified interface for all Reddit operations.
 * It coordinates between specialized services for authentication, posts, and subreddits.
 * 
 * The service supports two initialization modes:
 * 1. OAuth2 flow with provided tokens (for multi-user scenarios)
 * 2. Environment-based configuration (for single-user/bot scenarios)
 * 
 * @example
 * ```typescript
 * // OAuth2 initialization
 * const service = new RedditService({
 *   accessToken: 'token',
 *   refreshToken: 'refresh',
 *   username: 'user'
 * });
 * 
 * // Singleton pattern with environment config
 * const service = RedditService.getInstance();
 * await service.initialize();
 * ```
 */

export class RedditService {
  private static instance: RedditService;
  private readonly baseUrl = REDDIT_BASE_URL;
  private readonly rateLimitDelay = DEFAULT_RATE_LIMIT_DELAY * 2; // Using 2x the default for safety
  private initialized = false;

  private authService: RedditAuthService;
  private postService: RedditPostService;
  private subredditService: RedditSubredditService;

  /**
   * Creates a new RedditService instance
   * 
   * @param authTokens - Optional OAuth2 tokens for authentication
   * @param authTokens.accessToken - OAuth2 access token
   * @param authTokens.refreshToken - OAuth2 refresh token for token renewal
   * @param authTokens.username - Reddit username (optional, defaults to 'oauth-user')
   * 
   * @remarks
   * When authTokens are provided, the service is initialized for OAuth2 flow.
   * When omitted, the service expects environment-based configuration.
   * 
   * @throws {RedditError} Thrown if OAuth tokens provided but client credentials missing
   * 
   * @example
   * ```typescript
   * // OAuth2 flow
   * const service = new RedditService({
   *   accessToken: 'token',
   *   refreshToken: 'refresh',
   *   username: 'myuser'
   * });
   * 
   * // Environment-based (requires initialize())
   * const service = new RedditService();
   * ```
   */
  constructor(authTokens?: { accessToken: string; refreshToken: string; username?: string }) {
    this.initialized = false;

    if (authTokens) {
      // OAuth flow provides tokens - we need Reddit client credentials from environment
      // to be able to refresh tokens when they expire
      const clientId = process.env.REDDIT_CLIENT_ID;
      const clientSecret = process.env.REDDIT_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        throw new RedditError(
          "REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables are required",
          "CONFIGURATION_ERROR",
        );
      }
      
      const config = {
        clientId,
        clientSecret,
        refreshToken: authTokens.refreshToken,
        appName: DEFAULT_APP_CONFIG.appName,
        appVersion: DEFAULT_APP_CONFIG.appVersion,
        username: authTokens.username || 'oauth-user', // Use provided username from OAuth
      };
      this.authService = new RedditAuthService(config);
      // Set the access token directly
      this.authService.setAccessToken(authTokens.accessToken);
      this.initialized = true;
    } else {
      // Use environment-based config for singleton pattern (backwards compatibility)
      const config = this.loadConfig();
      this.authService = new RedditAuthService(config);
    }

    this.postService = new RedditPostService(this.baseUrl, this.authService, this.rateLimitDelay);
    this.subredditService = new RedditSubredditService(
      this.baseUrl,
      this.authService,
      this.rateLimitDelay,
    );
  }

  /**
   * Gets the singleton instance of RedditService
   * 
   * @remarks
   * This method implements the Singleton pattern for backward compatibility.
   * The instance uses environment-based configuration.
   * 
   * @returns The singleton RedditService instance
   * 
   * @example
   * ```typescript
   * const reddit = RedditService.getInstance();
   * await reddit.initialize();
   * const posts = await reddit.fetchPosts({ subreddit: 'all' });
   * ```
   */
  public static getInstance(): RedditService {
    if (!RedditService.instance) {
      RedditService.instance = new RedditService();
    }
    return RedditService.instance;
  }

  /**
   * Initialize the service and authenticate (for singleton pattern)
   * 
   * @remarks
   * This method is only needed when using the singleton pattern with environment-based configuration.
   * OAuth2-initialized instances are automatically initialized.
   * 
   * @throws {RedditError} Thrown if initialization fails or service is already initialized
   * 
   * @example
   * ```typescript
   * const reddit = RedditService.getInstance();
   * await reddit.initialize();
   * ```
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.authService.initialize();
      this.initialized = true;
    } catch (error) {
      throw new RedditError(
        `Failed to initialize Reddit service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_ERROR',
        error,
      );
    }
  }

  /**
   * Loads configuration from environment variables
   * 
   * @remarks
   * Required environment variables:
   * - REDDIT_CLIENT_ID: OAuth2 client ID
   * - REDDIT_CLIENT_SECRET: OAuth2 client secret
   * - REDDIT_REFRESH_TOKEN: Long-lived refresh token
   * - REDDIT_USERNAME: Reddit username
   * 
   * Optional environment variables:
   * - REDDIT_APP_NAME: Application name for user agent
   * - REDDIT_APP_VERSION: Application version for user agent
   * 
   * @throws {RedditError} Thrown if required environment variables are missing
   * @returns Reddit service configuration object
   */
  private loadConfig(): RedditServiceConfig {
    // For singleton pattern, all config must come from environment
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const refreshToken = process.env.REDDIT_REFRESH_TOKEN;
    const username = process.env.REDDIT_USERNAME;

    if (!clientId || !clientSecret || !refreshToken || !username) {
      throw new RedditError(
        'Missing required environment variables: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_REFRESH_TOKEN, REDDIT_USERNAME',
        'CONFIGURATION_ERROR',
      );
    }

    return {
      clientId,
      clientSecret,
      refreshToken,
      appName: process.env.REDDIT_APP_NAME || DEFAULT_APP_CONFIG.appName,
      appVersion: process.env.REDDIT_APP_VERSION || DEFAULT_APP_CONFIG.appVersion,
      username,
    };
  }

  /**
   * Fetches posts based on provided options
   * 
   * @param options - Options for fetching posts including subreddit, sort order, and filters
   * @returns Array of Reddit posts
   * @throws {RedditError} Thrown if the service is not initialized or API request fails
   * 
   * @example
   * ```typescript
   * const posts = await reddit.fetchPosts({
   *   subreddit: 'programming',
   *   sort: 'hot',
   *   limit: 25
   * });
   * ```
   */
  public async fetchPosts(options: FetchPostsOptions): Promise<RedditPost[]> {
    this.checkInitialized();
    return this.postService.fetchPosts(options);
  }

  /**
   * Creates a new post on Reddit
   * 
   * @param params - Parameters for creating the post
   * @returns Response containing the created post details
   * @throws {RedditError} Thrown if:
   *   - Service is not initialized
   *   - Title length is invalid (must be 1-300 characters)
   *   - Flair is required but not provided
   *   - API request fails
   * 
   * @example
   * ```typescript
   * const post = await reddit.createPost({
   *   subreddit: 'test',
   *   title: 'My First Post',
   *   text: 'Hello Reddit!',
   *   flair_id: 'discussion'
   * });
   * ```
   */
  public async createPost(params: RedditPostParams): Promise<RedditPostResponse> {
    this.checkInitialized();

    // Validate title length
    if (params.title.length < 1 || params.title.length > 300) {
      throw new RedditError('Post title must be between 1 and 300 characters', 'VALIDATION_ERROR');
    }
    // Get subreddit requirements
    const subredditInfo = await this.getSubredditInfo(params.subreddit);

    // Check if flair is required
    if (subredditInfo.flairRequired && !params.flair_id && !params.flair_text) {
      throw new RedditError(
        `Flair is required for posts in r/${params.subreddit}`,
        'VALIDATION_ERROR',
      );
    }

    return this.postService.createPost(params);
  }

  /**
   * Fetches detailed subreddit information including rules and posting requirements
   * 
   * @param subreddit - The subreddit name (without r/ prefix)
   * @returns Subreddit information including rules, requirements, and metadata
   * @throws {RedditError} Thrown if service is not initialized or subreddit doesn't exist
   * 
   * @example
   * ```typescript
   * const info = await reddit.getSubredditInfo('programming');
   * console.log(info.rules);
   * ```
   */
  public async getSubredditInfo(subreddit: string) {
    this.checkInitialized();
    return this.subredditService.getSubredditInfo(subreddit);
  }

  /**
   * Fetches a single Reddit post by its ID, including comments
   * 
   * @param id - The ID of the post (without t3_ prefix)
   * @returns The post with its comment tree
   * @throws {RedditError} Thrown if service is not initialized or post not found
   * 
   * @example
   * ```typescript
   * const post = await reddit.fetchPostById('abc123');
   * console.log(post.title);
   * console.log(`${post.comments.length} top-level comments`);
   * ```
   */
  public async fetchPostById(id: string): Promise<RedditPostWithComments> {
    this.checkInitialized();
    return this.postService.fetchPostById(id);
  }

  /**
   * Fetches user notifications (inbox items) from Reddit
   * 
   * @param options - Options for fetching notifications
   * @param options.filter - Filter type: 'all', 'unread', 'messages', 'comments', 'mentions'
   * @param options.limit - Maximum number of notifications to fetch
   * @param options.markRead - Whether to mark fetched notifications as read
   * @returns Array of notifications from the user's inbox
   * @throws {RedditError} Thrown if service is not initialized or request fails
   * 
   * @example
   * ```typescript
   * // Get unread notifications
   * const unread = await reddit.fetchNotifications({
   *   filter: 'unread',
   *   limit: 25,
   *   markRead: false
   * });
   * ```
   */
  public async fetchNotifications(
    options: FetchNotificationsOptions = {},
  ): Promise<ApiRedditNotification[]> {
    this.checkInitialized();
    const response = await this.postService.fetchNotifications(options);
    return response;
  }

  /**
   * Fetches the list of subreddits the authenticated user is subscribed to
   * 
   * @param options - Options for fetching subscribed subreddits
   * @param options.limit - Maximum number of subreddits to fetch
   * @param options.after - Pagination cursor for fetching next page
   * @returns Array of subscribed subreddits with metadata
   * @throws {RedditError} Thrown if service is not initialized or request fails
   * 
   * @example
   * ```typescript
   * const subs = await reddit.fetchSubscribedSubreddits({ limit: 100 });
   * console.log(`Subscribed to ${subs.length} subreddits`);
   * ```
   */
  public async fetchSubscribedSubreddits(
    options: FetchSubscribedSubredditsOptions = {},
  ): Promise<SubscribedSubreddit[]> {
    this.checkInitialized();
    return this.subredditService.fetchSubscribedSubreddits(options);
  }

  /**
   * Fetches information about the authenticated user
   * 
   * @returns User information including karma, created date, and preferences
   * @throws {RedditError} Thrown if service is not initialized or request fails
   * 
   * @example
   * ```typescript
   * const user = await reddit.fetchUserInfo();
   * console.log(`Username: ${user.name}`);
   * console.log(`Karma: ${user.link_karma + user.comment_karma}`);
   * ```
   */
  public async fetchUserInfo() {
    this.checkInitialized();
    return this.authService.fetchUserInfo();
  }

  /**
   * Fetches the authenticated user's Reddit preferences
   * 
   * @returns User preferences object
   * @throws {RedditError} Thrown if service is not initialized or request fails
   * 
   * @example
   * ```typescript
   * const prefs = await reddit.fetchUserPreferences();
   * console.log(`Over 18: ${prefs.over_18}`);
   * ```
   */
  public async fetchUserPreferences() {
    this.checkInitialized();
    return this.authService.fetchUserPreferences();
  }

  /**
   * Formats a Reddit API notification into the config response format
   * 
   * @param notification - Raw notification from Reddit API
   * @returns Formatted notification or message object
   * @internal
   */
  private formatNotification(
    notification: ApiRedditNotification,
  ): ConfigRedditNotification | RedditMessage {
    return transformToConfigNotification(notification);
  }

  /**
   * Formats subscribed subreddit data into the config response format
   * 
   * @param subreddit - Subscribed subreddit data from Reddit API
   * @returns Formatted subreddit information
   * @internal
   */
  private formatSubredditInfo = (subreddit: SubscribedSubreddit): SubredditInfo => {
    return {
      id: subreddit.id,
      name: subreddit.name,
      display_name: subreddit.displayName,
      title: subreddit.title,
      description: subreddit.description,
      subscribers: subreddit.subscribers,
      created_utc: subreddit.createdUtc,
      url: subreddit.url,
      over18: subreddit.isNsfw,
      icon_img: subreddit.icon,
      user_is_subscriber: true, // Since this is from subscribed subreddits
      user_is_moderator: false, // We don't have this info from the subscribed endpoint
      rules: [], // Rules are not included in the subscribed endpoint
      post_requirements: undefined, // Post requirements are not included in the subscribed endpoint
    };
  };

  /**
   * Gets the complete Reddit configuration including user info, notifications, and subscribed subreddits
   * 
   * @remarks
   * This method fetches all necessary data for initializing the MCP client interface.
   * It makes parallel API requests to optimize performance.
   * 
   * @returns Complete Reddit configuration data including:
   *   - User information and preferences
   *   - Recent notifications (comments, mentions)
   *   - Private messages
   *   - Subscribed subreddits
   * 
   * @throws {RedditError} Thrown if service is not initialized or any API request fails
   * 
   * @example
   * ```typescript
   * const config = await reddit.getRedditConfig();
   * console.log(`Logged in as: ${config.user.name}`);
   * console.log(`${config.notifications.length} new notifications`);
   * ```
   */
  public async getRedditConfig(): Promise<RedditConfigData> {
    this.checkInitialized();

    try {
      // Fetch all required data in parallel
      const [allNotifications, subscribedSubreddits, userInfo, userPreferences] = await Promise.all(
        [
          this.fetchNotifications({ filter: 'all', limit: 10, markRead: false }),
          this.fetchSubscribedSubreddits({ limit: 50 }),
          this.fetchUserInfo(),
          this.fetchUserPreferences(),
        ],
      );

      // Transform notifications and messages
      const transformed = allNotifications.map((n) => this.formatNotification(n));

      // Separate messages from notifications
      const messages = transformed.filter((n): n is RedditMessage => n.type === 'message');
      const notifications = transformed.filter(
        (n): n is ConfigRedditNotification => n.type !== 'message',
      );

      // Format the data according to our schema
      return {
        notifications,
        messages,
        subscribedSubreddits: subscribedSubreddits.map(this.formatSubredditInfo),
        user: {
          ...userInfo,
          preferences: userPreferences,
        },
      };
    } catch (error) {
      throw new RedditError(
        `Failed to fetch Reddit configuration: ${error instanceof Error ? error.message : error}`,
        'API_ERROR',
      );
    }
  }

  /**
   * Search Reddit posts using the search API
   * 
   * @param options - Search parameters
   * @param options.query - Search query string
   * @param options.subreddit - Optional subreddit to search within
   * @param options.sort - Sort order for results
   * @param options.time - Time range for search (only applies to 'top' sort)
   * @param options.limit - Maximum number of results to return
   * @returns Array of posts matching the search criteria
   * @throws {RedditError} Thrown if service is not initialized or search fails
   * 
   * @example
   * ```typescript
   * const posts = await reddit.searchReddit({
   *   query: 'typescript tutorial',
   *   subreddit: 'programming',
   *   sort: 'relevance',
   *   limit: 10
   * });
   * ```
   */
  public async searchReddit(options: {
    query: string;
    subreddit?: string;
    sort?: 'relevance' | 'hot' | 'new' | 'top';
    time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
    limit?: number;
  }): Promise<RedditPost[]> {
    this.checkInitialized();
    return this.postService.searchReddit(options);
  }

  /**
   * Fetches a single comment by its ID
   * 
   * @param id - The ID of the comment (without t1_ prefix)
   * @returns The comment object with metadata
   * @throws {RedditError} Thrown if service is not initialized or comment not found
   * 
   * @example
   * ```typescript
   * const comment = await reddit.fetchCommentById('def456');
   * console.log(`Comment by ${comment.author}: ${comment.body}`);
   * ```
   */
  public async fetchCommentById(id: string): Promise<RedditComment> {
    this.checkInitialized();
    return this.postService.fetchCommentById(id);
  }

  /**
   * Fetches a comment thread (comment with all its replies)
   * 
   * @param parentId - The ID of the post containing the comment
   * @param id - The ID of the comment to fetch
   * @returns The comment thread with nested replies
   * @throws {RedditError} Thrown if service is not initialized or comment not found
   * 
   * @example
   * ```typescript
   * const thread = await reddit.fetchCommentThread('postId123', 'commentId456');
   * console.log(`Thread has ${thread.replies.length} direct replies`);
   * ```
   */
  public async fetchCommentThread(parentId: string, id: string): Promise<RedditCommentThread> {
    this.checkInitialized();
    return this.postService.fetchCommentThread(parentId, id);
  }

  /**
   * Sends a reply to a post or comment
   * 
   * @param params - Reply parameters
   * @param params.id - Parent ID (t1_ for comment, t3_ for post)
   * @param params.text - Reply text (markdown supported, max 10000 characters)
   * @returns Response containing the created reply details
   * @throws {RedditError} Thrown if:
   *   - Service is not initialized
   *   - Parent ID format is invalid
   *   - Text exceeds 10000 characters
   *   - API request fails
   * 
   * @example
   * ```typescript
   * // Reply to a post
   * const reply = await reddit.sendReply({
   *   id: 't3_abc123',
   *   text: 'Great post!'
   * });
   * 
   * // Reply to a comment
   * const reply = await reddit.sendReply({
   *   id: 't1_def456',
   *   text: 'I agree with this comment'
   * });
   * ```
   */
  public async sendReply(params: RedditReplyParams): Promise<RedditReplyResponse> {
    this.checkInitialized();

    // Validate parent ID format
    if (!params.id.match(/^t[1|3]_[a-z0-9]+$/i)) {
      throw new RedditError(
        'Invalid parent ID format. Must start with t1_ or t3_',
        'VALIDATION_ERROR',
      );
    }

    // Validate text length
    if (params.text.length > 10000) {
      throw new RedditError(
        'Reply text exceeds maximum length of 10000 characters',
        'VALIDATION_ERROR',
      );
    }

    return this.postService.sendReply(params.id, params.text);
  }

  /**
   * Fetches available post flairs for a subreddit
   * 
   * @param subreddit - The subreddit name (without r/ prefix)
   * @returns Array of available flairs, or empty array if flairs cannot be fetched
   * 
   * @remarks
   * This method will return an empty array if:
   * - The subreddit doesn't exist
   * - The user doesn't have permission to view flairs
   * - The subreddit has no flairs configured
   * 
   * @example
   * ```typescript
   * const flairs = await reddit.getSubredditFlairs('programming');
   * const discussionFlair = flairs.find(f => f.text === 'Discussion');
   * ```
   */
  async getSubredditFlairs(subreddit: string): Promise<SubredditFlair[]> {
    try {
      const response = await this.subredditService.getFlairs(subreddit);

      return response.choices.map((flair: FlairResponse['choices'][0]) => ({
        id: flair.flair_template_id,
        text: flair.text,
        type: flair.type as 'text' | 'richtext' | 'image',
        textEditable: flair.text_editable,
        backgroundColor: flair.background_color,
        textColor: flair.text_color,
        modOnly: flair.mod_only,
      }));
    } catch (error) {
      // If we can't fetch flairs (e.g., no permission, subreddit doesn't exist), return empty array
      console.warn(`Failed to fetch flairs for subreddit ${subreddit}:`, error);
      return [];
    }
  }

  /**
   * Sends a comment (alias for sendReply)
   * 
   * @param params - Comment parameters
   * @param params.id - Parent ID (t1_ for comment, t3_ for post)
   * @param params.text - Comment text (markdown supported)
   * @param params.sendreplies - Whether to send inbox replies (default: true)
   * @returns Response containing the created comment details
   * @throws {RedditError} Thrown if:
   *   - Service is not initialized
   *   - Required parameters are missing
   *   - ID format is invalid
   *   - API request fails
   * 
   * @see {@link sendReply} for the primary implementation
   * 
   * @example
   * ```typescript
   * const comment = await reddit.sendComment({
   *   id: 't3_postid',
   *   text: 'This is my comment',
   *   sendreplies: true
   * });
   * ```
   */
  public async sendComment(params: RedditCommentParams): Promise<RedditCommentResponse> {
    try {
      const { id, text } = params;

      if (!id) {
        throw new RedditError('id is required for sending comments', 'VALIDATION_ERROR');
      }

      if (!text) {
        throw new RedditError('text is required for sending comments', 'VALIDATION_ERROR');
      }

      // Validate ID format
      if (!/^t[1|3]_[a-z0-9]+$/.test(id)) {
        throw new RedditError(
          'Invalid ID format. Must start with t1_ for comments or t3_ for posts',
          'VALIDATION_ERROR',
        );
      }

      return this.postService.sendComment(params.id, params.text);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sends a private message to another Reddit user
   * 
   * @param params - Message parameters
   * @param params.recipient - Username of the recipient (without u/ prefix)
   * @param params.subject - Message subject (max 100 characters)
   * @param params.content - Message body (max 10000 characters)
   * @returns Response containing the sent message details
   * @throws {RedditError} Thrown if:
   *   - Service is not initialized
   *   - Required fields are missing
   *   - Subject exceeds 100 characters
   *   - Content exceeds 10000 characters
   *   - API request fails
   * 
   * @example
   * ```typescript
   * const message = await reddit.sendMessage({
   *   recipient: 'username',
   *   subject: 'Hello!',
   *   content: 'This is a test message.'
   * });
   * ```
   */
  public async sendMessage(params: RedditMessageParams): Promise<RedditMessageResponse> {
    this.checkInitialized();

    try {
      const { recipient, subject, content } = params;

      if (!recipient || !subject || !content) {
        throw new RedditError('Missing required fields', 'VALIDATION_ERROR');
      }

      // Validate subject length
      if (subject.length > 100) {
        throw new RedditError(
          'Subject exceeds maximum length of 100 characters',
          'VALIDATION_ERROR',
        );
      }

      // Validate content length
      if (content.length > 10000) {
        throw new RedditError(
          'Content exceeds maximum length of 10000 characters',
          'VALIDATION_ERROR',
        );
      }

      return this.postService.sendMessage(params);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Checks if the service is initialized and throws an error if not
   * 
   * @throws {RedditError} Thrown if the service is not initialized
   * @internal
   */
  private checkInitialized() {
    if (!this.initialized) {
      throw new RedditError(
        'RedditService not initialized. Call initialize() first',
        'INITIALIZATION_ERROR',
      );
    }
  }
}
