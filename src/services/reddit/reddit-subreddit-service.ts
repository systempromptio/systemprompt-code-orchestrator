/**
 * @file Reddit subreddit service
 * @module services/reddit/reddit-subreddit-service
 * 
 * @remarks
 * This service handles all subreddit-related operations for the Reddit API.
 * It provides methods for fetching subreddit information, rules, requirements,
 * subscriptions, and available post flairs.
 * 
 * The service extends RedditFetchService to inherit authentication and rate limiting.
 * 
 * @see {@link https://www.reddit.com/dev/api/#section_subreddits} Reddit Subreddits API
 */

import { DEFAULT_SUBREDDIT_LIMIT } from '../../constants.js';

import type {
  RedditApiResponse,
  RedditSubreddit,
  SubredditRulesResponse,
  SubredditRequirements,
  FetchSubscribedSubredditsOptions,
  SubscribedSubreddit,
  FlairResponse} from '../../types/reddit.js';
import {
  RedditError
} from '../../types/reddit.js';

import {
  transformSubreddit,
  transformSubscribedSubreddit,
} from '../../utils/reddit-transformers.js';

import type { RedditAuthService } from './reddit-auth-service.js';
import { RedditFetchService } from './reddit-fetch-service.js';

/**
 * Service for handling Reddit subreddit operations
 * 
 * @remarks
 * This service provides methods for:
 * - Fetching subreddit information and rules
 * - Getting posting requirements and restrictions
 * - Retrieving user's subscribed subreddits
 * - Fetching available post flairs
 * 
 * @example
 * ```typescript
 * const subredditService = new RedditSubredditService(
 *   'https://oauth.reddit.com',
 *   authService,
 *   2000
 * );
 * 
 * const info = await subredditService.getSubredditInfo('programming');
 * console.log(info.rules);
 * ```
 */
export class RedditSubredditService extends RedditFetchService {
  /**
   * Creates a new Reddit subreddit service
   * 
   * @param baseUrl - The base URL for Reddit API requests (https://oauth.reddit.com)
   * @param authService - The authentication service instance
   * @param rateLimitDelay - Delay in milliseconds between API requests
   */
  constructor(baseUrl: string, authService: RedditAuthService, rateLimitDelay: number) {
    super(baseUrl, authService, rateLimitDelay);
  }

  /**
   * Fetches comprehensive information about a subreddit
   * 
   * @param subreddit - The subreddit name (without r/ prefix)
   * @returns Subreddit requirements including rules, post types, and restrictions
   * @throws {RedditError} Thrown if subreddit doesn't exist or API request fails
   * 
   * @remarks
   * This method fetches both general subreddit information and specific rules
   * in parallel for optimal performance. The returned object includes:
   * - Allowed post types (text, link, image, video, etc.)
   * - Subreddit rules with descriptions
   * - Title and body requirements
   * - Whether flair is required for posts
   * 
   * @example
   * ```typescript
   * const info = await subredditService.getSubredditInfo('askreddit');
   * 
   * if (info.flairRequired) {
   *   console.log('This subreddit requires post flair');
   * }
   * 
   * info.rules.forEach(rule => {
   *   console.log(`${rule.short_name}: ${rule.description}`);
   * });
   * ```
   */
  public async getSubredditInfo(subreddit: string): Promise<SubredditRequirements> {
    try {
      const [aboutData, rulesData] = await Promise.all([
        this.redditFetch<RedditApiResponse<RedditSubreddit>>(`/r/${subreddit}/about.json`),
        this.redditFetch<SubredditRulesResponse>(`/r/${subreddit}/about/rules.json`),
      ]);

      const subredditData = transformSubreddit({
        ...aboutData.data,
        rules: rulesData.rules,
      });

      return {
        allowedPostTypes: subredditData.allowedPostTypes,
        rules: subredditData.rules,
        titleRequirements: subredditData.postRequirements.title,
        bodyRequirements: subredditData.postRequirements.body,
        flairRequired: subredditData.postRequirements.flairRequired,
      };
    } catch (error) {
      throw new RedditError(
        `Failed to fetch subreddit info: ${error instanceof Error ? error.message : "Unknown error"}`,
        "API_ERROR",
        error,
      );
    }
  }

  /**
   * Fetches the list of subreddits the authenticated user is subscribed to
   * 
   * @param options - Options for pagination and filtering
   * @param options.limit - Maximum number of subreddits to fetch (default: 100)
   * @param options.after - Pagination cursor for next page
   * @returns Array of subscribed subreddits with metadata
   * @throws {RedditError} Thrown if API request fails
   * 
   * @remarks
   * Reddit returns subscribed subreddits in batches. Use the 'after' parameter
   * for pagination if the user is subscribed to more than 100 subreddits.
   * 
   * @example
   * ```typescript
   * // Get first 100 subscribed subreddits
   * const subs = await subredditService.fetchSubscribedSubreddits();
   * 
   * // Get next page
   * const moreSubs = await subredditService.fetchSubscribedSubreddits({
   *   after: subs[subs.length - 1].name
   * });
   * ```
   */
  public async fetchSubscribedSubreddits(
    options: FetchSubscribedSubredditsOptions = {},
  ): Promise<SubscribedSubreddit[]> {
    try {
      const limit = options.limit || DEFAULT_SUBREDDIT_LIMIT;
      let endpoint = `/subreddits/mine/subscriber.json?limit=${limit}`;

      if (options.after) {
        endpoint += `&after=${options.after}`;
      }

      const data = await this.redditFetch<RedditApiResponse<Record<string, any>>>(endpoint);
      return (data.data.children || []).map((item) => transformSubscribedSubreddit(item.data));
    } catch (error) {
      throw new RedditError(
        `Failed to fetch subscribed subreddits: ${error instanceof Error ? error.message : "Unknown error"}`,
        "API_ERROR",
        error,
      );
    }
  }

  /**
   * Fetches available post flairs for a subreddit
   * 
   * @param subreddit - The subreddit name (without r/ prefix)
   * @returns Flair response object containing available flairs
   * @throws {RedditError} Thrown if API request fails or user lacks permission
   * 
   * @remarks
   * This method returns the raw flair response from Reddit. The response includes:
   * - Flair template IDs
   * - Flair text and editability
   * - Background and text colors
   * - Whether the flair is mod-only
   * 
   * Some subreddits may restrict flair access or have no flairs configured.
   * 
   * @example
   * ```typescript
   * const flairResponse = await subredditService.getFlairs('science');
   * 
   * flairResponse.choices.forEach(flair => {
   *   console.log(`${flair.text} (ID: ${flair.flair_template_id})`);
   * });
   * ```
   */
  async getFlairs(subreddit: string): Promise<FlairResponse> {
    const response = await this.redditFetch<FlairResponse>(`/r/${subreddit}/api/link_flair_v2`);
    return response;
  }
}
