#!/usr/bin/env node
/**
 * @file Main HTTP server for Coding Agent MCP
 * @module server
 * 
 * @remarks
 * This module provides the Express.js HTTP server that handles:
 * - MCP protocol endpoints (no authentication)
 * - Health checks and metadata endpoints
 */

import express from 'express';
import cors from 'cors';
import { CONFIG } from './server/config.js';
import { MCPHandler } from './server/mcp.js';
import { setMCPHandlerInstance } from './server/mcp.js';


/**
 * Creates and configures the Express application
 * 
 * @returns Configured Express application with MCP endpoint
 */
export async function createApp(): Promise<express.Application> {
  const app = express();
  
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
  await mcpHandler.setupRoutes(app);
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
      service: 'coding-agent-mcp-server',
      transport: 'http',
      capabilities: {
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
      service: 'Coding Agent MCP Server',
      version: '1.0.0',
      transport: 'http',
      endpoints: {
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
    console.log(`🚀 Coding Agent MCP Server running on port ${serverPort}`);
    console.log(`📡 MCP endpoint: http://localhost:${serverPort}/mcp`);
    console.log(`❤️  Health: http://localhost:${serverPort}/health`);
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