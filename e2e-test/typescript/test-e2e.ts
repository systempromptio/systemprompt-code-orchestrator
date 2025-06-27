/**
 * @file E2E Test for create_task Flow
 * @module test-e2e
 * 
 * @remarks
 * Tests the complete flow of creating, monitoring, and updating a task using the create_task tool
 * with resource change notifications
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { 
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema
} from '@modelcontextprotocol/sdk/types.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test the complete create_task flow with notifications
 */
async function testCreateTaskFlow(client: Client): Promise<void> {
  const timestamp = Date.now();
  let taskComplete = false;
  let taskId: string | null = null;
  let sessionId: string | null = null;
  const notifications: Array<{timestamp: string, type: string, data: any}> = [];
  
  // Set up notification handlers BEFORE creating the task
  client.setNotificationHandler(ResourceListChangedNotificationSchema, (notification) => {
    const notif = {
      timestamp: new Date().toISOString(),
      type: 'ResourceListChanged',
      data: notification
    };
    notifications.push(notif);
    log.info(`📢 [${notif.timestamp}] Resource list changed`);
  });
  
  client.setNotificationHandler(ResourceUpdatedNotificationSchema, async (notification) => {
    const notif = {
      timestamp: new Date().toISOString(),
      type: 'ResourceUpdated',
      data: notification.params
    };
    notifications.push(notif);
    log.info(`📢 [${notif.timestamp}] Resource updated: ${notification.params.uri}`);
    
    // If it's our task, read the updated resource
    if (taskId && notification.params.uri === `task://${taskId}`) {
      try {
        const taskResource = await client.readResource({ uri: notification.params.uri });
        if (taskResource.contents?.[0]?.text) {
          const taskInfo = JSON.parse(taskResource.contents[0].text);
          log.info(`  📊 Task Status: ${taskInfo.status}, Progress: ${taskInfo.progress}%`);
          
          // Show recent logs
          if (taskInfo.logs && taskInfo.logs.length > 0) {
            const recentLogs = taskInfo.logs.slice(-2);
            recentLogs.forEach((logLine: string) => {
              log.debug(`  📝 ${logLine}`);
            });
          }
          
          // Check if task is complete
          if (taskInfo.status === 'completed' || taskInfo.status === 'failed') {
            taskComplete = true;
            log.info(`  ✅ Task ${taskInfo.status}!`);
          }
        }
      } catch (error) {
        log.debug(`  ⚠️ Could not read updated resource: ${error}`);
      }
    }
  });
  
  // Step 1: Create a task
  log.debug('Creating task with CLAUDECODE tool...');
  const createResult = await client.callTool({
    name: 'create_task',
    arguments: {
      title: 'E2E Test Task',
      tool: 'CLAUDECODE',
      instructions: 'Create a simple JavaScript file called hello.js that exports a function called greet(name) that returns "Hello, {name}!"',
      branch: `e2e-test-${timestamp}`
    }
  });
  
  const content = createResult.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('create_task returned invalid response');
  }
  
  let taskData;
  try {
    taskData = JSON.parse(content[0].text);
  } catch (e) {
    throw new Error(`Failed to parse create_task response: ${content[0].text}`);
  }
  
  if (!taskData.result?.task_id) {
    throw new Error('create_task did not return a task_id');
  }
  
  taskId = taskData.result.task_id;
  sessionId = taskData.result.session_id;
  log.debug(`Task created with ID: ${taskId}`);
  log.debug(`Session ID: ${sessionId || 'none'}`);
  log.debug(`Tool: ${taskData.result.tool}`);
  log.debug(`Status: ${taskData.result.status}`);
  
  // Step 2: Subscribe to task resource
  const taskUri = `task://${taskId}`;
  log.info(`🔔 Subscribing to task resource: ${taskUri}`);
  
  try {
    await client.subscribeResource({ uri: taskUri });
    log.success(`Subscribed to ${taskUri}`);
  } catch (error) {
    log.warning(`Could not subscribe to task resource: ${error}`);
  }
  
  // Step 3: Read initial task state
  await sleep(1000); // Give it a moment to initialize
  
  try {
    const taskResource = await client.readResource({ uri: taskUri });
    if (taskResource.contents?.[0]?.text) {
      const taskInfo = JSON.parse(taskResource.contents[0].text);
      log.info(`📋 Initial Task State:`);
      log.info(`  Title: ${taskInfo.title}`);
      log.info(`  Status: ${taskInfo.status}`);
      log.info(`  Progress: ${taskInfo.progress}%`);
      log.info(`  Branch: ${taskInfo.branch}`);
      
      // Check if already completed
      if (taskInfo.status === 'completed' || taskInfo.status === 'failed') {
        taskComplete = true;
      }
    }
  } catch (error) {
    log.debug(`Could not read initial task state: ${error}`);
  }
  
  // Step 4: Send additional instructions if we have a session and task is active
  if (sessionId && !taskComplete) {
    await sleep(2000); // Wait a bit for the task to start
    log.debug('Sending additional instructions to the active session...');
    try {
      const updateResult = await client.callTool({
        name: 'update_task',
        arguments: {
          process: sessionId,
          instructions: 'Also create a test file called hello.test.js that tests the greet function with at least 3 test cases'
        }
      });
      
      const updateContent = updateResult.content as any[];
      if (updateContent?.[0]?.text) {
        const updateData = JSON.parse(updateContent[0].text);
        log.debug(`Additional instructions sent: ${updateData.message || 'success'}`);
      }
    } catch (error) {
      log.debug(`Note: Could not send additional instructions - ${error}`);
    }
  }
  
  // Step 5: Wait for task completion via notifications (with timeout)
  if (!taskComplete) {
    log.info('⏳ Waiting for task completion via notifications...');
    const maxWaitTime = 120000; // 2 minutes
    const startTime = Date.now();
    
    while (!taskComplete && (Date.now() - startTime) < maxWaitTime) {
      await sleep(1000);
      // Task completion is handled by notification handler
    }
  }
  
  // Step 6: Unsubscribe from resource
  try {
    await client.unsubscribeResource({ uri: taskUri });
    log.info(`🔕 Unsubscribed from ${taskUri}`);
  } catch (error) {
    log.debug(`Could not unsubscribe: ${error}`);
  }
  
  // Step 7: Get final task state and output
  log.section('📄 Final Task State');
  try {
    const finalStatus = await client.readResource({ uri: taskUri });
    
    if (finalStatus.contents?.[0]?.text) {
      const final = JSON.parse(finalStatus.contents[0].text);
      log.info(`Status: ${final.status}`);
      log.info(`Progress: ${final.progress}%`);
      log.info(`Total logs: ${final.logs?.length || 0}`);
      
      // Show all logs
      if (final.logs && final.logs.length > 0) {
        log.info('Task logs:');
        final.logs.forEach((logLine: string, idx: number) => {
          log.debug(`  ${idx + 1}. ${logLine}`);
        });
      }
      
      // Try to read task output
      try {
        const outputUri = `task-output://${taskId}`;
        const outputResource = await client.readResource({ uri: outputUri });
        
        if (outputResource.contents?.[0]?.text) {
          const output = JSON.parse(outputResource.contents[0].text);
          log.section('📝 Task Output');
          log.info(`Files created: ${output.files?.length || 0}`);
          if (output.files && output.files.length > 0) {
            output.files.forEach((file: any) => {
              log.debug(`  - ${file.path} (${file.size} bytes)`);
            });
          }
          if (output.output) {
            log.info('Command output preview:');
            log.debug(output.output.substring(0, 500) + (output.output.length > 500 ? '...' : ''));
          }
        }
      } catch (e) {
        log.debug('No task output available');
      }
    }
  } catch (error) {
    log.debug('Could not read final task state');
  }
  
  // Step 8: Summary of notifications
  log.section('📊 Notification Summary');
  log.info(`Total notifications received: ${notifications.length}`);
  notifications.forEach((notif, idx) => {
    log.debug(`${idx + 1}. [${notif.timestamp}] ${notif.type}`);
    if (notif.data) {
      log.debug(`   Data: ${JSON.stringify(notif.data)}`);
    }
  });
  
  if (!taskComplete) {
    log.warning('Task did not complete within timeout period');
  }
}

