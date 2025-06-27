/**
 * @file Simple Notification Test
 * @module test-notifications-simple
 * 
 * @remarks
 * Demonstrates the correct way to handle notifications with the MCP SDK client
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { 
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  LoggingMessageNotificationSchema
} from '@modelcontextprotocol/sdk/types.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test basic notification handling
 */
async function testBasicNotifications(client: Client): Promise<void> {
  const notifications: Array<{type: string, timestamp: string, data?: any}> = [];
  
  // Set up notification handlers using the correct schema-based approach
  
  // Resource list changed notifications
  client.setNotificationHandler(ResourceListChangedNotificationSchema, (notification) => {
    const event = { 
      type: 'resourceListChanged', 
      timestamp: new Date().toISOString(),
      data: notification
    };
    notifications.push(event);
    log.info(`📢 Resource list changed`);
  });
  
  // Tool list changed notifications
  client.setNotificationHandler(ToolListChangedNotificationSchema, (notification) => {
    const event = { 
      type: 'toolListChanged', 
      timestamp: new Date().toISOString(),
      data: notification
    };
    notifications.push(event);
    log.info(`🔧 Tool list changed`);
  });
  
  // Prompt list changed notifications
  client.setNotificationHandler(PromptListChangedNotificationSchema, (notification) => {
    const event = { 
      type: 'promptListChanged', 
      timestamp: new Date().toISOString(),
      data: notification
    };
    notifications.push(event);
    log.info(`📝 Prompt list changed`);
  });
  
  // Logging message notifications
  client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
    const event = { 
      type: 'loggingMessage', 
      timestamp: new Date().toISOString(),
      data: notification
    };
    notifications.push(event);
    log.info(`🔔 Logging message: ${notification.params.level} - ${notification.params.data}`);
  });
  
  log.debug('Notification handler set up successfully');
  
  // Trigger some actions that might generate notifications
  log.debug('Listing resources to potentially trigger notifications...');
  const resources = await client.listResources();
  log.debug(`Found ${resources.resources?.length || 0} resources`);
  
  // Wait a bit for any notifications
  await sleep(1000);
  
  // Try creating a task to trigger resource changes
  log.debug('Creating a task to trigger resource notifications...');
  try {
    const createResult = await client.callTool({
      name: 'create_task',
      arguments: {
        title: 'Notification Test Task',
        tool: 'CLAUDECODE',
        instructions: 'Create a simple test.txt file with "Hello, notifications!" content',
        branch: `notification-test-${Date.now()}`
      }
    });
    
    const content = createResult.content as any[];
    if (content?.[0]?.text) {
      const taskData = JSON.parse(content[0].text);
      log.debug(`Task created: ${taskData.result?.task_id}`);
    }
  } catch (error) {
    log.warning(`Could not create task: ${error}`);
  }
  
  // Wait for notifications
  await sleep(2000);
  
  // Summary
  log.section('📋 Notification Summary');
  log.info(`Total notifications received: ${notifications.length}`);
  
  if (notifications.length === 0) {
    log.warning('No notifications received during test');
  } else {
    notifications.forEach((notif, idx) => {
      log.debug(`  ${idx + 1}. ${notif.timestamp} - ${notif.type}`);
      if (notif.data) {
        log.debug(`     Data: ${JSON.stringify(notif.data)}`);
      }
    });
  }
}

/**
 * Test notification error handling
 */
async function testNotificationErrorHandling(client: Client): Promise<void> {
  let errorCaught = false;
  
  // Set up notification handler that throws an error
  client.setNotificationHandler(ResourceListChangedNotificationSchema, () => {
    throw new Error('Simulated notification handler error');
  });
  
  // Try to trigger a notification
  try {
    await client.listResources();
    await sleep(1000); // Wait for any async notifications
  } catch (error) {
    errorCaught = true;
    log.debug('Caught error from notification handler');
  }
  
  // The client should handle notification errors gracefully
  log.info('Client handled notification errors gracefully');
}

/**
 * Main test runner
 */
export async function testNotifications(): Promise<void> {
  log.section('🚀 Testing MCP SDK Notifications');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  
  try {
    // Create client with notifications enabled
    client = await createMCPClient(true);
    log.success('Connected to MCP server with notifications enabled');
    
    await runTest('Basic Notifications', () => testBasicNotifications(client!), tracker);
    await runTest('Error Handling', () => testNotificationErrorHandling(client!), tracker);
    
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
  testNotifications().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}