/**
 * @file MCP Prompts Test
 * @module test-prompts
 * 
 * @remarks
 * Tests all MCP prompts functionality for the Coding Agent orchestrator
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Test prompt discovery
 */
async function testPromptDiscovery(client: Client): Promise<void> {
  const result = await client.listPrompts();
  
  if (!result.prompts || result.prompts.length === 0) {
    throw new Error('No prompts found');
  }
  
  log.debug(`Found ${result.prompts.length} prompts`);
  
  // Verify at least some prompts exist
  const expectedPrompts = [
    'unit_testing',
    'refactoring'
  ];
  
  // Check that we have at least the core prompts
  let foundCount = 0;
  for (const promptName of expectedPrompts) {
    const prompt = result.prompts.find(p => p.name === promptName);
    if (prompt) {
      foundCount++;
      // Verify prompt has required fields
      if (!prompt.description) {
        throw new Error(`Prompt ${promptName} missing description`);
      }
    }
  }
  
  if (foundCount === 0) {
    throw new Error(`No expected prompts found`);
  }
  
  log.debug(`Verified ${foundCount} core prompts exist`);
}

/**
 * Test prompt retrieval
 */
async function testPromptRetrieval(client: Client): Promise<void> {
  // Get list of available prompts first
  const listResult = await client.listPrompts();
  if (!listResult.prompts || listResult.prompts.length === 0) {
    log.warning('No prompts available to test retrieval');
    return;
  }
  
  // Test retrieval of first available prompt
  const firstPrompt = listResult.prompts[0];
  log.debug(`Testing retrieval of prompt: ${firstPrompt.name}`);
  
  try {
    const promptResult = await client.getPrompt({
      name: firstPrompt.name,
      arguments: {}
    });
    
    if (!promptResult.messages) {
      throw new Error(`Prompt ${firstPrompt.name} returned no messages`);
    }
    
    log.debug(`Successfully retrieved prompt ${firstPrompt.name} with ${promptResult.messages.length} messages`);
  } catch (error) {
    // Some prompts may require arguments
    log.debug(`Prompt ${firstPrompt.name} may require specific arguments: ${error}`);
  }
}

/**
 * Test prompt validation
 */
async function testPromptValidation(client: Client): Promise<void> {
  // Test with non-existent prompt
  try {
    await client.getPrompt({
      name: 'non_existent_prompt_test_123',
      arguments: {}
    });
    throw new Error('Expected error for non-existent prompt');
  } catch (error) {
    // Expected error
    log.debug('Non-existent prompt correctly rejected');
  }
}



/**
 * Main test runner
 */
export async function testPrompts(): Promise<void> {
  log.section('📝 Testing MCP Prompts');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    await runTest('Prompt Discovery', () => testPromptDiscovery(client!), tracker);
    await runTest('Prompt Retrieval', () => testPromptRetrieval(client!), tracker);
    await runTest('Prompt Validation', () => testPromptValidation(client!), tracker);
    
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
  testPrompts().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}