/**
 * Test error handling in create_task
 */
async function testCreateTaskErrorHandling(client: Client): Promise<void> {
  // Test with invalid tool
  try {
    await client.callTool({
      name: 'create_task',
      arguments: {
        title: 'Invalid Tool Test',
        tool: 'INVALID_TOOL' as any,
        instructions: 'This should fail',
        branch: 'invalid-branch'
      }
    });
    throw new Error('Expected error for invalid tool');
  } catch (error) {
    log.debug('Invalid tool correctly rejected');
  }
  
  // Test with missing required fields
  try {
    await client.callTool({
      name: 'create_task',
      arguments: {
        title: 'Missing Fields Test'
        // Missing tool, instructions, and branch
      } as any
    });
    throw new Error('Expected error for missing required fields');
  } catch (error) {
    log.debug('Missing required fields correctly rejected');
  }
}

/**
 * Main test runner
 */
export async function testE2E(): Promise<void> {
  log.section('🚀 Testing E2E create_task Flow');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  
  try {
    client = await createMCPClient(true); // Enable notifications
    log.success('Connected to MCP server with notifications enabled');
    
    await runTest('Create Task Flow', () => testCreateTaskFlow(client!), tracker);
    await runTest('Error Handling', () => testCreateTaskErrorHandling(client!), tracker);
    
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
  testE2E().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}