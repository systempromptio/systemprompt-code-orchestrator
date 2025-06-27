/**
 * @file End-to-End Test for Claude Code Task Execution
 * @module test-claude-code-e2e
 * 
 * @remarks
 * Tests the complete flow of creating a task, executing it with Claude Code,
 * creating a file, and verifying the branch status
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
 * Check initial system status
 */
async function checkInitialStatus(client: Client): Promise<void> {
  const result = await client.callTool({
    name: 'check_status',
    arguments: {
      test_sessions: false,
      verbose: true,
      include_tasks: true,
      include_sessions: true,
      include_tools: false,
      include_resources: false
    }
  });
  
  const content = result.content as any[];
  const response = JSON.parse(content[0].text);
  
  if (response.status !== 'success') {
    throw new Error(`check_status failed: ${response.message}`);
  }
  
  const statusData = response.result;
  
  log.debug('Initial system status:');
  log.debug(`  Overall: ${statusData.status}`);
  log.debug(`  Claude: ${statusData.services.claude.status}`);
  log.debug(`  Claude API Key: ${statusData.services.claude.api_key_present ? 'Present' : 'Missing'}`);
  log.debug(`  Claude CLI: ${statusData.services.claude.cli_available ? 'Available' : 'Not Available'}`);
  
  if (!statusData.services.claude.api_key_present) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  
  if (!statusData.services.claude.cli_available) {
    throw new Error('Claude Code CLI is not available');
  }
}

/**
 * Create and start a Claude Code task
 */
async function createClaudeCodeTask(client: Client): Promise<string> {
  const branchName = `test/e2e-${Date.now()}`;
  const fileName = `test-file-${Date.now()}.txt`;
  
  const result = await client.callTool({
    name: 'create_task',
    arguments: {
      title: 'E2E Test: Create Test File',
      description: 'End-to-end test to create a test file using Claude Code',
      model: 'claude',
      command: `Create a new text file named ${fileName} with the content "Hello from Claude Code E2E Test!" and save it in the current directory.`,
      project_path: '/data/projects/test-repo',
      branch: branchName,
      priority: 'high',
      start_immediately: true,
      context: {
        system_prompt: 'You are a helpful assistant. Create the requested file with the exact content specified.',
        max_turns: 3
      }
    }
  });
  
  const content = result.content as any[];
  const response = JSON.parse(content[0].text);
  
  if (response.status === 'error') {
    throw new Error(`Failed to create task: ${response.message}`);
  }
  
  const taskData = response.result;
  
  log.debug(`Task created: ${taskData.task_id}`);
  log.debug(`Session: ${taskData.session_id}`);
  log.debug(`Branch: ${branchName}`);
  log.debug(`Status: ${taskData.status}`);
  
  if (!taskData.session_id) {
    throw new Error('No session ID returned - Claude Code session was not started');
  }
  
  return taskData.task_id;
}

/**
 * Monitor task progress
 */
async function monitorTaskProgress(client: Client, taskId: string): Promise<void> {
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds timeout
  
  while (attempts < maxAttempts) {
    const result = await client.callTool({
      name: 'report_task',
      arguments: {
        task_ids: [taskId],
        report_type: 'detailed',
        format: 'json'
      }
    });
    
    const content = result.content as any[];
    const response = JSON.parse(content[0].text);
    
    if (response.status !== 'success') {
      throw new Error(`Failed to get task report: ${response.message}`);
    }
    
    const task = response.result.tasks[0];
    
    log.debug(`Task progress: ${task.progress}% - Status: ${task.status}`);
    
    if (task.status === 'completed') {
      log.success('Task completed successfully!');
      
      // Display logs
      if (task.logs && task.logs.length > 0) {
        log.debug('Task execution logs:');
        task.logs.slice(-5).forEach((logEntry: string) => {
          log.debug(`  ${logEntry}`);
        });
      }
      
      return;
    }
    
    if (task.status === 'failed') {
      throw new Error(`Task failed: ${task.logs?.[task.logs.length - 1] || 'Unknown error'}`);
    }
    
    attempts++;
    await sleep(1000);
  }
  
  throw new Error('Task timeout - did not complete within 30 seconds');
}

/**
 * Verify task results and branch status
 */
