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
  
  // Verify expected prompts exist
  const expectedPrompts = [
    'task_planning',
    'task_automation',
    'task_debug'
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
  // Test task_planning prompt
  const planningResult = await client.getPrompt({
    name: 'task_planning',
    arguments: {
      task_description: 'Build a REST API with authentication',
      constraints: 'Must use TypeScript and Express'
    }
  });
  
  if (!planningResult.messages || planningResult.messages.length < 2) {
    throw new Error('task_planning prompt returned insufficient messages');
  }
  
  const planningAssistantMsg = planningResult.messages.find(m => m.role === 'assistant');
  if (!planningAssistantMsg || !planningAssistantMsg.content.text) {
    throw new Error('task_planning prompt missing assistant response');
  }
  
  // Test task_automation prompt
  const automationResult = await client.getPrompt({
    name: 'task_automation',
    arguments: {
      process_description: 'Daily backup of database to S3',
      target_environment: 'docker'
    }
  });
  
  if (!automationResult.messages || automationResult.messages.length < 2) {
    throw new Error('task_automation prompt returned insufficient messages');
  }
  
  // Test task_debug prompt with minimal arguments
  const debugResult = await client.getPrompt({
    name: 'task_debug',
    arguments: {
      task_id: 'test_task_123'
    }
  });
  
  if (!debugResult.messages || debugResult.messages.length < 2) {
    throw new Error('task_debug prompt returned insufficient messages');
  }
}

/**
 * Test prompt argument validation
 */
async function testPromptValidation(client: Client): Promise<void> {
  // Test with missing required argument
  try {
    await client.getPrompt({
      name: 'task_planning',
      arguments: {}  // Missing required task_description
    });
    throw new Error('Expected error for missing required argument');
  } catch (error) {
    // Expected error
  }
  
  // Test with non-existent prompt
  try {
    await client.getPrompt({
      name: 'non_existent_prompt',
      arguments: {}
    });
    throw new Error('Expected error for non-existent prompt');
  } catch (error) {
    // Expected error
  }
}

/**
 * Test prompt with all optional arguments
 */
async function testPromptOptionalArgs(client: Client): Promise<void> {
  // Test task_debug with all arguments
  const result = await client.getPrompt({
    name: 'task_debug',
    arguments: {
      task_id: 'test_task_456',
      issue_description: 'Task fails with permission denied error'
    }
  });
  
  if (!result.messages || result.messages.length < 2) {
    throw new Error('task_debug prompt with optional args returned insufficient messages');
  }
  
  // Verify argument substitution
  const userMsg = result.messages.find(m => m.role === 'user');
  if (!userMsg || !userMsg.content?.text) {
    throw new Error('User message missing');
  }
  
  const userText = String(userMsg.content.text);
  if (!userText.includes('test_task_456')) {
    throw new Error('task_id argument not substituted correctly');
  }
  
  if (!userText.includes('permission denied')) {
    throw new Error('issue_description argument not substituted correctly');
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
    await runTest('Optional Arguments', () => testPromptOptionalArgs(client!), tracker);
    
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