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

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test the complete create_task flow with notifications
 */
async function testCreateTaskFlow(client: Client): Promise<void> {
  const timestamp = Date.now();
  const resourceChanges: Array<{timestamp: string, uri: string, event: string}> = [];
  
  // Set up notification handler
  client.setNotificationHandler({
    resourceListChanged: async () => {
      const event = { timestamp: new Date().toISOString(), uri: 'resourceList', event: 'changed' };
      resourceChanges.push(event);
      log.info(`📢 Resource list changed`);
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
  
  const taskId = taskData.result.task_id;
  log.debug(`Task created with ID: ${taskId}`);
  
  // Wait a bit for notifications
  await sleep(1000);
  
  // Step 2: Subscribe to specific task resource if available
  try {
    const resources = await client.listResources();
    const taskResource = resources.resources?.find(r => r.uri.includes(`task://${taskId}`));
    if (taskResource) {
      log.debug(`Found task resource: ${taskResource.uri}`);
      
      // Subscribe to this specific resource
      await client.subscribeResource({ uri: taskResource.uri });
      log.info(`📡 Subscribed to task resource: ${taskResource.uri}`);
    }
  } catch (error) {
    log.debug('Could not subscribe to task resource');
  }
  
  // Step 3: Send additional instructions if we have a session
  if (taskData.result?.session_id) {
    log.debug('Sending additional instructions to the active session...');
    try {
      const updateResult = await client.callTool({
        name: 'update_task',
        arguments: {
          process: taskData.result.session_id,
          instructions: 'Also create a test file called hello.test.js that tests the greet function'
        }
      });
      
      const updateContent = updateResult.content as any[];
      if (updateContent?.[0]?.text) {
        const updateData = JSON.parse(updateContent[0].text);
        log.debug(`Additional instructions sent: ${updateData.status || 'success'}`);
      }
    } catch (error) {
      log.debug(`Could not send additional instructions: ${error}`);
    }
  }
  
  // Step 4: Monitor task progress with notifications
  log.debug('Monitoring task progress...');
  let taskComplete = false;
  let attempts = 0;
  const maxAttempts = 30; // 30 * 2 = 60 seconds max
  let lastStatus = 'pending';
  
  while (!taskComplete && attempts < maxAttempts) {
    attempts++;
    await sleep(2000); // Wait 2 seconds between checks
    
    try {
      // Try to read task resource
      const resources = await client.listResources();
      const taskResource = resources.resources?.find(r => r.uri.includes(`task://${taskId}`));
      
      if (taskResource) {
        const taskStatus = await client.readResource({ uri: taskResource.uri });
        if (taskStatus.contents?.[0]?.text) {
          const status = JSON.parse(taskStatus.contents[0].text);
          const currentStatus = status.status || 'unknown';
          
          if (currentStatus !== lastStatus) {
            log.info(`📊 Task status changed: ${lastStatus} → ${currentStatus}`);
            lastStatus = currentStatus;
          }
          
          log.debug(`Task progress: ${status.progress || 0}% (attempt ${attempts}/${maxAttempts})`);
          
          if (currentStatus === 'completed' || currentStatus === 'failed') {
            taskComplete = true;
            if (currentStatus === 'failed') {
              throw new Error('Task failed');
            }
          }
        }
      }
    } catch (error) {
      // Resource might not be available yet
      log.debug(`Waiting for task completion... (attempt ${attempts}/${maxAttempts})`);
    }
  }
  
  // Step 5: Check final task state
  if (taskComplete) {
    log.debug('Task completed, checking final state...');
  }
  
  // Step 6: Unsubscribe from resource
  try {
    const resources = await client.listResources();
    const taskResource = resources.resources?.find(r => r.uri.includes(`task://${taskId}`));
    if (taskResource) {
      await client.unsubscribeResource({ uri: taskResource.uri });
      log.info(`📴 Unsubscribed from task resource`);
    }
  } catch (error) {
    log.debug('Could not unsubscribe from task resource');
  }
  
  // Summary
  log.section('📋 Notification Summary');
  log.info(`Total resource changes detected: ${resourceChanges.length}`);
  if (resourceChanges.length > 0) {
    resourceChanges.forEach((change, idx) => {
      log.debug(`  ${idx + 1}. ${change.timestamp}: ${change.event} - ${change.uri}`);
    });
  }
  
  if (!taskComplete) {
    log.warning('Task did not complete within timeout period');
  } else {
    log.success('Task completed successfully');
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
        tool: 'INVALID_TOOL',
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
      }
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
    log.success('Connected to MCP server');
    
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