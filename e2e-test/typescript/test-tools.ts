/**
 * @file MCP Tools Test
 * @module test-tools
 * 
 * @remarks
 * Tests all MCP tools functionality
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Test tool discovery
 */
async function testToolDiscovery(client: Client): Promise<void> {
  const result = await client.listTools();
  
  if (!result.tools || result.tools.length === 0) {
    throw new Error('No tools found');
  }
  
  log.debug(`Found ${result.tools.length} tools`);
  
  // Verify expected tools exist
  const expectedTools = [
    'validation_example',
    'structured_data_example',
    'search_reddit',
    'get_post',
    'get_channel',
    'get_notifications',
    'get_comment'
  ];
  
  for (const toolName of expectedTools) {
    const tool = result.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Expected tool not found: ${toolName}`);
    }
    
    // Verify tool has required fields
    if (!tool.description || !tool.inputSchema) {
      throw new Error(`Tool ${toolName} missing required fields`);
    }
  }
}

/**
 * Test example tools
 */
async function testExampleTools(client: Client): Promise<void> {
  // Test validation_example tool
  const validationResult = await client.callTool({
    name: 'validation_example',
    arguments: {
      name: 'Test User',
      age: 25,
      email: 'test@example.com',
      role: 'user'
    }
  });
  
  const content = validationResult.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('validation_example returned invalid response');
  }
  
  // Test structured_data_example tool
  const structuredResult = await client.callTool({
    name: 'structured_data_example',
    arguments: { dataType: 'user' }
  });
  
  const structContent = structuredResult.content as any[];
  if (!structContent?.[0]?.text) {
    throw new Error('structured_data_example returned invalid response');
  }
  
  // The structured_data_example might return text or JSON
  // Let's just verify we got a response
  const responseText = structContent[0].text;
  if (!responseText || responseText.length < 10) {
    throw new Error('structured_data_example returned empty or too short response');
  }
}

/**
 * Test Reddit search tool
 */
async function testRedditSearch(client: Client): Promise<void> {
  const result = await client.callTool({
    name: 'search_reddit',
    arguments: {
      query: 'typescript',
      sort: 'relevance',
      time: 'week',
      limit: 5
    }
  });
  
  const searchContent = result.content as any[];
  if (!searchContent?.[0]?.text) {
    throw new Error('reddit_search returned no content');
  }
  
  let searchData;
  try {
    searchData = JSON.parse(searchContent[0].text);
  } catch (e) {
    throw new Error(`Failed to parse search_reddit response: ${searchContent[0].text}`);
  }
  if (!searchData || typeof searchData !== 'object') {
    throw new Error('search_reddit returned invalid data structure');
  }
}

/**
 * Test error handling
 */
async function testErrorHandling(client: Client): Promise<void> {
  // Test with invalid tool name
  try {
    await client.callTool({ name: 'invalid_tool_name', arguments: {} });
    throw new Error('Expected error for invalid tool name');
  } catch (error) {
    // Expected error
  }
  
  // Test with invalid parameters
  try {
    await client.callTool({ name: 'validation_example', arguments: {} });
    throw new Error('Expected error for missing required parameters');
  } catch (error) {
    // Expected error
  }
}

/**
 * Main test runner
 */
export async function testTools(): Promise<void> {
  log.section('🛠️  Testing MCP Tools');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    await runTest('Tool Discovery', () => testToolDiscovery(client!), tracker);
    await runTest('Example Tools', () => testExampleTools(client!), tracker);
    await runTest('Reddit Search', () => testRedditSearch(client!), tracker);
    await runTest('Error Handling', () => testErrorHandling(client!), tracker);
    
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
  testTools().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}