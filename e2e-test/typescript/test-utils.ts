/**
 * @file Test Utilities
 * @module test-utils
 * 
 * @remarks
 * Shared utilities for MCP test suite
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { config } from 'dotenv';

// Load environment configuration
config({ path: '.env' });

// Check for tunnel URL in multiple places
function getMCPBaseUrl(): string {
  // 1. Check for explicit MCP_BASE_URL
  if (process.env.MCP_BASE_URL) {
    return process.env.MCP_BASE_URL;
  }
  
  // 2. Check if we're in tunnel mode
  if (process.env.TUNNEL_MODE === 'true' || process.env.TUNNEL_ENABLED === 'true') {
    // Try to read tunnel URL from file
    try {
      const fs = require('fs');
      const path = require('path');
      const tunnelFile = path.join(__dirname, '../../../.tunnel-url');
      if (fs.existsSync(tunnelFile)) {
        const tunnelUrl = fs.readFileSync(tunnelFile, 'utf8').trim();
        console.log(`Using tunnel URL from file: ${tunnelUrl}`);
        return tunnelUrl;
      }
    } catch (e) {
      console.warn('Failed to read tunnel URL file:', e);
    }
    
    // Check environment variable
    if (process.env.TUNNEL_URL) {
      console.log(`Using tunnel URL from env: ${process.env.TUNNEL_URL}`);
      return process.env.TUNNEL_URL;
    }
    
    console.warn('Tunnel mode enabled but no tunnel URL found');
  }
  
  // 3. Default to local URL
  return `http://127.0.0.1:${process.env.PORT || '3000'}`;
}

export const MCP_BASE_URL = getMCPBaseUrl();

/**
 * Colored console output utilities
 */
export const log = {
  section: (title: string) => console.log(`\n\x1b[1m\x1b[34m${title}\x1b[0m`),
  success: (msg: string) => console.log(`\x1b[32m✅\x1b[0m ${msg}`),
  warning: (msg: string) => console.log(`\x1b[33m⚠️\x1b[0m ${msg}`),
  error: (msg: string) => console.log(`\x1b[31m❌\x1b[0m ${msg}`),
  info: (msg: string) => console.log(`\x1b[34mℹ\x1b[0m ${msg}`),
  debug: (msg: string) => console.log(`\x1b[36m  🔍\x1b[0m ${msg}`)
};

/**
 * Test result tracking
 */
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

export class TestTracker {
  private results: TestResult[] = [];
  
  add(result: TestResult): void {
    this.results.push(result);
  }
  
  getSummary(): { total: number; passed: number; failed: number } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    return { total, passed, failed };
  }
  
  printSummary(): void {
    const { total, passed, failed } = this.getSummary();
    log.section(`Test Summary: ${passed}/${total} passed`);
    
    if (failed > 0) {
      log.error(`${failed} tests failed:`);
      this.results
        .filter(r => !r.passed)
        .forEach(r => log.error(`  - ${r.name}: ${r.error || 'Unknown error'}`));
    } else {
      log.success('All tests passed!');
    }
  }
}

/**
 * Create and connect MCP client
 */
export async function createMCPClient(enableNotifications = false): Promise<Client> {
  const isRemote = MCP_BASE_URL.startsWith('https://');
  
  if (isRemote) {
    log.info(`🌍 Connecting to REMOTE MCP server at ${MCP_BASE_URL}`);
  } else {
    log.debug(`Connecting to local MCP server at ${MCP_BASE_URL}`);
  }
  
  const transport = new StreamableHTTPClientTransport(
    new URL('/mcp', MCP_BASE_URL),
    {
      requestInit: {
        headers: {
          'Accept': 'application/json, text/event-stream',
          'Content-Type': 'application/json'
        }
      }
    }
  );
  
  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0'
    },
    {
      capabilities: {
        prompts: {},
        resources: {
          subscribe: enableNotifications,
          listChanged: enableNotifications
        },
        tools: {},
        // sampling: {} // Removed sampling
      }
    }
  );
  
  // Add timeout for connection
  const connectPromise = client.connect(transport);
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Connection timeout after 10s')), 10000)
  );
  
  await Promise.race([connectPromise, timeoutPromise]);
  
  if (isRemote) {
    log.success('✨ Successfully connected to REMOTE MCP server');
  } else {
    log.debug('Successfully connected to local MCP server');
  }
  
  return client;
}

/**
 * Run a test with error handling
 */
export async function runTest(
  name: string,
  testFn: () => Promise<void>,
  tracker: TestTracker
): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    log.success(`${name} (${duration}ms)`);
    tracker.add({ name, passed: true, duration });
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error(`${name} failed: ${errorMsg}`);
    tracker.add({ name, passed: false, error: errorMsg, duration });
  }
}

/**
 * Validate JSON Schema
 */
export function validateSchema(data: any, expectedSchema: any): void {
  // Basic schema validation - in production you might use ajv
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data: expected object');
  }
  
  if (expectedSchema.required) {
    for (const field of expectedSchema.required) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }
}