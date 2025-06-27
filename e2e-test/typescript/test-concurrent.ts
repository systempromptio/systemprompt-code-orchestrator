/**
 * @file MCP Concurrent Operations Test
 * @module test-concurrent
 * 
 * @remarks
 * Tests concurrent MCP operations
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Test concurrent tool calls
 */
async function testConcurrentTools(client: Client): Promise<void> {
  // Execute multiple tool calls concurrently
  const promises = [
    client.callTool({ name: 'validation_example', arguments: { name: 'Test One', age: 25, email: 'test1@example.com', role: 'user' } }),
    client.callTool({ name: 'validation_example', arguments: { name: 'Test Two', age: 30, email: 'test2@example.com', role: 'admin' } }),
    client.callTool({ name: 'structured_data_example', arguments: { dataType: 'user' } }),
    client.callTool({ name: 'structured_data_example', arguments: { dataType: 'product' } }),
    client.callTool({ name: 'search_reddit', arguments: { query: 'typescript', limit: 3 } })
  ];
  
  const results = await Promise.all(promises);
  
  // Verify all results are valid
  for (let i = 0; i < results.length; i++) {
    const content = results[i].content as any[];
    if (!content?.[0]?.text) {
      throw new Error(`Concurrent tool call ${i} returned no content`);
    }
  }
}

/**
 * Test concurrent list operations
 */
async function testConcurrentLists(client: Client): Promise<void> {
  // Execute multiple list operations concurrently
  const [tools, prompts, resources] = await Promise.all([
    client.listTools(),
    client.listPrompts(),
    client.listResources()
  ]);
  
  if (!tools.tools || tools.tools.length === 0) {
    throw new Error('Concurrent listTools returned no tools');
  }
  
  if (!prompts.prompts || prompts.prompts.length === 0) {
    throw new Error('Concurrent listPrompts returned no prompts');
  }
  
  if (!resources.resources || resources.resources.length === 0) {
    throw new Error('Concurrent listResources returned no resources');
  }
}

/**
 * Test mixed concurrent operations
 */
async function testMixedConcurrent(client: Client): Promise<void> {
  // Mix different types of operations
  const promises = [
    client.listTools(),
    client.callTool({ name: 'validation_example', arguments: { name: 'Mixed test', age: 28, email: 'mixed@example.com', role: 'moderator' } }),
    client.getPrompt({
      name: 'reddit_suggest_action',
      arguments: {
        context: 'Test context for action suggestion'
      }
    }),
    client.readResource({ uri: 'guidelines://code-generation' })  // Changed from reddit://config to avoid 403
  ];
  
  const results = await Promise.all(promises);
  
  // Verify each result type
  if (!results[0].tools) throw new Error('Mixed concurrent: listTools failed');
  if (!results[1].content) throw new Error('Mixed concurrent: callTool failed');
  if (!results[2].messages) throw new Error('Mixed concurrent: getPrompt failed');
  if (!results[3].contents) throw new Error('Mixed concurrent: readResource failed');
}

/**
 * Test high-volume concurrent requests
 */
async function testHighVolumeConcurrent(client: Client): Promise<void> {
  // Create many concurrent requests
  const requestCount = 20;
  const promises = [];
  
  for (let i = 0; i < requestCount; i++) {
    promises.push(
      client.callTool({ name: 'validation_example', arguments: { name: 'Test User', age: 20 + i, email: `test${i}@example.com`, role: 'user' } })
    );
  }
  
  const results = await Promise.all(promises);
  
  // Verify all completed successfully
  if (results.length !== requestCount) {
    throw new Error(`Expected ${requestCount} results, got ${results.length}`);
  }
  
  for (let i = 0; i < results.length; i++) {
    const content = results[i].content as any[];
    if (!content?.[0]?.text) {
      throw new Error(`High volume request ${i} failed`);
    }
  }
}

/**
 * Main test runner
 */
export async function testConcurrent(): Promise<void> {
  log.section('🔄 Testing Concurrent Operations');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    await runTest('Concurrent Tools', () => testConcurrentTools(client!), tracker);
    await runTest('Concurrent Lists', () => testConcurrentLists(client!), tracker);
    await runTest('Mixed Concurrent', () => testMixedConcurrent(client!), tracker);
    await runTest('High Volume Concurrent', () => testHighVolumeConcurrent(client!), tracker);
    
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
  testConcurrent().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}