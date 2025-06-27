/**
 * @file Base Reddit fetch service with authentication and rate limiting
 * @module services/reddit/reddit-fetch-service
 * 
 * @remarks
 * This abstract base class provides common functionality for all Reddit API services.
 * It handles authentication, rate limiting, automatic token refresh, and error handling.
 * 
 * Features:
 * - Automatic authentication header injection
 * - Built-in rate limiting to comply with Reddit API rules
 * - Automatic token refresh on 401 responses
 * - Retry logic for rate-limited requests (429 responses)
 * - Consistent error handling and transformation
 * 
 * @see {@link https://www.reddit.com/dev/api/#section_rate_limiting} Reddit Rate Limiting Documentation
 */

import { RedditError } from '../../types/reddit.js';

import type { RedditAuthService } from './reddit-auth-service.js';

/**
 * Abstract base class for Reddit API services
 * 
 * @remarks
 * This class provides the core fetching functionality with built-in:
 * - Authentication via RedditAuthService
 * - Rate limiting to prevent API throttling
 * - Automatic retry on auth failures
 * - Proper error handling and transformation
 * 
 * Services that extend this class inherit all these features automatically.
 * 
 * @example
 * ```typescript
 * class MyRedditService extends RedditFetchService {
 *   async getMyData() {
 *     return this.redditFetch<MyDataType>('/api/v1/me');
 *   }
 * }
 * ```
 */
export abstract class RedditFetchService {
  /**
   * Creates a new Reddit fetch service
   * 
   * @param baseUrl - The base URL for Reddit API (https://oauth.reddit.com)
   * @param authService - The authentication service for token management
   * @param rateLimitDelay - Delay between requests in milliseconds (recommended: 2000ms)
   */
  constructor(
    private readonly baseUrl: string,
    private readonly authService: RedditAuthService,
    private readonly rateLimitDelay: number,
  ) {}

  /**
   * Makes an authenticated request to the Reddit API with automatic retry logic
   * 
   * @param endpoint - The API endpoint (e.g., '/api/v1/me')
   * @param options - Fetch options (method, body, headers, etc.)
   * @param isRetry - Internal flag to prevent infinite retry loops
   * @returns The parsed JSON response
   * @throws {RedditError} Thrown if the API request fails after retries
   * 
   * @remarks
   * This method includes several important features:
   * - Automatic rate limiting with configurable delay
   * - Automatic token refresh on 401 Unauthorized responses
   * - Retry logic for 429 Too Many Requests with Retry-After header support
   * - Comprehensive error handling with detailed error messages
   * 
   * The method will:
   * 1. Add authentication headers to the request
   * 2. Apply rate limiting delay before the request
   * 3. Handle 401 errors by refreshing the token and retrying once
   * 4. Handle 429 errors by waiting the specified time and retrying
   * 5. Transform all other errors into RedditError instances
   * 
   * @example
   * ```typescript
   * // GET request
   * const user = await this.redditFetch<UserData>('/api/v1/me');
   * 
   * // POST request with form data
   * const result = await this.redditFetch('/api/submit', {
   *   method: 'POST',
   *   body: new URLSearchParams({ title: 'Test', text: 'Content' })
   * });
   * ```
   * 
   * @protected
   */
  protected async redditFetch<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const headers = await this.authService.getAuthHeaders();

    // Add rate limiting delay
    await new Promise((resolve) => setTimeout(resolve, this.rateLimitDelay));

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        ...headers,
      },
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - token might be expired
      if (response.status === 401 && !isRetry) {
        // Try to refresh the access token
        await this.authService.refreshAccessToken();
        // Retry the request once with the new token
        return this.redditFetch<T>(endpoint, options, true);
      }
      
      if (response.status === 429) {
        // Handle rate limiting
        const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return this.redditFetch<T>(endpoint, options);
      }

      const errorData = await response.json().catch(() => null);
      throw new RedditError(
        `Reddit API error: ${response.status} ${response.statusText}${
          errorData ? ` - ${JSON.stringify(errorData)}` : ""
        }`,
        "API_ERROR",
        errorData,
      );
    }

    return response.json() as any;
  }
}
