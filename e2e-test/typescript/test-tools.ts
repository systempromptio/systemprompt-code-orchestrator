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
  
  // Verify expected tools exist
  const expectedTools = [
    'create_task',
    'update_task',
    'end_task',
    'report_task',
    'update_stats'
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
 * Test create_task tool
 */
async function testCreateTask(client: Client): Promise<string> {
  const result = await client.callTool({
    name: 'create_task',
    arguments: {
      title: 'Test Task',
      description: 'This is a test task for E2E testing',
      model: 'claude',
      command: 'echo "Hello from test task"',
      project_path: '/tmp/test-project',
      priority: 'medium',
      start_immediately: false
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
 * Test update_task tool
 */
async function testUpdateTask(client: Client, taskId: string): Promise<void> {
  // Test updating task metadata without a command (no session started)
  const result = await client.callTool({
    name: 'update_task',
    arguments: {
      task_id: taskId,
      // No command field - just update metadata
      update: {
        status: 'in_progress',
        progress: 50,
        add_log: 'Task is now in progress'
      }
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('update_task returned invalid response');
  }
  
  let updateData;
  try {
    updateData = JSON.parse(content[0].text);
  } catch (e) {
    throw new Error(`Failed to parse update_task response: ${content[0].text}`);
  }
  
  if (updateData.status !== 'success') {
    throw new Error('update_task did not succeed');
  }
}

/**
 * Test update_stats tool
 */
async function testUpdateStats(client: Client): Promise<void> {
  const result = await client.callTool({
    name: 'update_stats',
    arguments: {
      include_tasks: true,
      include_sessions: true
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('update_stats returned invalid response');
  }
  
  let statsData;
  try {
    statsData = JSON.parse(content[0].text);
  } catch (e) {
    throw new Error(`Failed to parse update_stats response: ${content[0].text}`);
  }
  
  if (!statsData.result?.tasks || typeof statsData.result.tasks.total !== 'number') {
    throw new Error('update_stats returned invalid stats structure');
  }
  
  log.debug(`Stats - Total tasks: ${statsData.result.tasks.total}, Active sessions: ${statsData.result.sessions?.active || 0}`);
}

/**
 * Test report_task tool
 */
async function testReportTask(client: Client, taskId: string): Promise<void> {
  const result = await client.callTool({
    name: 'report_task',
    arguments: {
      task_ids: [taskId],
      report_type: 'detailed',
      format: 'json'
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('report_task returned invalid response');
  }
  
  let reportData;
  try {
    reportData = JSON.parse(content[0].text);
  } catch (e) {
    throw new Error(`Failed to parse report_task response: ${content[0].text}`);
  }
  
  if (!reportData.tasks || reportData.tasks.length === 0) {
    throw new Error('report_task returned no tasks');
  }
  
  const task = reportData.tasks[0];
  if (task.id !== taskId) {
    throw new Error('report_task returned wrong task');
  }
}

/**
 * Test end_task tool
 */
async function testEndTask(client: Client, taskId: string): Promise<void> {
  const result = await client.callTool({
    name: 'end_task',
    arguments: {
      task_id: taskId,
      status: 'completed',
      summary: 'Test task completed successfully',
      generate_report: true
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('end_task returned invalid response');
  }
  
  let endData;
  try {
    endData = JSON.parse(content[0].text);
  } catch (e) {
    throw new Error(`Failed to parse end_task response: ${content[0].text}`);
  }
  
  if (endData.status !== 'success') {
    throw new Error('end_task did not succeed');
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
  
  // Test with invalid task ID
  try {
    await client.callTool({ 
      name: 'update_task', 
      arguments: { 
        task_id: 'invalid_id',
        command: 'test'
      } 
    });
    throw new Error('Expected error for invalid task ID');
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
  let testTaskId: string | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    await runTest('Tool Discovery', () => testToolDiscovery(client!), tracker);
    
    // Create a task and use it for subsequent tests
    await runTest('Create Task', async () => {
      testTaskId = await testCreateTask(client!);
    }, tracker);
    
    if (testTaskId) {
      await runTest('Update Task', () => testUpdateTask(client!, testTaskId!), tracker);
      await runTest('Update Stats', () => testUpdateStats(client!), tracker);
      await runTest('Report Task', () => testReportTask(client!, testTaskId!), tracker);
      await runTest('End Task', () => testEndTask(client!, testTaskId!), tracker);
    }
    
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