async function verifyTaskResults(client: Client, taskId: string): Promise<void> {
  // Get detailed task report
  const reportResult = await client.callTool({
    name: 'report_task',
    arguments: {
      task_ids: [taskId],
      report_type: 'detailed',
      format: 'json'
    }
  });
  
  const reportContent = reportResult.content as any[];
  const reportResponse = JSON.parse(reportContent[0].text);
  const task = reportResponse.result.tasks[0];
  
  log.debug('Task verification:');
  log.debug(`  ID: ${task.id}`);
  log.debug(`  Title: ${task.title}`);
  log.debug(`  Branch: ${task.branch}`);
  log.debug(`  Status: ${task.status}`);
  log.debug(`  Progress: ${task.progress}%`);
  log.debug(`  Session: ${task.session_id}`);
  
  if (!task.branch || !task.branch.startsWith('test/e2e-')) {
    throw new Error(`Expected branch to start with test/e2e-, got: ${task.branch}`);
  }
  
  // Access task resource
  const resourceResult = await client.readResource({
    uri: `task://${taskId}`
  });
  
  const resourceContent = resourceResult.contents as any[];
  const taskResource = JSON.parse(resourceContent[0].text);
  
  log.debug('Task resource verification:');
  log.debug(`  Resource ID: ${taskResource.id}`);
  log.debug(`  Resource Branch: ${taskResource.branch}`);
  log.debug(`  Resource Status: ${taskResource.status}`);
  
  if (taskResource.branch !== task.branch) {
    throw new Error(`Branch mismatch: task says ${task.branch}, resource says ${taskResource.branch}`);
  }
}

/**
 * Check final system status
 */
async function checkFinalStatus(client: Client): Promise<void> {
  const result = await client.callTool({
    name: 'check_status',
    arguments: {
      test_sessions: false,
      verbose: false,
      include_tasks: true,
      include_sessions: true,
      include_tools: false,
      include_resources: true
    }
  });
  
  const content = result.content as any[];
  const response = JSON.parse(content[0].text);
  const statusData = response.result;
  
  log.debug('Final system status:');
  log.debug(`  Total tasks: ${statusData.tasks.total}`);
  log.debug(`  Completed tasks: ${statusData.tasks.by_status.completed}`);
  log.debug(`  Active Claude sessions: ${statusData.sessions.claude.active}`);
  log.debug(`  Total resources: ${statusData.resources.total}`);
  
  // Check for task resources
  const taskResources = statusData.resources.resources.filter((r: any) => 
    r.uri.startsWith('task://')
  );
  
  log.debug(`  Task resources: ${taskResources.length}`);
  
  if (taskResources.length === 0) {
    throw new Error('No task resources found');
  }
}

/**
 * Clean up after test
 */
async function cleanupTest(client: Client): Promise<void> {
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
  const response = JSON.parse(content[0].text);
  
  log.debug(`Cleanup: ${response.result.message}`);
}

/**
 * Main test runner
 */
export async function testClaudeCodeE2E(): Promise<void> {
  log.section('🚀 Testing Claude Code End-to-End Task Execution');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  let taskId: string | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    // Check initial status
    await runTest('Check Initial Status', async () => {
      await checkInitialStatus(client!);
    }, tracker);
    
    // Create and start Claude Code task
    await runTest('Create Claude Code Task', async () => {
      taskId = await createClaudeCodeTask(client!);
    }, tracker);
    
    if (taskId) {
      // Monitor task progress
      await runTest('Monitor Task Progress', async () => {
        await monitorTaskProgress(client!, taskId!);
      }, tracker);
      
      // Verify results
      await runTest('Verify Task Results', async () => {
        await verifyTaskResults(client!, taskId!);
      }, tracker);
    }
    
    // Check final status
    await runTest('Check Final Status', async () => {
      await checkFinalStatus(client!);
    }, tracker);
    
    // Clean up
    await runTest('Clean Up Test Data', async () => {
      await cleanupTest(client!);
    }, tracker);
    
    tracker.printSummary();
    
  } catch (error) {
    log.error(`Test suite failed: ${error instanceof Error ? error.message : String(error)}`);
    
    // Try to clean up even on failure
    if (client) {
      try {
        await cleanupTest(client);
      } catch (cleanupError) {
        log.warning('Cleanup failed after test error');
      }
    }
    
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testClaudeCodeE2E().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}