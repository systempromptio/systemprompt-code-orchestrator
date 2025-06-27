/**
 * @file Test Clean State Tool
 * @module test-clean-state
 * 
 * @remarks
 * Tests the clean_state tool functionality
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Create multiple test tasks
 */
async function createTestTasks(client: Client): Promise<string[]> {
  const taskIds: string[] = [];
  const tasks = [
    { title: 'Completed Task 1', status: 'completed' },
    { title: 'Failed Task 2', status: 'failed' },
    { title: 'In Progress Task 3', status: 'in_progress' },
    { title: 'Pending Task 4', status: 'pending' }
  ];
  
  for (const task of tasks) {
    const result = await client.callTool({
      name: 'create_task',
      arguments: {
        title: task.title,
        description: `Test task: ${task.title}`,
        model: 'claude',
        command: 'echo "Test"',
        project_path: '/data/projects/test-repo',
        branch: 'test-clean',
        priority: 'low',
        start_immediately: false
      }
    });
    
    const content = result.content as any[];
    const response = JSON.parse(content[0].text);
    const taskId = response.result.task_id;
    taskIds.push(taskId);
    
    // Update task status if needed
    if (task.status !== 'pending') {
      await client.callTool({
        name: 'update_task',
        arguments: {
          task_id: taskId,
          update: {
            status: task.status as any,
            progress: task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0
          }
        }
      });
    }
  }
  
  return taskIds;
}

/**
 * Test clean_state dry run
 */
async function testCleanStateDryRun(client: Client): Promise<void> {
  const result = await client.callTool({
    name: 'clean_state',
    arguments: {
      clean_tasks: true,
      clean_sessions: true,
      keep_recent: false,
      force: false,
      dry_run: true
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('clean_state returned invalid response');
  }
  
  const response = JSON.parse(content[0].text);
  
  if (response.status !== 'success') {
    throw new Error(`clean_state failed: ${response.message}`);
  }
  
  const cleanData = response.result;
  
  log.debug(`Dry run: ${cleanData.message}`);
  log.debug(`Would remove ${cleanData.stats.tasks.removed} tasks`);
  log.debug(`Would keep ${cleanData.stats.tasks.kept} tasks`);
  
  if (!cleanData.dry_run) {
    throw new Error('Expected dry_run to be true');
  }
  
  // Check what would be removed
  if (cleanData.removed && cleanData.removed.length > 0) {
    log.debug('Items that would be removed:');
    cleanData.removed.forEach((item: any) => {
      log.debug(`  - ${item.type}: ${item.title || item.id} (${item.status})`);
    });
  }
}

/**
 * Test clean_state actual clean
 */
async function testCleanStateActual(client: Client): Promise<void> {
  const result = await client.callTool({
    name: 'clean_state',
    arguments: {
      clean_tasks: true,
      clean_sessions: true,
      keep_recent: false,
      force: false,
      dry_run: false
    }
  });
  
  const content = result.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('clean_state returned invalid response');
  }
  
  const response = JSON.parse(content[0].text);
  
  if (response.status !== 'success') {
    throw new Error(`clean_state failed: ${response.message}`);
  }
  
  const cleanData = response.result;
  
  log.debug(`Clean completed: ${cleanData.message}`);
  log.debug(`Removed ${cleanData.stats.tasks.removed} tasks`);
  log.debug(`Kept ${cleanData.stats.tasks.kept} tasks`);
  
  if (cleanData.dry_run) {
    throw new Error('Expected dry_run to be false');
  }
}

/**
 * Verify clean results
 */
async function verifyCleanResults(client: Client): Promise<void> {
  const result = await client.callTool({
    name: 'check_status',
    arguments: {
      test_sessions: false,
      verbose: false,
      include_tasks: true,
      include_sessions: false,
      include_tools: false,
      include_resources: false
    }
  });
  
  const content = result.content as any[];
  const response = JSON.parse(content[0].text);
  const statusData = response.result;
  
  log.debug('After clean:');
  log.debug(`  Total tasks: ${statusData.tasks.total}`);
  log.debug(`  Completed: ${statusData.tasks.by_status.completed}`);
  log.debug(`  Failed: ${statusData.tasks.by_status.failed}`);
  log.debug(`  In Progress: ${statusData.tasks.by_status.in_progress}`);
  log.debug(`  Pending: ${statusData.tasks.by_status.pending}`);
  
  // Should have kept in_progress and pending tasks
  if (statusData.tasks.by_status.completed !== 0) {
    throw new Error(`Expected 0 completed tasks, got ${statusData.tasks.by_status.completed}`);
  }
  
  if (statusData.tasks.by_status.failed !== 0) {
    throw new Error(`Expected 0 failed tasks, got ${statusData.tasks.by_status.failed}`);
  }
}

/**
 * Main test runner
 */
export async function testCleanState(): Promise<void> {
  log.section('🧹 Testing Clean State Tool');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    // Create test tasks
    await runTest('Create Test Tasks', async () => {
      const taskIds = await createTestTasks(client!);
      log.debug(`Created ${taskIds.length} test tasks`);
    }, tracker);
    
    // Test dry run
    await runTest('Clean State (Dry Run)', async () => {
      await testCleanStateDryRun(client!);
    }, tracker);
    
    // Test actual clean
    await runTest('Clean State (Actual)', async () => {
      await testCleanStateActual(client!);
    }, tracker);
    
    // Verify results
    await runTest('Verify Clean Results', async () => {
      await verifyCleanResults(client!);
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
  testCleanState().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}