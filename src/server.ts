#!/usr/bin/env node
/**
 * @file Main HTTP server for Reddit MCP
 * @module server
 * 
 * @remarks
 * This module provides the Express.js HTTP server that handles:
 * - OAuth 2.1 authentication flows (Steps 1-8 of MCP OAuth spec)
 * - MCP protocol endpoints with authentication
 * - Health checks and metadata endpoints
 * 
 * OAuth Flow Integration:
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
 * 
 * 1. Client requests /mcp without auth → 401 with WWW-Authenticate
 * 2. Client discovers metadata endpoints from WWW-Authenticate
 * 3. Client gets auth server info from /.well-known endpoints
 * 4. Client optionally registers at /oauth/register
 * 5. User authorizes at /oauth/authorize (redirects to Reddit)
 * 6. Reddit calls back to /oauth/reddit/callback
 * 7. Client exchanges code at /oauth/token
 * 8. Client uses JWT token for authenticated /mcp requests
 * 
 * The server can be run standalone or integrated with platforms like Smithery.
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { CONFIG, VALID_REDIRECT_URIS } from './server/config.js';
import { OAuthProvider } from './server/oauth.js';
import { MCPHandler } from './server/mcp.js';
import { setMCPHandlerInstance } from './server/mcp.js';

// Polyfill for jose library
if (typeof globalThis.crypto === 'undefined') {
  // @ts-ignore
  globalThis.crypto = crypto.webcrypto as any;
}

/**
 * Creates and configures the Express application
 * 
 * @remarks
 * Sets up the complete MCP OAuth flow:
 * - OAuthProvider handles Steps 1-7 (auth flow)
 * - MCPHandler handles Step 8 (authenticated requests)
 * 
 * @returns Configured Express application with OAuth endpoints
 */
export async function createApp(): Promise<express.Application> {
  const app = express();
  
  // Initialize OAuth provider for MCP authentication
  const oauthProvider = new OAuthProvider({
    ...CONFIG,
    validRedirectUris: VALID_REDIRECT_URIS,
  });
  
  // Initialize MCP handler for protocol implementation with proper session support
  const mcpHandler = new MCPHandler();
  
  // Set global instance for notifications
  setMCPHandlerInstance(mcpHandler);

  // Configure CORS
  app.use(
    cors({
      origin: true,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept'],
      exposedHeaders: ['mcp-session-id', 'x-session-id'],
    })
  );
  
  app.use(cookieParser());

  // Selective body parsing - skip for MCP streaming endpoints
  app.use((req, res, next) => {
    if (req.path === '/mcp') {
      next(); // Skip body parsing for MCP
    } else {
      express.json()(req, res, (err) => {
        if (err) return next(err);
        express.urlencoded({ extended: true })(req, res, next);
      });
    }
  });

  // Set up routes
  oauthProvider.setupRoutes(app);
  await mcpHandler.setupRoutes(app, oauthProvider.authMiddleware());
  setupUtilityRoutes(app);

  return app;
}

/**
 * Sets up utility routes (health, metadata)
 */
function setupUtilityRoutes(app: express.Application): void {
  // Health check
  app.get('/health', (_, res) => {
    res.json({
      status: 'ok',
      service: 'reddit-mcp-server',
      transport: 'http',
      capabilities: {
        oauth: true,
        mcp: true,
      },
    });
  });

  // Root endpoint with service metadata
  app.get('/', (req, res) => {
    const protocol =
      req.get('x-forwarded-proto') ||
      (req.get('host')?.includes('systemprompt.io') ? 'https' : req.protocol);
    const baseUrl = `${protocol}://${req.get('host')}`;
    const basePath = req.baseUrl || '';
    
    res.json({
      service: 'Reddit MCP Server',
      version: '1.0.0',
      transport: 'http',
      endpoints: {
        oauth: {
          authorize: `${baseUrl}${basePath}/oauth/authorize`,
          token: `${baseUrl}${basePath}/oauth/token`,
          metadata: `${baseUrl}/.well-known/oauth-authorization-server`,
        },
        mcp: `${baseUrl}${basePath}/mcp`,
        health: `${baseUrl}${basePath}/health`,
      },
    });
  });
}

/**
 * Starts the HTTP server
 * 
 * @param port - Port number to listen on
 * @returns Server instance
 */
export async function startServer(port?: number): Promise<ReturnType<express.Application['listen']>> {
  const app = await createApp();
  const serverPort = port || parseInt(CONFIG.PORT, 10);
  
  return app.listen(serverPort, '0.0.0.0', () => {
    console.log(`🚀 Reddit MCP Server running on port ${serverPort}`);
    console.log(`🔐 OAuth authorize: ${CONFIG.OAUTH_ISSUER}/oauth/authorize`);
    console.log(`📡 MCP endpoint: ${CONFIG.OAUTH_ISSUER}/mcp`);
    console.log(`❤️  Health: ${CONFIG.OAUTH_ISSUER}/health`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');  
  process.exit(0);
});