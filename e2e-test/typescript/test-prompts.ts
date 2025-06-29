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
  
  log.info(`Found ${result.prompts.length} prompts:`);
  
  // Print all available prompts
  result.prompts.forEach((prompt, index) => {
    log.debug(`${index + 1}. ${prompt.name}: ${prompt.description}`);
  });
  
  // Expected prompts
  const expectedPrompts = [
    // Unit Testing
    'create_unit_tests',
    'add_missing_tests',
    'fix_failing_tests',
    'improve_test_coverage',
    
    // React Components
    'create_react_component',
    'update_react_component',
    'convert_to_hooks',
    'create_custom_hook',
    'optimize_react_performance',
    
    // Bug Fixing
    'fix_bug',
    'debug_async_issue',
    'fix_memory_leak',
    'debug_production_issue',
    'fix_performance_issue',
    
    // Refactoring
    'refactor_code',
    'extract_common_code',
    'simplify_complex_function',
    'modernize_legacy_code',
    'improve_architecture'
  ];
  
  // Check that all expected prompts exist
  const promptNames = result.prompts.map(p => p.name);
  const missingPrompts = expectedPrompts.filter(name => !promptNames.includes(name));
  
  if (missingPrompts.length > 0) {
    throw new Error(`Missing prompts: ${missingPrompts.join(', ')}`);
  }
  
  // Verify each prompt has required fields
  for (const prompt of result.prompts) {
    if (!prompt.description) {
      throw new Error(`Prompt ${prompt.name} missing description`);
    }
    if (!prompt.name) {
      throw new Error(`Prompt missing name`);
    }
  }
  
  log.success(`All ${expectedPrompts.length} expected prompts found and valid`);
}

/**
 * Test prompt retrieval
 */
async function testPromptRetrieval(client: Client): Promise<void> {
  // Test retrieval of create_unit_tests prompt with arguments
  const promptName = 'create_unit_tests';
  log.debug(`Testing retrieval of prompt: ${promptName}`);
  
  try {
    const promptResult = await client.getPrompt({
      name: promptName,
      arguments: {
        file_path: '/src/example.ts',
        test_framework: 'jest',
        coverage_target: '80'
      }
    });
    
    if (!promptResult.messages || promptResult.messages.length === 0) {
      throw new Error(`Prompt ${promptName} returned no messages`);
    }
    
    // Check that template variables were replaced
    const firstMessage = promptResult.messages[0];
    if (firstMessage.content.type !== 'text') {
      throw new Error('Expected text content in first message');
    }
    const messageText = firstMessage.content.text;
    if (messageText.includes('{{file_path}}')) {
      throw new Error('Template variable {{file_path}} not replaced');
    }
    if (!messageText.includes('/src/example.ts')) {
      throw new Error('file_path argument not applied correctly');
    }
    if (!messageText.includes('jest')) {
      throw new Error('test_framework argument not applied correctly');
    }
    if (!messageText.includes('80')) {
      throw new Error('coverage_target argument not applied correctly');
    }
    
    log.success(`Successfully retrieved and processed prompt ${promptName}`);
  } catch (error) {
    throw new Error(`Failed to retrieve prompt ${promptName}: ${error}`);
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
  } catch (error: any) {
    if (!error.message.includes('Prompt not found')) {
      throw new Error(`Unexpected error message: ${error.message}`);
    }
    log.success('Non-existent prompt correctly rejected');
  }
}

/**
 * Test prompt categories
 */
async function testPromptCategories(client: Client): Promise<void> {
  const result = await client.listPrompts();
  
  const categories = {
    'Unit Testing': [
      'create_unit_tests',
      'add_missing_tests',
      'fix_failing_tests',
      'improve_test_coverage'
    ],
    'React Components': [
      'create_react_component',
      'update_react_component',
      'convert_to_hooks',
      'create_custom_hook',
      'optimize_react_performance'
    ],
    'Bug Fixing': [
      'fix_bug',
      'debug_async_issue',
      'fix_memory_leak',
      'debug_production_issue',
      'fix_performance_issue'
    ],
    'Refactoring': [
      'refactor_code',
      'extract_common_code',
      'simplify_complex_function',
      'modernize_legacy_code',
      'improve_architecture'
    ]
  };
  
  log.info('\nPrompts organized by category:');
  
  for (const [category, promptNames] of Object.entries(categories)) {
    log.debug(`\n${category}:`);
    for (const name of promptNames) {
      const prompt = result.prompts.find(p => p.name === name);
      if (prompt) {
        log.debug(`  ✓ ${prompt.name} - ${prompt.description}`);
      } else {
        log.error(`  ✗ ${name} (missing)`);
      }
    }
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
    await runTest('Prompt Categories', () => testPromptCategories(client!), tracker);
    
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
  testPrompts()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      log.error(`Fatal error: ${error}`);
      process.exit(1);
    });
}