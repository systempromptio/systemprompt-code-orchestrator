/**
 * @file MCP Tools Test
 * @module test-tools
 * 
 * @remarks
 * Tests all MCP tools functionality for the Coding Agent orchestrator
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
  
  // Verify create_task tool exists
  const createTaskTool = result.tools.find(t => t.name === 'create_task');
  if (!createTaskTool) {
    throw new Error('create_task tool not found');
  }
  
  // Verify tool has required fields
  if (!createTaskTool.description || !createTaskTool.inputSchema) {
    throw new Error('create_task tool missing required fields');
  }
  
  log.debug('create_task tool structure verified');
}

/**
 * Test create_task tool
 */
async function testCreateTask(client: Client): Promise<string> {
  const timestamp = Date.now();
  const result = await client.callTool({
    name: 'create_task',
    arguments: {
      title: 'Test Task',
      tool: 'CLAUDECODE',
      instructions: 'echo "Hello from test task"',
      branch: `test-branch-${timestamp}`
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('create_task returned invalid response');
  }
  
  // Parse the response to get task ID
  let taskData;
  try {
    taskData = JSON.parse(content[0].text);
  } catch (e) {
    throw new Error(`Failed to parse create_task response: ${content[0].text}`);
  }
  
  if (!taskData.result?.task_id) {
    console.error('Response:', JSON.stringify(taskData, null, 2));
    throw new Error('create_task did not return a task_id');
  }
  
  log.debug(`Created task with ID: ${taskData.result.task_id}`);
  return taskData.result.task_id;
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
    log.debug('Invalid tool name correctly rejected');
  }
  
  // Test with missing required arguments
  try {
    await client.callTool({ 
      name: 'create_task', 
      arguments: {} // Missing required fields
    });
    throw new Error('Expected error for missing required arguments');
  } catch (error) {
    // Expected error
    log.debug('Missing arguments correctly rejected');
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
    
    // Create a task to verify basic functionality
    await runTest('Create Task', async () => {
      await testCreateTask(client!);
    }, tracker);
    
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
  testTools()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      log.error(`Fatal error: ${error}`);
      process.exit(1);
    });
}