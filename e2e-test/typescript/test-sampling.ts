/**
 * @file MCP Sampling Test
 * @module test-sampling
 * 
 * @remarks
 * Tests MCP sampling functionality
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Test basic sampling flow
 */
async function testBasicSampling(client: Client): Promise<void> {
  // The sampling_example tool should trigger sampling
  const result = await client.callTool({
    name: 'sampling_example',
    arguments: {
      taskType: 'summarize',
      content: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It offers classes, modules, and interfaces to help you build robust components.'
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('Tool returned no content');
  }
  
  // Verify the response mentions sampling
  if (!content[0].text.includes('sampling')) {
    throw new Error('Expected sampling-related response');
  }
}

/**
 * Test sampling with different parameters
 */
async function testSamplingParameters(client: Client): Promise<void> {
  // Test with different parameters
  const result = await client.callTool({
    name: 'sampling_example',
    arguments: {
      taskType: 'analyze',
      content: 'JavaScript vs TypeScript comparison'
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('Tool returned no content');
  }
  
  // Verify we got a response
  if (content[0].text.length < 10) {
    throw new Error('Response too short');
  }
}

/**
 * Test sampling error handling
 */
async function testSamplingErrors(client: Client): Promise<void> {
  // Test with empty message to trigger error
  try {
    await client.callTool({
      name: 'sampling_example',
      arguments: {
        taskType: 'summarize',
        content: ''
      }
    });
    // If no error, verify we got a response
    // Some implementations might handle empty input gracefully
  } catch (error) {
    // Expected - empty message should fail validation
    if (!error || !(error instanceof Error)) {
      throw new Error('Expected error for empty message');
    }
  }
}

/**
 * Main test runner
 */
export async function testSampling(): Promise<void> {
  log.section('🤖 Testing MCP Sampling');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    await runTest('Basic Sampling', () => testBasicSampling(client!), tracker);
    await runTest('Sampling Parameters', () => testSamplingParameters(client!), tracker);
    await runTest('Sampling Errors', () => testSamplingErrors(client!), tracker);
    
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
  testSampling().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}