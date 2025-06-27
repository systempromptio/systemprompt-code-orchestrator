/**
 * @file Reddit configuration and data structure types
 * @module types/config
 * 
 * @remarks
 * This module contains type definitions for Reddit user data structures
 * used throughout the MCP server. These types represent user-specific
 * data like notifications, messages, subscribed subreddits, and preferences.
 * 
 * The types in this module are primarily used for:
 * - Caching user data to reduce API calls
 * - Providing resources via MCP protocol
 * - Maintaining user state across sessions
 * 
 * @see {@link https://www.reddit.com/dev/api | Reddit API Documentation}
 */

/**
 * Represents a notification from Reddit's inbox
 * Types can include: comment_reply, post_reply, username_mention, etc.
 * 
 * @remarks
 * This type is used in MCP resource handlers to provide Reddit notifications as resources.
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/core/resources | MCP Resources}
 */
export interface RedditNotification {
  /**
   * The full ID of the notification, including type prefix:
   * t1_ = Comment
   * t3_ = Post/Link
   * t4_ = Message/Notification
   * Format: {type_prefix}_{base36_id}
   */
  id: string;
  /**
   * The type of notification
   * Common values: "comment_reply", "post_reply", "username_mention"
   */
  type: "comment_reply" | "post_reply" | "username_mention" | "message" | "other";
  /** Unix timestamp of when the notification was created */
  created_utc: number;
  /** The subreddit where the notification originated */
  subreddit: string;
  /** Title of the post (only present for post_reply types) */
  title?: string;
  /** Subject line of the notification */
  subject: string;
  /** Content of the reply/message */
  body?: string;
  /** Username of the person who triggered the notification */
  author: string;
  /**
   * The full ID of the content being referenced (post or comment), including type prefix:
   * t1_ = Comment (for comment replies)
   * t3_ = Post/Link (for post replies)
   * Format: {type_prefix}_{base36_id}
   */
  parent_id: string;
  /**
   * Reddit URL path to the content
   * Format for comments: /r/{subreddit}/comments/{post_id}/{comment_id}
   * Format for posts: /r/{subreddit}/comments/{post_id}
   */
  permalink: string;
  /** Whether the notification has been read */
  unread: boolean;
}

/**
 * Represents a private message from Reddit
 */
export interface RedditMessage {
  /** Full message ID with t4_ prefix */
  id: string;
  /** Type will always be "message" */
  type: "message";
  /** Subject line of the message */
  subject: string;
  /** ID of the message thread (usually same as message ID) */
  parent_id: string;
  /** Username of message sender */
  author: string;
  /** Content of the message */
  body: string;
  /** Unix timestamp when message was sent */
  created_utc: number;
  /** Whether the message has been read */
  unread: boolean;
}

/**
 * Represents detailed information about a subreddit
 * This matches Reddit's GET /r/{subreddit}/about endpoint
 */
export interface SubredditInfo {
  /**
   * Subreddit's unique ID
   * Should include t5_ prefix for API calls
   */
  id: string;
  /**
   * Internal name with prefix
   * Format: t5_{base36_id}
   */
  name: string;
  /** The subreddit name as shown in URLs (without /r/) */
  display_name: string;
  /** The full title of the subreddit shown in the header */
  title: string;
  /** Subreddit's sidebar text/description (in Markdown) */
  description: string;
  /** Number of subscribers to the subreddit */
  subscribers: number;
  /** Unix timestamp of when the subreddit was created */
  created_utc: number;
  /** Relative URL path to the subreddit */
  url: string;
  /** Whether the subreddit is marked as NSFW */
  over18: boolean;
  /** URL to the subreddit's icon image */
  icon_img?: string;
  /** Whether the current user is subscribed to this subreddit */
  user_is_subscriber: boolean;
  /** Whether the current user is a moderator of this subreddit */
  user_is_moderator: boolean;
  /** List of rules for the subreddit */
  rules?: SubredditRule[];
  /** Requirements for posting in the subreddit */
  post_requirements?: PostRequirements;
}

/**
 * Represents a rule in a subreddit
 * These appear in the subreddit's rules page and when reporting content
 */
export interface SubredditRule {
  /** Type of rule (e.g., "link", "comment", "all") */
  kind: string;
  /** Full description of the rule */
  description: string;
  /** Short title of the rule */
  short_name: string;
  /** Text shown when reporting this rule violation */
  violation_reason: string;
  /** Unix timestamp when the rule was created */
  created_utc: number;
  /** Order in which rules are displayed */
  priority: number;
}

