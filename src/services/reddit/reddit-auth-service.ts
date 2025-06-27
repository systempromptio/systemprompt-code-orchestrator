/**
 * @file Reddit authentication service
 * @module services/reddit/reddit-auth-service
 * 
 * @remarks
 * This service handles OAuth2 authentication for the Reddit API.
 * It manages access tokens, automatic token refresh, and provides
 * authenticated headers for API requests.
 * 
 * The service uses the refresh token grant type to obtain access tokens
 * without requiring user interaction after initial authorization.
 * 
 * @see {@link https://github.com/reddit-archive/reddit/wiki/OAuth2} Reddit OAuth2 Documentation
 */

import { REDDIT_AUTH_URL } from '../../constants.js';
import type { RedditServiceConfig} from '../../types/reddit.js';
import { RedditError } from '../../types/reddit.js';

/**
 * Service for managing Reddit API authentication
 * 
 * @remarks
 * This service handles:
 * - OAuth2 token management with automatic refresh
 * - User agent construction per Reddit API requirements
 * - Authenticated header generation for API requests
 * - User information and preferences fetching
 * 
 * @example
 * ```typescript
 * const authService = new RedditAuthService({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   refreshToken: 'your-refresh-token',
 *   appName: 'MyApp',
 *   appVersion: '1.0.0',
 *   username: 'mybot'
 * });
 * 
 * await authService.initialize();
 * const headers = await authService.getAuthHeaders();
 * ```
 */
export class RedditAuthService {
  private readonly tokenEndpoint = REDDIT_AUTH_URL;
  private readonly userAgent: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  /**
   * Creates a new Reddit authentication service
   * 
   * @param config - Reddit service configuration
   * @param config.clientId - OAuth2 client ID from Reddit app registration
   * @param config.clientSecret - OAuth2 client secret
   * @param config.refreshToken - Long-lived refresh token
   * @param config.appName - Application name for user agent (e.g., 'my-reddit-app')
   * @param config.appVersion - Application version for user agent (e.g., 'v1.0.0')
   * @param config.username - Developer's Reddit username for user agent compliance
   * 
   * @remarks
   * The username parameter should be the DEVELOPER'S Reddit account username,
   * not the end user's. This is used to construct a User-Agent string that
   * complies with Reddit's API requirements. The format will be:
   * `<appName>/<appVersion> by /u/<username>`
   * 
   * @example
   * ```typescript
   * // Correct: Using developer's username
   * new RedditAuthService({
   *   username: 'my_developer_account'  // Your Reddit username
   *   // ... other config
   * });
   * 
   * // Incorrect: Using end user's username
   * new RedditAuthService({
   *   username: authenticatedUser.username  // ❌ Don't do this
   *   // ... other config
   * });
   * ```
   */
  constructor(private readonly config: RedditServiceConfig) {
    this.userAgent = `${config.appName}/${config.appVersion} by /u/${config.username}`;
  }

  /**
   * Initializes the authentication service by obtaining an access token
   * 
   * @remarks
   * This method must be called before making any API requests.
   * It will obtain a fresh access token using the refresh token.
   * 
   * @throws {RedditError} Thrown if token refresh fails
   */
  public async initialize(): Promise<void> {
    await this.refreshAccessToken();
  }

  /**
   * Manually sets an access token (used for OAuth2 flow)
   * 
   * @param token - The OAuth2 access token
   * @param expiresInSeconds - Token expiration time in seconds (defaults to 3600)
   * 
   * @remarks
   * This method is typically used when tokens are obtained through
   * the OAuth2 authorization code flow rather than refresh token flow.
   */
  public setAccessToken(token: string, expiresInSeconds?: number): void {
    this.accessToken = token;
    this.tokenExpiresAt = expiresInSeconds
      ? Date.now() + expiresInSeconds * 1000
      : Date.now() + 3600 * 1000; // Default to 1 hour
  }

