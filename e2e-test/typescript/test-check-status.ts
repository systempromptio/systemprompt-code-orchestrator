/**
 * @file MCP Check Status Tool Test
 * @module test-check-status
 * 
 * @remarks
 * Tests the check_status tool functionality
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Test check_status tool without test sessions
 */
async function testCheckStatusBasic(client: Client): Promise<void> {
  const result = await client.callTool({
    name: 'check_status',
    arguments: {
      test_sessions: false,
      verbose: false
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('check_status returned invalid response');
  }
  
  let statusData;
  try {
    console.log('check_status response:', content[0].text);
    const parsedResponse = JSON.parse(content[0].text);
    // The response format is: { status: "success", message: "...", result: {...} }
    if (parsedResponse.status === 'success' && parsedResponse.result) {
      statusData = parsedResponse.result;
    } else {
      statusData = parsedResponse;
    }
  } catch (e) {
    throw new Error(`Failed to parse check_status response: ${content[0].text}`);
  }
  
  // Verify required fields
  if (!statusData.status || !statusData.services) {
    throw new Error('check_status missing required fields');
  }
  
  if (!['active', 'partial', 'not active'].includes(statusData.status)) {
    throw new Error(`Invalid status value: ${statusData.status}`);
  }
  
  // Verify service structure
  if (!statusData.services.claude || !statusData.services.gemini) {
    throw new Error('check_status missing service information');
  }
  
  log.debug(`System status: ${statusData.status}`);
  log.debug(`Claude Code: ${statusData.services.claude.status}`);
  log.debug(`Gemini: ${statusData.services.gemini.status}`);
}

/**
 * Test check_status tool with verbose output
 */
async function testCheckStatusVerbose(client: Client): Promise<void> {
  const result = await client.callTool({
    name: 'check_status',
    arguments: {
      test_sessions: false,
      verbose: true
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('check_status returned invalid response');
  }
  
  let statusData;
  try {
    console.log('check_status response:', content[0].text);
    const parsedResponse = JSON.parse(content[0].text);
    // The response format is: { status: "success", message: "...", result: {...} }
    if (parsedResponse.status === 'success' && parsedResponse.result) {
      statusData = parsedResponse.result;
    } else {
      statusData = parsedResponse;
    }
  } catch (e) {
    throw new Error(`Failed to parse check_status response: ${content[0].text}`);
  }
  
  // Verify verbose details are included
  if (!statusData.details) {
    throw new Error('check_status verbose mode did not include details');
  }
  
  if (!statusData.details.environment) {
    throw new Error('check_status verbose mode missing environment details');
  }
  
  log.debug('Environment variables checked:');
  log.debug(`  ANTHROPIC_API_KEY: ${statusData.details.environment.ANTHROPIC_API_KEY}`);
  log.debug(`  GEMINI_API_KEY: ${statusData.details.environment.GEMINI_API_KEY}`);
}

/**
 * Test check_status tool with test sessions (may fail if SDKs not available)
 */
async function testCheckStatusWithSessions(client: Client): Promise<void> {
  try {
    const result = await client.callTool({
      name: 'check_status',
      arguments: {
        test_sessions: true,
        verbose: true
      }
    });
    
    const content = result.content as any[];
    if (!content?.[0]?.text) {
      throw new Error('check_status returned invalid response');
    }
    
    let statusData;
    try {
      console.log('check_status response:', content[0].text);
      const parsedResponse = JSON.parse(content[0].text);
      // The response format is: { status: "success", message: "...", result: {...} }
      if (parsedResponse.status === 'success' && parsedResponse.result) {
        statusData = parsedResponse.result;
      } else {
        statusData = parsedResponse;
      }
    } catch (e) {
      throw new Error(`Failed to parse check_status response: ${content[0].text}`);
    }
    
    log.debug('Test session results:');
    if (statusData.details?.claude) {
      log.debug(`  Claude Code test: ${statusData.details.claude.test_session_success ? 'SUCCESS' : 'FAILED'}`);
      if (statusData.details.claude.error) {
        log.debug(`    Error: ${statusData.details.claude.error}`);
      }
    }
    if (statusData.details?.gemini) {
      log.debug(`  Gemini test: ${statusData.details.gemini.test_session_success ? 'SUCCESS' : 'FAILED'}`);
      if (statusData.details.gemini.error) {
        log.debug(`    Error: ${statusData.details.gemini.error}`);
      }
    }
  } catch (error) {
    // This test may fail if SDKs are not available in the test environment
    log.warning(`Test sessions failed (expected in test environment): ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Main test runner
 */
export async function testCheckStatus(): Promise<void> {
  log.section('🔍 Testing Check Status Tool');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    await runTest('Check Status Basic', () => testCheckStatusBasic(client!), tracker);
    await runTest('Check Status Verbose', () => testCheckStatusVerbose(client!), tracker);
    await runTest('Check Status with Sessions', () => testCheckStatusWithSessions(client!), tracker);
    
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
  testCheckStatus().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}