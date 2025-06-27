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

export const MCP_BASE_URL = process.env.MCP_BASE_URL || `http://127.0.0.1:${process.env.PORT || '3000'}`;
export const ACCESS_TOKEN = process.env.MCP_ACCESS_TOKEN;

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
export async function createMCPClient(): Promise<Client> {
  if (!ACCESS_TOKEN) {
    throw new Error('Missing MCP_ACCESS_TOKEN in environment');
  }
  
  log.debug(`Connecting to MCP server at ${MCP_BASE_URL}`);
  
  const transport = new StreamableHTTPClientTransport(
    new URL('/mcp', MCP_BASE_URL),
    {
      requestInit: {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
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
        resources: {},
        tools: {},
        sampling: {}
      }
    }
  );
  
  // Add timeout for connection
  const connectPromise = client.connect(transport);
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Connection timeout after 10s')), 10000)
  );
  
  await Promise.race([connectPromise, timeoutPromise]);
  log.debug('Successfully connected to MCP server');
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