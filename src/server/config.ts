/**
 * @file Server configuration management
 * @module server/config
 *
 * @remarks
 * This module manages all server configuration including environment variables,
 * OAuth settings, and validation. It provides a centralized configuration
 * object that is used throughout the application.
 *
 * Required environment variables:
 * - REDDIT_CLIENT_ID: OAuth2 client ID from Reddit app
 * - REDDIT_CLIENT_SECRET: OAuth2 client secret
 * - JWT_SECRET: Secret key for signing JWT tokens
 *
 * Optional environment variables:
 * - OAUTH_ISSUER: Base URL for OAuth endpoints
 * - REDIRECT_URL: OAuth callback URL
 * - PORT: Server port (default: 3000)
 * - REDDIT_USER_AGENT: User agent for Reddit API
 * - REDDIT_USERNAME: Default Reddit username
 */

import dotenv from "dotenv";
dotenv.config();

/**
 * Server configuration interface
 *
 * @remarks
 * Defines all configuration values required by the server.
 * These values are typically loaded from environment variables.
 */
export interface ServerConfig {
  /** Reddit OAuth2 client ID */
  REDDIT_CLIENT_ID: string;
  /** Reddit OAuth2 client secret */
  REDDIT_CLIENT_SECRET: string;
  /** Secret key for JWT token signing */
  JWT_SECRET: string;
  /** Base URL for OAuth issuer (production or localhost) */
  OAUTH_ISSUER: string;
  /** OAuth callback redirect URL */
  REDIRECT_URL: string;
  /** Server port number */
  PORT: string;
  /** User agent string for Reddit API requests */
  REDDIT_USER_AGENT: string;
  /** Default Reddit username */
  REDDIT_USERNAME: string;
}

/**
 * Server configuration object
 *
 * @remarks
 * This object is populated from environment variables with sensible defaults.
 * In production, OAUTH_ISSUER defaults to the Smithery server URL.
 * In development, it defaults to localhost:3000.
 */
export const CONFIG: ServerConfig = {
  REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID!,
  REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET!,
  JWT_SECRET: process.env.JWT_SECRET!,
  OAUTH_ISSUER:
    process.env.OAUTH_ISSUER ||
    (process.env.NODE_ENV === "production"
      ? "https://systemprompt-mcp-reddit.example.com"
      : `http://localhost:${process.env.PORT || "3000"}`),
  REDIRECT_URL:
    process.env.REDIRECT_URL ||
    `${process.env.OAUTH_ISSUER || `http://localhost:${process.env.PORT || "3000"}`}/oauth/reddit/callback`,
  PORT: process.env.PORT || "3000",
  /**
   * Reddit API User-Agent string identifying your application
   * @remarks
   * Reddit requires a specific format: <platform>:<app_id>:<version> (by /u/<developer_username>)
   * This identifies your APPLICATION to Reddit's servers for rate limiting and compliance.
   * The username should be the developer's Reddit account, not end users.
   * @example 'linux:my-reddit-app:v1.0.0 (by /u/my_developer_account)'
   * @see {@link https://github.com/reddit-archive/reddit/wiki/API} Reddit API Rules
   */
  REDDIT_USER_AGENT: process.env.REDDIT_USER_AGENT || "linux:systemprompt-mcp-reddit:v2.0.0",
  /**
   * Reddit username of the developer who registered the OAuth app
   * @remarks
   * This is YOUR (the developer's) Reddit username, used to construct the User-Agent.
   * It should match the account that created the Reddit OAuth app.
   * Do NOT use end user usernames here - those come from OAuth tokens.
   * @example 'my_developer_account' (without the /u/ prefix)
   */
  REDDIT_USERNAME: process.env.REDDIT_USERNAME || "reddit-user",
} as const;

/**
 * Validates that all required environment variables are present
 * @throws {Error} Thrown if any required environment variable is missing
 * @internal
 */
const requiredEnvVars: (keyof ServerConfig)[] = [
  "REDDIT_CLIENT_ID",
  "REDDIT_CLIENT_SECRET",
  "JWT_SECRET",
];
for (const envVar of requiredEnvVars) {
  if (!CONFIG[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

/**
 * List of valid OAuth redirect URIs
 *
 * @remarks
 * These URIs are whitelisted for OAuth callbacks to prevent redirect attacks.
 * The list includes:
 * - SystemPrompt protocol handler for desktop apps
 * - Production SystemPrompt.io callback
 * - Smithery server callback
 * - Local development callbacks
 * - Configured redirect URL from environment
 *
 * Any OAuth callback must match one of these URIs exactly.
 */
export const VALID_REDIRECT_URIS = [
  `http://localhost:${CONFIG.PORT}/oauth/reddit/callback`,
  "http://localhost:5173/oauth/reddit/callback",
  "http://localhost:6274/oauth/callback/debug",
  `${CONFIG.OAUTH_ISSUER}/oauth/reddit/callback`,
  CONFIG.REDIRECT_URL,
];