/**
 * Requirements that must be met to post in a subreddit
 * These are checked by AutoModerator and Reddit's spam filters
 */
export interface PostRequirements {
  /** Regular expressions that titles must match */
  title_regexes: string[];
  /** Regular expressions that post bodies must match */
  body_regexes: string[];
  /** Strings that are not allowed in titles */
  title_blacklisted_strings: string[];
  /** Strings that are not allowed in post bodies */
  body_blacklisted_strings: string[];
  /** Strings that must appear in titles */
  title_required_strings: string[];
  /** Strings that must appear in post bodies */
  body_required_strings: string[];
  /** Whether posts must have a flair assigned */
  is_flair_required: boolean;
  /** Domains that are not allowed to be posted */
  domain_blacklist: string[];
  /** If set, only these domains are allowed to be posted */
  domain_whitelist: string[];
  /** Minimum combined karma (link + comment) required to post */
  min_combined_karma: number;
  /** Minimum account age in days required to post */
  account_age_min_days: number;
}

/**
 * User preferences as returned by Reddit's /api/v1/me/prefs endpoint
 */
export interface UserPreferences {
  /** Whether to receive notifications */
  enable_notifications: boolean;
  /** Whether to view NSFW content */
  show_nsfw: boolean;
  /** Default sort method for comments */
  default_comment_sort: "best" | "top" | "new" | "controversial" | "old" | "qa";
  /** UI theme preference */
  theme: "light" | "dark" | "auto";
  /** Interface language code */
  language: string;
}

/**
 * Information about a Reddit user
 * Matches Reddit's GET /user/{username}/about endpoint
 */
export interface UserInfo {
  /**
   * User's unique ID
   * Format: t2_{base36_id}
   */
  id: string;
  /** Username */
  name: string;
  /** Unix timestamp when the account was created */
  created_utc: number;
  /** Karma earned from comments */
  comment_karma: number;
  /** Karma earned from posts */
  link_karma: number;
  /** Whether the user has Reddit Premium */
  is_gold: boolean;
  /** Whether the user is a moderator of any subreddit */
  is_mod: boolean;
  /** Whether the user's email is verified */
  has_verified_email: boolean;
  /** User's preference settings */
  preferences: UserPreferences;
}

/**
 * Parameters for filtering Reddit search results
 * Used in Reddit's /search endpoint
 */
export interface SearchFilters {
  /** Time period to restrict results to */
  time?: "hour" | "day" | "week" | "month" | "year" | "all";
  /** How to sort the results */
  sort?: "relevance" | "hot" | "top" | "new" | "comments";
  /** Type of content to return */
  type?: "link" | "self" | "image" | "video";
  /** Whether to search only within a specific subreddit */
  restrict_sr?: boolean;
  /** Whether to include NSFW results */
  include_over_18?: boolean;
  /** Maximum number of results to return */
  limit?: number;
}

/**
 * Represents a post in search results
 * Subset of Reddit's Link object type
 */
export interface PostSearchResult {
  /**
   * Post's unique ID
   * Should include t3_ prefix for API calls
   */
  id: string;
  /** Post title */
  title: string;
  /** Username of post author */
  author: string;
  /** Subreddit the post is in */
  subreddit: string;
  /** Unix timestamp when post was created */
  created_utc: number;
  /** Net upvotes (upvotes - downvotes) */
  score: number;
  /** Number of comments on the post */
  num_comments: number;
  /** Relative URL path to the post */
  permalink: string;
  /** URL that the post links to (or post URL for self posts) */
  url: string;
  /** Whether this is a text/self post */
  is_self: boolean;
  /** Whether this is a video post */
  is_video: boolean;
  /** URL to the post's thumbnail image */
  thumbnail?: string;
  /** Text content for self posts */
  selftext?: string;
  /** Post's flair information */
  flair?: {
    text: string;
    background_color: string;
    text_color: string;
  };
}

/**
 * Represents a user in search results
 * Subset of Reddit's Account object type
 */
export interface UserSearchResult {
  /**
   * User's unique ID
   * Should include t2_ prefix for API calls
   */
  id: string;
  /** Username */
  name: string;
  /** Unix timestamp when account was created */
  created_utc: number;
  /** Karma earned from comments */
  comment_karma: number;
  /** Karma earned from posts */
  link_karma: number;
  /** Whether user has Reddit Premium */
  is_gold: boolean;
  /** Whether user moderates any subreddits */
  is_mod: boolean;
  /** Whether user's email is verified */
  verified: boolean;
  /** URL to user's profile image */
  profile_img?: string;
  /** User's profile description */
  description?: string;
}

