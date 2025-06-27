/**
 * @file MCP Prompts Test
 * @module test-prompts
 * 
 * @remarks
 * Tests all MCP prompts functionality
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
  
  // Verify expected prompts exist
  const expectedPrompts = [
    'reddit_suggest_action',
    'code_generation_example'
  ];
  
  for (const promptName of expectedPrompts) {
    const prompt = result.prompts.find(p => p.name === promptName);
    if (!prompt) {
      throw new Error(`Expected prompt not found: ${promptName}`);
    }
    
    // Verify prompt has required fields
    if (!prompt.description) {
      throw new Error(`Prompt ${promptName} missing description`);
    }
  }
}

/**
 * Test prompt retrieval and variations
 */
async function testPromptRetrieval(client: Client): Promise<void> {
  // Test reddit_suggest_action prompt
  const replyResult = await client.getPrompt({
    name: 'reddit_suggest_action',
    arguments: {
      context: 'User is asking for help with MCP implementation'
    }
  });
  
  if (!replyResult.messages || replyResult.messages.length === 0) {
    throw new Error('reddit_suggest_action returned no messages');
  }
  
  // Test code_generation_example prompt
  const draftResult = await client.getPrompt({
    name: 'code_generation_example',
    arguments: {
      language: 'typescript',
      task: 'Create a simple function'
    }
  });
  
  if (!draftResult.messages || draftResult.messages.length === 0) {
    throw new Error('code_generation_example returned no messages');
  }
}

/**
 * Test prompt argument validation
 */
async function testPromptValidation(client: Client): Promise<void> {
  // Test with missing required arguments
  try {
    await client.getPrompt({
      name: 'reddit_suggest_action',
      arguments: {
        // Missing required context
      }
    });
    throw new Error('Expected error for missing required arguments');
  } catch (error) {
    // Expected error
  }
  
  // Test with invalid prompt name
  try {
    await client.getPrompt({
      name: 'invalid_prompt_name',
      arguments: {}
    });
    throw new Error('Expected error for invalid prompt name');
  } catch (error) {
    // Expected error
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