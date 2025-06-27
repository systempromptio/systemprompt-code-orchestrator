import express from "express";
import { randomBytes, createHash } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import type { ServerConfig } from "./config.js";

export interface OAuthConfig extends ServerConfig {
  validRedirectUris: string[];
}

export interface AuthenticatedRequest extends express.Request {
  auth?: AuthInfo;
}

// interface RegisteredClient {
//   clientId: string;
//   redirectUris: string[];
//   grantTypes: string[];
//   responseTypes: string[];
//   applicationtype: string;
// }

interface PendingAuthorization {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
  scope: string;
  redditState: string;
}

interface AuthorizationCode {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  userId: string;
  redditTokens: { accessToken: string; refreshToken: string };
  expiresAt: number;
}

interface RefreshTokenData {
  userId: string;
  clientId: string;
  redditTokens: { accessToken: string; refreshToken: string };
  expiresAt: number;
}

/**
 * OAuth 2.1 Provider for MCP Reddit Server
 *
 * @remarks
 * Implements the complete MCP OAuth 2.1 flow with PKCE
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
 *
 * This provider handles:
 * - Step 1: Initial 401 response with WWW-Authenticate
 * - Step 2: Resource metadata discovery
 * - Step 3: Authorization server metadata
 * - Step 4: Dynamic client registration
 * - Step 5: Authorization with PKCE
 * - Step 6: Reddit OAuth callback
 * - Step 7: Token exchange
 * - Step 8: Authenticated requests
 *
 * Security features:
 * - PKCE (RFC 7636) for authorization code flow
 * - JWT tokens with Reddit credentials
 * - Secure state parameter validation
 * - Time-limited authorization codes
 */
export class OAuthProvider {
  private readonly jwtSecret: Uint8Array;
  private readonly config: OAuthConfig;
  private readonly pendingAuthorizations = new Map<string, PendingAuthorization>();
  private readonly authorizationCodes = new Map<string, AuthorizationCode>();
  private readonly refreshTokens = new Map<string, RefreshTokenData>();

  private readonly AUTHORIZATION_CODE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  private readonly REFRESH_TOKEN_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor(config: OAuthConfig) {
    this.config = config;
    this.jwtSecret = new TextEncoder().encode(config.JWT_SECRET);
  }