  /**
   * Gets the authentication headers required for Reddit API requests
   * 
   * @returns Headers object with Authorization, User-Agent, and Accept headers
   * @throws {RedditError} Thrown if unable to obtain access token
   * 
   * @example
   * ```typescript
   * const headers = await authService.getAuthHeaders();
   * const response = await fetch('https://oauth.reddit.com/api/v1/me', { headers });
   * ```
   */
  public async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      "User-Agent": this.userAgent,
      Accept: "application/json",
    };
  }

  /**
   * Gets the current access token, refreshing if necessary
   * 
   * @returns The valid OAuth2 access token
   * @throws {RedditError} Thrown if unable to obtain or refresh token
   * 
   * @remarks
   * This method automatically handles token expiration and refresh.
   * Tokens are refreshed if they are expired or about to expire.
   */
  public async getAccessToken(): Promise<string> {
    if (!this.accessToken || this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
    return this.accessToken!;
  }

  /**
   * Fetches information about the authenticated user
   * 
   * @returns User information including karma, account age, and status
   * @throws {RedditError} Thrown if API request fails
   * 
   * @example
   * ```typescript
   * const userInfo = await authService.fetchUserInfo();
   * console.log(`Username: ${userInfo.name}`);
   * console.log(`Total karma: ${userInfo.link_karma + userInfo.comment_karma}`);
   * ```
   */
  public async fetchUserInfo() {
    const token = await this.getAccessToken();
    const response = await fetch("https://oauth.reddit.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": this.userAgent,
      },
    });

    if (!response.ok) {
      throw new RedditError(`Failed to fetch user info: ${response.statusText}`, "API_ERROR");
    }

    const data: any = await response.json();
    return {
      id: data.id,
      name: data.name,
      created_utc: data.created_utc,
      comment_karma: data.comment_karma,
      link_karma: data.link_karma,
      is_gold: data.is_gold,
      is_mod: data.is_mod,
      has_verified_email: data.has_verified_email,
    };
  }

  /**
   * Fetches the authenticated user's preferences
   * 
   * @returns User preferences including notification settings, content filters, and UI preferences
   * @throws {RedditError} Thrown if API request fails
   * 
   * @example
   * ```typescript
   * const prefs = await authService.fetchUserPreferences();
   * console.log(`NSFW content enabled: ${prefs.show_nsfw}`);
   * console.log(`Theme: ${prefs.theme}`);
   * ```
   */
  public async fetchUserPreferences() {
    const token = await this.getAccessToken();
    const response = await fetch("https://oauth.reddit.com/api/v1/me/prefs", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": this.userAgent,
      },
    });

    if (!response.ok) {
      throw new RedditError(
        `Failed to fetch user preferences: ${response.statusText}`,
        "API_ERROR",
      );
    }

    const prefs: any = await response.json();
    return {
      enable_notifications: prefs.enable_notifications ?? true,
      show_nsfw: prefs.over_18 ?? false,
      default_comment_sort: prefs.default_comment_sort ?? "best",
      theme: prefs.theme ?? "dark",
      language: prefs.language ?? "en",
    };
  }

  /**
   * Checks if the current access token is expired
   * 
   * @returns True if token is expired or expiration time is unknown
   * @internal
   */
  private isTokenExpired(): boolean {
    return !this.tokenExpiresAt || Date.now() >= this.tokenExpiresAt;
  }

  /**
   * Refreshes the access token using the refresh token
   * 
   * @throws {RedditError} Thrown if token refresh fails
   * 
   * @remarks
   * This method uses the OAuth2 refresh token grant type to obtain
   * a new access token. The refresh token itself never expires but
   * can be revoked by the user.
   * 
   * @see {@link https://github.com/reddit-archive/reddit/wiki/OAuth2#refreshing-the-token} Reddit Token Refresh Documentation
   * @internal
   */
  public async refreshAccessToken(): Promise<void> {
    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      "base64",
    );

    const response = await fetch(this.tokenEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": this.userAgent,
      },
      body: `grant_type=refresh_token&refresh_token=${this.config.refreshToken}`,
    });

    if (!response.ok) {
      throw new RedditError(`Failed to refresh access token: ${response.statusText}`, "AUTH_ERROR");
    }

    const data: any = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
  }
}