/**
 * Represents a subreddit in search results
 * Subset of Reddit's Subreddit object type
 */
export interface SubredditSearchResult {
  /**
   * Subreddit's unique ID
   * Should include t5_ prefix for API calls
   */
  id: string;
  /**
   * Internal name with prefix
   * Format: t5_{base36_id}
   */
  name: string;
  /** Subreddit name as shown in URLs */
  display_name: string;
  /** Full title shown in subreddit header */
  title: string;
  /** Sidebar text/description */
  description: string;
  /** Number of subscribers */
  subscribers: number;
  /** Unix timestamp when subreddit was created */
  created_utc: number;
  /** Whether subreddit is marked as NSFW */
  over18: boolean;
  /** Whether current user is subscribed */
  user_is_subscriber: boolean;
  /** URL to subreddit's icon */
  icon_img?: string;
  /** URL to subreddit's banner image */
  banner_img?: string;
  /** Subreddit's theme color */
  primary_color?: string;
  /** Number of users currently viewing the subreddit */
  active_user_count?: number;
}

/**
 * Container for Reddit search results
 * Can include posts, subreddits, and users
 */
export interface SearchResults {
  /** The search query that was performed */
  query: string;
  /** The filters that were applied */
  filters: SearchFilters;
  /** Post search results */
  posts?: {
    results: PostSearchResult[];
    total_count: number;
    next_page_token?: string;
  };
  /** Subreddit search results */
  subreddits?: {
    results: SubredditSearchResult[];
    total_count: number;
    next_page_token?: string;
  };
  /** User search results */
  users?: {
    results: UserSearchResult[];
    total_count: number;
    next_page_token?: string;
  };
}

/**
 * Top-level configuration data structure
 * Contains the main data needed for the Reddit client
 */
export interface RedditConfigData {
  /** User's notifications (excluding private messages) */
  notifications: RedditNotification[];
  /** User's private messages */
  messages: RedditMessage[];
  /** List of subreddits the user is subscribed to */
  subscribedSubreddits: SubredditInfo[];
  /** Information about the current user */
  user: UserInfo;
}

// Mock data for testing and development
export const mockRedditConfig: RedditConfigData = {
  notifications: [
    {
      id: "t4_notif123",
      type: "comment_reply",
      created_utc: 1647532800,
      subreddit: "programming",
      subject: "Thanks for your helpful comment!",
      body: "Thanks for your helpful comment!",
      author: "user123",
      parent_id: "t1_abc123",
      permalink: "/r/programming/comments/xyz789/t1_abc123",
      unread: true,
    },
  ],
  messages: [
    {
      id: "t4_msg456",
      type: "message",
      subject: "Welcome to r/typescript!",
      parent_id: "t4_msg456",
      author: "typescript_bot",
      body: "Welcome to our community! Please read the rules...",
      created_utc: 1647529200,
      unread: false,
    },
  ],
  subscribedSubreddits: [
    {
      id: "xyz789",
      name: "t5_2fwo",
      display_name: "programming",
      title: "Programming",
      description: "Computer Programming",
      subscribers: 3500000,
      created_utc: 1201832000,
      url: "/r/programming/",
      over18: false,
      icon_img: "https://styles.redditmedia.com/t5_2fwo/styles/communityIcon_1bqa1ibfp8q11.png",
      user_is_subscriber: true,
      user_is_moderator: false,
      rules: [
        {
          kind: "link",
          description: "Please keep submissions on topic and of high quality",
          short_name: "On Topic & Quality",
          violation_reason: "Off-topic or low quality",
          created_utc: 1201832000,
          priority: 1,
        },
      ],
      post_requirements: {
        title_regexes: [],
        body_regexes: [],
        title_blacklisted_strings: [],
        body_blacklisted_strings: [],
        title_required_strings: [],
        body_required_strings: [],
        is_flair_required: true,
        domain_blacklist: [],
        domain_whitelist: [],
        min_combined_karma: 10,
        account_age_min_days: 30,
      },
    },
  ],
  user: {
    id: "t2_user123",
    name: "example_user",
    created_utc: 1546300800,
    comment_karma: 1500,
    link_karma: 1000,
    is_gold: false,
    is_mod: false,
    has_verified_email: true,
    preferences: {
      enable_notifications: true,
      show_nsfw: false,
      default_comment_sort: "best",
      theme: "dark",
      language: "en",
    },
  },
};
