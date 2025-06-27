/**
 * @file Global constants for the Reddit MCP server
 * @module constants
 * 
 * @remarks
 * This module contains constant values used throughout the Reddit MCP server,
 * including API endpoints, rate limits, default values, and error messages.
 */

/**
 * Base URL for authenticated Reddit API requests.
 * 
 * @remarks
 * All authenticated API requests should use this base URL.
 * The oauth subdomain is required for requests using OAuth2 tokens.
 * 
 * @see {@link https://www.reddit.com/dev/api/ | Reddit API Documentation}
 */
export const REDDIT_BASE_URL = "https://oauth.reddit.com";

/**
 * URL for Reddit OAuth2 token endpoint.
 * 
 * @remarks
 * Used for refreshing access tokens using refresh tokens.
 * Requires Basic authentication with client credentials.
 * 
 * @see {@link https://github.com/reddit-archive/reddit/wiki/OAuth2 | Reddit OAuth2 Documentation}
 */
export const REDDIT_AUTH_URL = "https://www.reddit.com/api/v1/access_token";

/**
 * Default delay between API requests in milliseconds.
 * 
 * @remarks
 * Reddit API has rate limits (60 requests per minute for OAuth).
 * This delay helps prevent hitting rate limits.
 * 
 * @default 1000 (1 second)
 */
export const DEFAULT_RATE_LIMIT_DELAY = 1000; // 1 second

/**
 * Default number of posts to fetch in listing requests.
 * 
 * @remarks
 * Reddit's API supports up to 100 items per request,
 * but 25 provides a good balance between performance and usability.
 * 
 * @default 25
 */
export const DEFAULT_POST_LIMIT = 25;

/**
 * Default number of comments to fetch in comment tree requests.
 * 
 * @remarks
 * Reddit comment trees can be very large. This limit helps
 * control the amount of data fetched in a single request.
 * 
 * @default 100
 */
export const DEFAULT_COMMENT_LIMIT = 100;

/**
 * Default number of notifications to fetch from inbox.
 * 
 * @remarks
 * Keeps notification fetches manageable while still providing
 * a useful amount of recent activity.
 * 
 * @default 25
 */
export const DEFAULT_NOTIFICATION_LIMIT = 25;

/**
 * Default number of subreddits to fetch in subscription lists.
 * 
 * @remarks
 * Users can be subscribed to many subreddits. This limit
 * provides a reasonable subset for most use cases.
 * 
 * @default 100
 */
export const DEFAULT_SUBREDDIT_LIMIT = 100;

/**
 * Standardized error messages for Reddit API operations.
 * 
 * @remarks
 * These messages provide consistent error reporting throughout
 * the application. They should be used with the RedditError class.
 * 
 * @example
 * ```typescript
 * throw new RedditError(
 *   REDDIT_ERROR_MESSAGES.INVALID_AUTH,
 *   "AUTH_ERROR"
 * );
 * ```
 */
export const REDDIT_ERROR_MESSAGES = {
  /** Configuration is missing required fields or has invalid values */
  MISSING_CONFIG: "Reddit configuration is missing or invalid",
  /** OAuth credentials are invalid or expired */
  INVALID_AUTH: "Invalid Reddit authentication credentials",
  /** Reddit API rate limit has been exceeded */
  RATE_LIMIT: "Reddit API rate limit exceeded",
  /** General Reddit API request failure */
  API_ERROR: "Reddit API request failed",
  /** Request parameters failed validation */
  VALIDATION_ERROR: "Invalid request parameters",
} as const;
