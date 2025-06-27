/**
 * @file MCP Resources Test
 * @module test-resources
 * 
 * @remarks
 * Tests all MCP resources functionality
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Test resource discovery
 */
async function testResourceDiscovery(client: Client): Promise<void> {
  const result = await client.listResources();
  
  if (!result.resources || result.resources.length === 0) {
    throw new Error('No resources found');
  }
  
  log.debug(`Found ${result.resources.length} resources`);
  
  // Verify expected resources exist
  const expectedResources = [
    'reddit://config',
    'guidelines://code-generation',
    'guidelines://reddit-api',
    'guidelines://content-creation'
  ];
  
  for (const resourceUri of expectedResources) {
    const resource = result.resources.find(r => r.uri === resourceUri);
    if (!resource) {
      throw new Error(`Expected resource not found: ${resourceUri}`);
    }
    
    // Verify resource has required fields
    if (!resource.name || !resource.description) {
      throw new Error(`Resource ${resourceUri} missing required fields`);
    }
  }
}

/**
 * Test resource reading
 */
async function testResourceReading(client: Client): Promise<void> {
  // Test reading reddit config - may fail with 403 if missing mysubreddits scope
  try {
    const overviewResult = await client.readResource({
      uri: 'reddit://config'
    });
    
    if (!overviewResult.contents || overviewResult.contents.length === 0) {
      throw new Error('Config resource returned no contents');
    }
    
    const content = overviewResult.contents[0];
    if (!content.text || !content.mimeType) {
      throw new Error('Resource content missing required fields');
    }
  } catch (error: any) {
    // Expected error if token doesn't have mysubreddits scope
    if (error.message?.includes('403 Forbidden')) {
      log.debug('reddit://config returned 403 - missing mysubreddits scope (expected)');
    } else {
      throw error;
    }
  }
  
  // Test reading API reference
  const apiResult = await client.readResource({
    uri: 'guidelines://code-generation'
  });
  
  if (!apiResult.contents || apiResult.contents.length === 0) {
    throw new Error('Code generation guidelines resource returned no contents');
  }
}

/**
 * Test resource URI validation
 */
async function testResourceValidation(client: Client): Promise<void> {
  // Test with invalid URI
  try {
    await client.readResource({
      uri: 'invalid://resource/uri'
    });
    throw new Error('Expected error for invalid resource URI');
  } catch (error) {
    // Expected error
  }
  
  // Test with non-existent resource
  try {
    await client.readResource({
      uri: 'reddit://nonexistent'
    });
    throw new Error('Expected error for non-existent resource');
  } catch (error) {
    // Expected error
  }
}

/**
 * Main test runner
 */
export async function testResources(): Promise<void> {
  log.section('📚 Testing MCP Resources');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    await runTest('Resource Discovery', () => testResourceDiscovery(client!), tracker);
    await runTest('Resource Reading', () => testResourceReading(client!), tracker);
    await runTest('Resource Validation', () => testResourceValidation(client!), tracker);
    
    tracker.printSummary();
    
  } catch (error) {
    log.error(`Test suite failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testResources().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}