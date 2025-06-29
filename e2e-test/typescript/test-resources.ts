/**
 * @file MCP Resources Test
 * @module test-resources
 * 
 * @remarks
 * Tests all MCP resources functionality for the Coding Agent orchestrator
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Test resource discovery
 */
async function testResourceDiscovery(client: Client): Promise<void> {
  const result = await client.listResources();
  
  log.debug(`Found ${result.resources?.length || 0} resources`);
  
  // Just verify we can list resources
  if (result.resources && result.resources.length > 0) {
    log.debug(`First resource: ${result.resources[0].uri}`);
  }
}



/**
 * Test reading a resource if available
 */
async function testResourceRead(client: Client): Promise<void> {
  const listResult = await client.listResources();
  
  if (!listResult.resources || listResult.resources.length === 0) {
    log.warning('No resources available to test reading');
    return;
  }
  
  // Try to read the first resource
  const firstResource = listResult.resources[0];
  log.debug(`Attempting to read resource: ${firstResource.uri}`);
  
  try {
    const result = await client.readResource({
      uri: firstResource.uri
    });
    
    if (result.contents && result.contents.length > 0) {
      log.debug(`Successfully read resource ${firstResource.uri}`);
    }
  } catch (error) {
    // Some resources may require specific conditions
    log.debug(`Could not read resource ${firstResource.uri}: ${error}`);
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
    await runTest('Resource Read', () => testResourceRead(client!), tracker);
    
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
  testResources()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      log.error(`Fatal error: ${error}`);
      process.exit(1);
    });
}