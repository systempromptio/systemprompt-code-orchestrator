/**
 * @file MCP Resources Test
 * @module test-resources
 * 
 * @remarks
 * Tests all MCP resources functionality for the Coding Agent orchestrator
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Test resource discovery
 */
async function testResourceDiscovery(client: Client): Promise<void> {
  const result = await client.listResources();
  
  if (!result.resources || result.resources.length === 0) {
    throw new Error('No resources found');
  }
  
  log.debug(`Found ${result.resources.length} resources`);
  
  // Verify expected resources exist
  const expectedResources = [
    'agent://status',
    'agent://tasks',
    'agent://sessions'
  ];
  
  // Check for at least the static resources
  for (const resourceUri of expectedResources) {
    const resource = result.resources.find(r => r.uri === resourceUri);
    if (!resource) {
      throw new Error(`Expected resource not found: ${resourceUri}`);
    }
    
    // Verify resource has required fields
    if (!resource.name || !resource.mimeType) {
      throw new Error(`Resource ${resourceUri} missing required fields`);
    }
  }
}

/**
 * Test reading agent status
 */
async function testAgentStatus(client: Client): Promise<void> {
  const result = await client.readResource({
    uri: 'agent://status'
  });
  
  if (!result.contents || result.contents.length === 0) {
    throw new Error('Status resource returned no contents');
  }
  
  const content = result.contents[0];
  if (!content.text || !content.mimeType) {
    throw new Error('Status content missing required fields');
  }
  
  // Parse and validate status
  let status;
  try {
    status = JSON.parse(String(content.text));
  } catch (e) {
    throw new Error(`Failed to parse status JSON: ${content.text}`);
  }
  
  if (status.status !== 'ready') {
    throw new Error(`Unexpected agent status: ${status.status}`);
  }
  
  if (!status.capabilities || !Array.isArray(status.capabilities)) {
    throw new Error('Status missing capabilities array');
  }
  
  log.debug(`Agent status: ${status.status}, capabilities: ${status.capabilities.join(', ')}`);
}

/**
 * Test reading tasks list
 */
async function testTasksList(client: Client): Promise<void> {
  const result = await client.readResource({
    uri: 'agent://tasks'
  });
  
  if (!result.contents || result.contents.length === 0) {
    throw new Error('Tasks resource returned no contents');
  }
  
  const content = result.contents[0];
  if (!content.text || !content.mimeType) {
    throw new Error('Tasks content missing required fields');
  }
  
  // Parse and validate tasks
  let tasks;
  try {
    tasks = JSON.parse(String(content.text));
  } catch (e) {
    throw new Error(`Failed to parse tasks JSON: ${content.text}`);
  }
  
  if (typeof tasks.count !== 'number') {
    throw new Error('Tasks missing count field');
  }
  
  if (!Array.isArray(tasks.tasks)) {
    throw new Error('Tasks missing tasks array');
  }
  
  log.debug(`Found ${tasks.count} tasks in the system`);
}

/**
 * Test reading specific task resource after creating one
 */
async function testTaskResource(client: Client): Promise<void> {
  // First create a task to ensure we have one
  const createResult = await client.callTool({
    name: 'create_task',
    arguments: {
      title: 'Resource Test Task',
      description: 'Task created for resource testing',
      model: 'claude',
      command: 'echo "Testing resources"',
      project_path: '/tmp/resource-test',
      priority: 'low',
      start_immediately: false
    }
  });
  
  const content = createResult.content as any[];
  const taskData = JSON.parse(content[0].text);
  const taskId = taskData.task_id;
  
  // Now test reading the specific task resource
  const taskResult = await client.readResource({
    uri: `agent://tasks/${taskId}`
  });
  
  if (!taskResult.contents || taskResult.contents.length === 0) {
    throw new Error('Task resource returned no contents');
  }
  
  const taskContent = taskResult.contents[0];
  let task;
  try {
    task = JSON.parse(String(taskContent.text));
  } catch (e) {
    throw new Error(`Failed to parse task JSON: ${taskContent.text}`);
  }
  
  if (task.id !== taskId) {
    throw new Error(`Task ID mismatch: expected ${taskId}, got ${task.id}`);
  }
  
  if (task.name !== 'Resource Test Task') {
    throw new Error(`Task name mismatch: expected 'Resource Test Task', got ${task.name}`);
  }
  
  log.debug(`Successfully read task resource: ${task.id}`);
  
  // Clean up
  await client.callTool({
    name: 'end_task',
    arguments: {
      task_id: taskId,
      status: 'cancelled',
      summary: 'Test task cancelled after resource test'
    }
  });
}

/**
 * Test resource URI validation
 */
async function testResourceValidation(client: Client): Promise<void> {
  // Test with invalid URI
  try {
    await client.readResource({
      uri: 'invalid://resource/uri'
    });
    throw new Error('Expected error for invalid resource URI');
  } catch (error) {
    // Expected error
  }
  
  // Test with non-existent task
  try {
    await client.readResource({
      uri: 'agent://tasks/non_existent_task_id'
    });
    throw new Error('Expected error for non-existent task');
  } catch (error) {
    // Expected error
  }
}

/**
 * Main test runner
 */
export async function testResources(): Promise<void> {
  log.section('📚 Testing MCP Resources');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    await runTest('Resource Discovery', () => testResourceDiscovery(client!), tracker);
    await runTest('Agent Status', () => testAgentStatus(client!), tracker);
    await runTest('Tasks List', () => testTasksList(client!), tracker);
    await runTest('Task Resource', () => testTaskResource(client!), tracker);
    await runTest('Resource Validation', () => testResourceValidation(client!), tracker);
    
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
  testResources().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}