  /**
   * Verifies JWT access token and extracts Reddit credentials
   *
   * @remarks
   * MCP OAuth Step 8: Authenticated MCP Request
   * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#authenticated-requests
   *
   * Validates JWT signature and expiration.
   * Extracts Reddit access/refresh tokens for API calls.
   *
   * @param token - JWT access token from Authorization header
   * @param req - Express request object (optional)
   * @returns AuthInfo with user details and Reddit tokens
   */
  async verifyAccessToken(token: string, _req?: express.Request): Promise<AuthInfo> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret, {
        audience: "reddit-mcp-server",
        issuer: this.config.OAUTH_ISSUER,
      });

      return {
        token: token,
        clientId: "mcp-client",
        scopes: ["read"],
        expiresAt: payload.exp,
        extra: {
          userId: payload.sub,
          redditAccessToken: payload.reddit_access_token,
          redditRefreshToken: payload.reddit_refresh_token,
        },
      };
    } catch (error) {
      // Auto-refresh logic would go here
      throw new Error("Invalid or expired access token");
    }
  }

  /**
   * Express middleware for OAuth authentication
   *
   * @remarks
   * MCP OAuth Step 1: Initial Request (401 Unauthorized)
   * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#initial-request
   *
   * This middleware checks for Bearer token authorization.
   * If no token is present, returns 401 with WWW-Authenticate header
   * pointing to resource metadata endpoint.
   *
   * @returns Express middleware function
   */
  authMiddleware() {
    return async (
      req: AuthenticatedRequest,
      res: express.Response,
      next: express.NextFunction,
    ): Promise<void> => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        // For SSE requests (GET), provide proper SSE error response
        if (req.method === "GET" && req.headers.accept?.includes("text/event-stream")) {
          res.writeHead(401, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });
          res.write("event: error\n");
          res.write(
            'data: {"error": "unauthorized", "error_description": "Authorization required"}\n\n',
          );
          res.end();
          return;
        }

        const baseUrl = `https://${req.get("host")}`;
        res
          .status(401)
          .header(
            "WWW-Authenticate",
            `Bearer realm="MCP", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
          )
          .json({
            error: "unauthorized",
            error_description: "Authorization required. Use OAuth 2.1 flow.",
          });
        return;
      }

      const token = authHeader.slice(7);

      try {
        req.auth = await this.verifyAccessToken(token, req);
        next();
      } catch (error) {
        // For SSE requests (GET), provide proper SSE error response
        if (req.method === "GET" && req.headers.accept?.includes("text/event-stream")) {
          res.writeHead(401, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });
          res.write("event: error\n");
          res.write(
            'data: {"error": "invalid_token", "error_description": "Invalid or expired access token"}\n\n',
          );
          res.end();
          return;
        }

        res.status(401).json({
          error: "invalid_token",
          error_description: "Invalid or expired access token",
        });
      }
    };
  }

  setupRoutes(app: express.Application): void {
    /**
     * OAuth 2.0 Authorization Server Metadata
     *
     * @remarks
     * MCP OAuth Step 3: Authorization Server Metadata
     * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#authorization-server-metadata
     *
     * Returns metadata about the authorization server including
     * available endpoints, supported flows, and capabilities.
     */
    app.get("/.well-known/oauth-authorization-server", (_req, res) => {
      res.json({
        issuer: this.config.OAUTH_ISSUER,
        authorization_endpoint: `${this.config.OAUTH_ISSUER}/oauth/authorize`,
        token_endpoint: `${this.config.OAUTH_ISSUER}/oauth/token`,
        registration_endpoint: `${this.config.OAUTH_ISSUER}/oauth/register`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        scopes_supported: ["read", "write"],
        token_endpoint_auth_methods_supported: ["none"],
        subject_types_supported: ["public"],
      });
    });

    /**
     * OAuth 2.0 Protected Resource Metadata
     *
     * @remarks
     * MCP OAuth Step 2: Resource Metadata Discovery
     * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#metadata-discovery
     *
     * Returns metadata about the protected resource and its
     * authorization servers. Client discovers this URL from
     * WWW-Authenticate header in 401 response.
     */
    app.get("/.well-known/oauth-protected-resource", (_req, res) => {
      res.json({
        resource: this.config.OAUTH_ISSUER,
        authorization_servers: [this.config.OAUTH_ISSUER],
        bearer_methods_supported: ["header"],
      });
    });

    /**
     * Dynamic Client Registration Endpoint
     *
     * @remarks
     * MCP OAuth Step 4: Dynamic Client Registration (Optional)
     * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#client-registration
     *
     * Allows clients to dynamically register with the authorization
     * server. For public clients (like desktop apps), no client
     * secret is required - security comes from PKCE.
     */
    app.post("/oauth/register", express.json(), (req, res) => {
      const { redirect_uris } = req.body;

      // Validate redirect URIs if provided
      let validatedRedirectUris = this.config.validRedirectUris;

      if (redirect_uris && Array.isArray(redirect_uris)) {
        validatedRedirectUris = [];
        for (const uri of redirect_uris) {
          if (typeof uri !== "string") {
            res.status(400).json({
              error: "invalid_redirect_uri",
              error_description: "redirect_uris must be an array of strings",
            });
            return;
          }

          // Validate using same security rules as authorization endpoint
          try {
            const url = new URL(uri);

            // Allow HTTPS URLs
            if (url.protocol === "https:") {
              validatedRedirectUris.push(uri);
            }
            // Allow HTTP only for localhost
            else if (
              url.protocol === "http:" &&
              (url.hostname === "localhost" || url.hostname === "127.0.0.1")
            ) {
              validatedRedirectUris.push(uri);
            }
            // Allow custom schemes
            else if (url.protocol.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:$/)) {
              validatedRedirectUris.push(uri);
            } else {
              res.status(400).json({
                error: "invalid_redirect_uri",
                error_description: `Invalid redirect URI: ${uri}. Must use HTTPS, localhost HTTP, or custom scheme`,
              });
              return;
            }
          } catch (error) {
            res.status(400).json({
              error: "invalid_redirect_uri",
              error_description: `Invalid redirect URI format: ${uri}`,
            });
            return;
          }
        }
      }

      // For public clients, we use a fixed client ID since no authentication is required
      // The security comes from PKCE (code challenge/verifier) at authorization time
      res.json({
        client_id: "mcp-public-client",
        redirect_uris: validatedRedirectUris,
        grant_types: ["authorization_code"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        application_type: "native",
      });
    });

    /**
     * OAuth 2.1 Authorization Endpoint
     *
     * @remarks
     * MCP OAuth Step 5: Authorization Request with PKCE
     * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#authorization-request
     *
     * Handles authorization requests with PKCE parameters.
     * Validates request, stores pending authorization, and
     * redirects to Reddit OAuth for user consent.
     */
    app.get("/oauth/authorize", (req, res) => {
      const {
        client_id,
        redirect_uri,
        response_type,
        code_challenge,
        code_challenge_method,
        state,
        scope = "read",
      } = req.query;

      // Validate parameters
      if (!client_id || !redirect_uri || !code_challenge) {
        res.status(400).json({
          error: "invalid_request",
          error_description: "Missing required parameters",
        });
        return;
      }

      if (response_type !== "code") {
        res.status(400).json({
          error: "unsupported_response_type",
          error_description: "Only authorization code flow is supported",
        });
        return;
      }

      if (code_challenge_method !== "S256") {
        res.status(400).json({
          error: "invalid_request",
          error_description: "Only S256 code challenge method is supported",
        });
        return;
      }

      // Validate redirect URI using security rules (for public clients)
      try {
        const url = new URL(redirect_uri as string);

        // Allow HTTPS URLs
        if (url.protocol === "https:") {
          // HTTPS is always allowed
        }
        // Allow HTTP only for localhost
        else if (
          url.protocol === "http:" &&
          (url.hostname === "localhost" || url.hostname === "127.0.0.1")
        ) {
          // Localhost HTTP is allowed
        }
        // Allow custom schemes (like systemprompt://)
        else if (url.protocol.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:$/)) {
          // Custom schemes are allowed
        } else {
          throw new Error("Invalid protocol");
        }
      } catch (error) {
        res.status(400).json({
          error: "invalid_request",
          error_description:
            "Invalid redirect URI: must use HTTPS, localhost HTTP, or custom scheme",
        });
        return;
      }

      // Generate Reddit OAuth state and store pending authorization
      const redditState = randomBytes(32).toString("hex");
      const authKey = randomBytes(32).toString("hex");

      this.pendingAuthorizations.set(authKey, {
        clientId: client_id as string,
        redirectUri: redirect_uri as string,
        codeChallenge: code_challenge as string,
        codeChallengeMethod: code_challenge_method as string,
        state: state as string,
        scope: scope as string,
        redditState,
      });

      // Clean up expired authorizations
      setTimeout(
        () => this.pendingAuthorizations.delete(authKey),
        this.AUTHORIZATION_CODE_TIMEOUT_MS,
      );

      // Redirect to Reddit OAuth
      const redditOAuthUrl = new URL("https://www.reddit.com/api/v1/authorize");
      redditOAuthUrl.searchParams.set("client_id", this.config.REDDIT_CLIENT_ID);
      redditOAuthUrl.searchParams.set("response_type", "code");
      redditOAuthUrl.searchParams.set("state", `${authKey}:${redditState}`);
      redditOAuthUrl.searchParams.set("redirect_uri", this.config.REDIRECT_URL);
      redditOAuthUrl.searchParams.set("duration", "permanent");
      redditOAuthUrl.searchParams.set("scope", "identity read submit privatemessages");

      res.redirect(redditOAuthUrl.toString());
    });

    /**
     * OAuth 2.1 Token Endpoint
     *
     * @remarks
     * MCP OAuth Step 7: Token Exchange with PKCE Verification
     * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#token-exchange
     *
     * Exchanges authorization code for access token.
     * Verifies PKCE code_verifier matches the original challenge.
     * Returns JWT containing Reddit tokens for API access.
     */
    app.post("/oauth/token", async (req, res) => {
      const { grant_type, code, redirect_uri, code_verifier, client_id, refresh_token } = req.body;

      try {
        if (grant_type === "authorization_code") {
          // Handle authorization code exchange
          if (!code || !redirect_uri || !code_verifier || !client_id) {
            res.status(400).json({
              error: "invalid_request",
              error_description: "Missing required parameters",
            });
            return;
          }

          const authCode = this.authorizationCodes.get(code);
          if (!authCode || authCode.expiresAt < Date.now()) {
            this.authorizationCodes.delete(code);
            res.status(400).json({
              error: "invalid_grant",
              error_description: "Invalid or expired authorization code",
            });
            return;
          }

          // Verify PKCE
          const challengeFromVerifier = this.generateCodeChallenge(code_verifier);
          if (challengeFromVerifier !== authCode.codeChallenge) {
            res.status(400).json({
              error: "invalid_grant",
              error_description: "Invalid code verifier",
            });
            return;
          }

          // Generate tokens
          const refreshTokenId = randomBytes(32).toString("hex");
          const accessToken = await this.createAccessToken(authCode.userId, authCode.redditTokens);

          this.refreshTokens.set(refreshTokenId, {
            userId: authCode.userId,
            clientId: authCode.clientId,
            redditTokens: authCode.redditTokens,
            expiresAt: Date.now() + this.REFRESH_TOKEN_TIMEOUT_MS,
          });

          this.authorizationCodes.delete(code);

          res.json({
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: 86400, // 24 hours to match Reddit token expiry
            refresh_token: refreshTokenId,
            scope: "read",
          });
          return;
        } else if (grant_type === "refresh_token") {
          // Handle refresh token
          if (!refresh_token) {
            res.status(400).json({
              error: "invalid_request",
              error_description: "Missing refresh token",
            });
            return;
          }

          const tokenData = this.refreshTokens.get(refresh_token);
          if (!tokenData || tokenData.expiresAt < Date.now()) {
            this.refreshTokens.delete(refresh_token);
            res.status(400).json({
              error: "invalid_grant",
              error_description: "Invalid or expired refresh token",
            });
            return;
          }

          // TODO: Refresh Reddit tokens if needed
          const accessToken = await this.createAccessToken(
            tokenData.userId,
            tokenData.redditTokens,
          );

          res.json({
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: 86400, // 24 hours to match Reddit token expiry
            scope: "read",
          });
          return;
        } else {
          res.status(400).json({
            error: "unsupported_grant_type",
            error_description:
              "Only authorization_code and refresh_token grant types are supported",
          });
          return;
        }
      } catch (error) {
        console.error("Token endpoint error:", error);
        res.status(500).json({
          error: "server_error",
          error_description: "Internal server error",
        });
        return;
      }
    });

    /**
     * Reddit OAuth Callback Handler
     *
     * @remarks
     * MCP OAuth Step 6: Reddit OAuth Callback
     * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#callback
     *
     * Receives callback from Reddit after user authorization.
     * Exchanges Reddit code for tokens, generates MCP authorization
     * code, and redirects back to client with code.
     */
    app.get("/oauth/reddit/callback", async (req, res) => {
      const { code, state, error } = req.query;

      if (error) {
        res.status(400).json({
          error: "access_denied",
          error_description: "User denied authorization",
        });
        return;
      }

      if (!code || !state) {
        res.status(400).json({
          error: "invalid_request",
          error_description: "Missing code or state parameter",
        });
        return;
      }

      try {
        // Parse state to get auth key and Reddit state
        const [authKey, redditState] = (state as string).split(":");
        const pendingAuth = this.pendingAuthorizations.get(authKey);

        if (!pendingAuth || pendingAuth.redditState !== redditState) {
          res.status(400).json({
            error: "invalid_request",
            error_description: "Invalid state parameter",
          });
          return;
        }

        // Exchange Reddit code for tokens
        const redditTokens = await this.exchangeRedditCode(
          code as string,
          this.config.REDIRECT_URL,
        );

        // Get user info from Reddit
        const userResponse = await fetch("https://oauth.reddit.com/api/v1/me", {
          headers: {
            Authorization: `Bearer ${redditTokens.access_token}`,
            "User-Agent": this.config.REDDIT_USER_AGENT,
          },
        });

        if (!userResponse.ok) {
          throw new Error("Failed to get user info from Reddit");
        }

        const userInfo = (await userResponse.json()) as { name: string };
        const userId = userInfo.name;

        // Generate authorization code
        const authorizationCode = randomBytes(32).toString("hex");
        this.authorizationCodes.set(authorizationCode, {
          clientId: pendingAuth.clientId,
          redirectUri: pendingAuth.redirectUri,
          codeChallenge: pendingAuth.codeChallenge,
          userId,
          redditTokens: {
            accessToken: redditTokens.access_token,
            refreshToken: redditTokens.refresh_token,
          },
          expiresAt: Date.now() + this.AUTHORIZATION_CODE_TIMEOUT_MS,
        });

        // Clean up
        this.pendingAuthorizations.delete(authKey);

        // Redirect back to client with authorization code
        const redirectUrl = new URL(pendingAuth.redirectUri);
        redirectUrl.searchParams.set("code", authorizationCode);
        redirectUrl.searchParams.set("state", pendingAuth.state);

        res.redirect(redirectUrl.toString());
      } catch (error) {
        console.error("OAuth callback error:", error);
        res.status(500).json({
          error: "server_error",
          error_description: "Internal server error during authorization",
        });
      }
    });
  }

  /**
   * Creates JWT access token containing Reddit credentials
   *
   * @remarks
   * Part of MCP OAuth Step 7: Token Exchange
   * JWT contains Reddit tokens for making API calls
   *
   * @param userId - Reddit username
   * @param redditTokens - Reddit access and refresh tokens
   * @returns Signed JWT token for MCP authentication
   */
  private async createAccessToken(
    userId: string,
    redditTokens: { accessToken: string; refreshToken: string },
  ): Promise<string> {
    return await new SignJWT({
      sub: userId,
      reddit_access_token: redditTokens.accessToken,
      reddit_refresh_token: redditTokens.refreshToken,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h") // 24 hours to match Reddit token expiry
      .setAudience("reddit-mcp-server")
      .setIssuer(this.config.OAUTH_ISSUER)
      .sign(this.jwtSecret);
  }

  /**
   * Generates PKCE code challenge from verifier
   *
   * @remarks
   * Part of MCP OAuth Step 5: Authorization Request with PKCE
   * Uses SHA256 hashing as required by S256 method
   *
   * @param verifier - Random code verifier string
   * @returns Base64url-encoded SHA256 hash of verifier
   */
  private generateCodeChallenge(verifier: string): string {
    return createHash("sha256").update(verifier).digest("base64url");
  }

  /**
   * Exchanges Reddit authorization code for access tokens
   *
   * @remarks
   * Part of MCP OAuth Step 6: Reddit OAuth Callback
   * Uses Reddit's token endpoint with basic auth
   *
   * @param code - Authorization code from Reddit
   * @param actualCallbackUri - Redirect URI used in initial request
   * @returns Reddit token response with access_token and refresh_token
   */
  private async exchangeRedditCode(code: string, actualCallbackUri: string): Promise<any> {
    const auth = Buffer.from(
      `${this.config.REDDIT_CLIENT_ID}:${this.config.REDDIT_CLIENT_SECRET}`,
    ).toString("base64");

    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": this.config.REDDIT_USER_AGENT,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: actualCallbackUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to exchange Reddit code: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }
}
