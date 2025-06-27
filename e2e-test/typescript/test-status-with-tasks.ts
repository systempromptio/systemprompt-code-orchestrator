/**
 * @file Test Status with Ongoing Tasks
 * @module test-status-with-tasks
 * 
 * @remarks
 * Tests the check_status tool with task and session information
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';


/**
 * Create a test task
 */
async function createTestTask(client: Client, title: string, branch: string): Promise<string> {
  const result = await client.callTool({
    name: 'create_task',
    arguments: {
      title,
      description: `Test task: ${title}`,
      model: 'claude',
      command: 'echo "Starting task"',
      project_path: '/data/projects/test-repo',
      branch,
      priority: 'medium',
      start_immediately: false
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('create_task returned invalid response');
  }
  
  const response = JSON.parse(content[0].text);
  
  if (response.status === 'error') {
    throw new Error(`Failed to create task: ${response.message}`);
  }
  
  return response.result.task_id;
}

/**
 * Test check_status with no tasks
 */
async function testCheckStatusEmpty(client: Client): Promise<void> {
  const result = await client.callTool({
    name: 'check_status',
    arguments: {
      test_sessions: false,
      verbose: false,
      include_tasks: true,
      include_sessions: true
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('check_status returned invalid response');
  }
  
  const response = JSON.parse(content[0].text);
  
  if (response.status !== 'success') {
    throw new Error(`check_status failed: ${response.message}`);
  }
  
  const statusData = response.result;
  
  // Verify tasks section
  if (!statusData.tasks) {
    throw new Error('Missing tasks section in response');
  }
  
  log.debug(`Total tasks: ${statusData.tasks.total}`);
  log.debug(`Active tasks: ${statusData.tasks.active_tasks.length}`);
  
  // Verify sessions section
  if (!statusData.sessions) {
    throw new Error('Missing sessions section in response');
  }
  
  log.debug(`Claude sessions: ${statusData.sessions.claude.total}`);
  log.debug(`Gemini sessions: ${statusData.sessions.gemini.total}`);
}

/**
 * Test check_status with active tasks
 */
async function testCheckStatusWithTasks(client: Client, taskIds: string[]): Promise<void> {
  const result = await client.callTool({
    name: 'check_status',
    arguments: {
      test_sessions: false,
      verbose: false,
      include_tasks: true,
      include_sessions: true
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('check_status returned invalid response');
  }
  
  const response = JSON.parse(content[0].text);
  
  if (response.status !== 'success') {
    throw new Error(`check_status failed: ${response.message}`);
  }
  
  const statusData = response.result;
  
  log.debug(`Total tasks: ${statusData.tasks.total}`);
  log.debug(`Tasks by status:`);
  log.debug(`  - Pending: ${statusData.tasks.by_status.pending}`);
  log.debug(`  - In Progress: ${statusData.tasks.by_status.in_progress}`);
  log.debug(`  - Completed: ${statusData.tasks.by_status.completed}`);
  
  if (statusData.tasks.total < taskIds.length) {
    throw new Error(`Expected at least ${taskIds.length} tasks, got ${statusData.tasks.total}`);
  }
  
  // Check active tasks
  if (statusData.tasks.active_tasks && statusData.tasks.active_tasks.length > 0) {
    log.debug('Active tasks:');
    statusData.tasks.active_tasks.forEach((task: any) => {
      log.debug(`  - ${task.title} (${task.id}) on branch ${task.branch}`);
    });
  }
}

/**
 * Test check_status with verbose output
 */
async function testCheckStatusVerbose(client: Client): Promise<void> {
  const result = await client.callTool({
    name: 'check_status',
    arguments: {
      test_sessions: false,
      verbose: true,
      include_tasks: true,
      include_sessions: true
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('check_status returned invalid response');
  }
  
  const response = JSON.parse(content[0].text);
  
  if (response.status !== 'success') {
    throw new Error(`check_status failed: ${response.message}`);
  }
  
  const statusData = response.result;
  
  // Verify verbose details are included
  if (!statusData.details) {
    throw new Error('Missing details section in verbose response');
  }
  
  log.debug('Verbose details included:');
  log.debug(`  - Claude details: ${!!statusData.details.claude}`);
  log.debug(`  - Gemini details: ${!!statusData.details.gemini}`);
  log.debug(`  - Environment: ${!!statusData.details.environment}`);
}

/**
 * Main test runner
 */
export async function testStatusWithTasks(): Promise<void> {
  log.section('📊 Testing Check Status with Tasks');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  const taskIds: string[] = [];
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    // Test empty status
    await runTest('Check Status (Empty)', async () => {
      await testCheckStatusEmpty(client!);
    }, tracker);
    
    // Create some test tasks
    await runTest('Create Test Tasks', async () => {
      const task1 = await createTestTask(client!, 'Feature Implementation', 'feature/test-1');
      const task2 = await createTestTask(client!, 'Bug Fix', 'fix/test-bug');
      const task3 = await createTestTask(client!, 'Documentation Update', 'docs/update');
      
      taskIds.push(task1, task2, task3);
      log.debug(`Created ${taskIds.length} test tasks`);
    }, tracker);
    
    // Test status with tasks
    await runTest('Check Status with Tasks', async () => {
      await testCheckStatusWithTasks(client!, taskIds);
    }, tracker);
    
    // Test verbose output
    await runTest('Check Status (Verbose)', async () => {
      await testCheckStatusVerbose(client!);
    }, tracker);
    
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
  testStatusWithTasks().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}