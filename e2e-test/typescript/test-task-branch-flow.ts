/**
 * @file Test Task Creation with Branch Management
 * @module test-task-branch-flow
 * 
 * @remarks
 * Tests the complete flow of creating a task on a git branch,
 * updating it, and verifying session persistence.
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Helper to wait for a specified time
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test task creation with branch management
 */
async function testTaskCreationWithBranch(client: Client): Promise<string> {
  // Create a task on the 'test' branch
  const toolArgs = {
    title: 'Test Time Query',
    description: 'Ask Claude about the current day',
    model: 'claude' as const,
    command: 'What day is it today? Please respond in a single sentence.',
    project_path: '/data/projects/test-repo',
    branch: 'test',
    priority: 'medium' as const,
    start_immediately: true,
    context: {
      system_prompt: 'You are a helpful assistant. Keep responses brief and direct.'
    }
  };
  
  console.log('Sending tool arguments:', JSON.stringify(toolArgs, null, 2));
  
  const callToolParams = {
    name: 'create_task',
    arguments: toolArgs
  };
  
  console.log('Full callTool params:', JSON.stringify(callToolParams, null, 2));
  
  const createResult = await client.callTool(callToolParams);
  
  const content = createResult.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('create_task returned invalid response');
  }
  
  const createResponse = JSON.parse(content[0].text);
  
  if (createResponse.status === 'error') {
    console.error('Create task error details:', JSON.stringify(createResponse.error, null, 2));
    throw new Error(`Failed to create task: ${createResponse.message}`);
  }
  
  const result = createResponse.result;
  
  log.debug(`Task created: ${result.task_id}`);
  log.debug(`Session ID: ${result.session_id}`);
  log.debug(`Status: ${result.status}`);
  
  if (!result.task_id) {
    throw new Error('Task ID not returned');
  }
  
  if (!result.session_id) {
    throw new Error('Session ID not returned - Claude session not started');
  }
  
  return result.task_id;
}

/**
 * Update the task with a new command
 */
async function testTaskUpdate(client: Client, taskId: string): Promise<void> {
  const updateResult = await client.callTool({
    name: 'update_task',
    arguments: {
      task_id: taskId,
      command: 'What day is tomorrow? Please respond in a single sentence.',
      update: {
        progress: 50,
        add_log: 'Asking about tomorrow'
      }
    }
  });
  
  const content = updateResult.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('update_task returned invalid response');
  }
  
  const updateResponse = JSON.parse(content[0].text);
  
  if (updateResponse.status === 'error') {
    throw new Error(`Failed to update task: ${updateResponse.message}`);
  }
  
  log.debug('Task updated successfully');
  log.debug(`Command sent: ${updateResponse.result.command_sent}`);
}

/**
 * Get task report to verify status
 */
async function testTaskReport(client: Client, taskId: string): Promise<void> {
  const reportResult = await client.callTool({
    name: 'report_task',
    arguments: {
      task_ids: [taskId],
      report_type: 'detailed',
      format: 'json'
    }
  });
  
  const content = reportResult.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('report_task returned invalid response');
  }
  
  const reportResponse = JSON.parse(content[0].text);
  
  if (reportResponse.status === 'error') {
    throw new Error(`Failed to get task report: ${reportResponse.message}`);
  }
  
  const tasks = reportResponse.result.tasks;
  if (!tasks || tasks.length === 0) {
    throw new Error('No tasks returned in report');
  }
  
  const task = tasks[0];
  log.debug(`Task status: ${task.status}`);
  log.debug(`Task progress: ${task.progress}%`);
  log.debug(`Task branch: ${task.branch}`);
  log.debug(`Assigned session: ${task.assigned_to}`);
  
  // Verify task is on correct branch
  if (task.branch !== 'test') {
    throw new Error(`Task is on wrong branch: ${task.branch}`);
  }
  
  // Check logs
  if (task.logs && task.logs.length > 0) {
    log.debug('Task logs:');
    task.logs.forEach((logEntry: string) => {
      log.debug(`  - ${logEntry}`);
    });
  }
}

/**
 * Test resource access for task status
 */
async function testTaskResource(client: Client, taskId: string): Promise<void> {
  const resourceResult = await client.readResource({
    uri: `task://${taskId}`
  });
  
  const content = resourceResult.contents as any[];
  if (!content?.[0]?.text) {
    throw new Error('readResource returned invalid response');
  }
  
  const taskData = JSON.parse(content[0].text);
  
  log.debug('Task resource data:');
  log.debug(`  ID: ${taskData.id}`);
  log.debug(`  Title: ${taskData.title}`);
  log.debug(`  Status: ${taskData.status}`);
  log.debug(`  Branch: ${taskData.branch}`);
  log.debug(`  Session: ${taskData.assigned_to}`);
}

/**
 * Main test runner
 */
export async function testTaskBranchFlow(): Promise<void> {
  log.section('🌿 Testing Task Creation with Branch Management');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  let taskId: string | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    // Run tests in sequence
    await runTest('Create Task on Branch', async () => {
      taskId = await testTaskCreationWithBranch(client!);
    }, tracker);
    
    if (taskId) {
      // Wait 10 seconds before updating
      log.info('Waiting 10 seconds before updating task...');
      await sleep(10000);
      
      await runTest('Update Task', async () => {
        await testTaskUpdate(client!, taskId!);
      }, tracker);
      
      // Wait a bit for the update to process
      await sleep(2000);
      
      await runTest('Get Task Report', async () => {
        await testTaskReport(client!, taskId!);
      }, tracker);
      
      await runTest('Read Task Resource', async () => {
        await testTaskResource(client!, taskId!);
      }, tracker);
    }
    
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
  testTaskBranchFlow().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}