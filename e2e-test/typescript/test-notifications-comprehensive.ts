/**
 * @file Comprehensive MCP SDK Notifications Test
 * @module test-notifications-comprehensive
 * 
 * @remarks
 * Complete guide for using notifications with the MCP SDK client
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { 
  // Resource-related notifications
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
  
  // Tool-related notifications
  ToolListChangedNotificationSchema,
  
  // Prompt-related notifications
  PromptListChangedNotificationSchema,
  
  // Progress notifications
  ProgressNotificationSchema,
  
  // Logging notifications
  LoggingMessageNotificationSchema,
  
  // Root list notifications
  RootsListChangedNotificationSchema,
  
  // Cancellation notifications
  CancelledNotificationSchema,
  
  // Server initialized notification
  InitializedNotificationSchema
} from '@modelcontextprotocol/sdk/types.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test all available notification types
 */
async function testAllNotificationTypes(client: Client): Promise<void> {
  const notifications: Array<{type: string, timestamp: string, data?: any}> = [];
  
  log.section('Setting up all notification handlers');
  
  // 1. Resource List Changed - fired when resources are added/removed
  client.setNotificationHandler(ResourceListChangedNotificationSchema, (notification) => {
    const event = { 
      type: 'resourceListChanged', 
      timestamp: new Date().toISOString(),
      data: notification
    };
    notifications.push(event);
    log.info(`📢 Resource list changed`);
  });
  
  // 2. Resource Updated - fired when a specific resource's content changes
  client.setNotificationHandler(ResourceUpdatedNotificationSchema, (notification) => {
    const event = { 
      type: 'resourceUpdated', 
      timestamp: new Date().toISOString(),
      data: notification
    };
    notifications.push(event);
    log.info(`📝 Resource updated: ${notification.params.uri}`);
  });
  
  // 3. Tool List Changed - fired when tools are added/removed
  client.setNotificationHandler(ToolListChangedNotificationSchema, (notification) => {
    const event = { 
      type: 'toolListChanged', 
      timestamp: new Date().toISOString(),
      data: notification
    };
    notifications.push(event);
    log.info(`🔧 Tool list changed`);
  });
  
  // 4. Prompt List Changed - fired when prompts are added/removed
  client.setNotificationHandler(PromptListChangedNotificationSchema, (notification) => {
    const event = { 
      type: 'promptListChanged', 
      timestamp: new Date().toISOString(),
      data: notification
    };
    notifications.push(event);
    log.info(`💡 Prompt list changed`);
  });
  
  // 5. Progress Notification - fired to report progress on long-running operations
  client.setNotificationHandler(ProgressNotificationSchema, (notification) => {
    const event = { 
      type: 'progress', 
      timestamp: new Date().toISOString(),
      data: notification
    };
    notifications.push(event);
    const progress = notification.params.progress;
    const total = notification.params.total;
    const pct = total ? Math.round((progress / total) * 100) : 0;
    log.info(`📊 Progress: ${pct}% (${progress}/${total || '?'})`);
  });
  
  // 6. Logging Message - fired when server sends log messages
  client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
    const event = { 
      type: 'loggingMessage', 
      timestamp: new Date().toISOString(),
      data: notification
    };
    notifications.push(event);
    log.info(`🔔 [${notification.params.level}] ${notification.params.data}`);
  });
  
  // 7. Roots List Changed - fired when root directories change
  client.setNotificationHandler(RootsListChangedNotificationSchema, (notification) => {
    const event = { 
      type: 'rootsListChanged', 
      timestamp: new Date().toISOString(),
      data: notification
    };
    notifications.push(event);
    log.info(`📁 Roots list changed`);
  });
  
  // 8. Cancelled Notification - fired when an operation is cancelled
  client.setNotificationHandler(CancelledNotificationSchema, (notification) => {
    const event = { 
      type: 'cancelled', 
      timestamp: new Date().toISOString(),
      data: notification
    };
    notifications.push(event);
    log.info(`❌ Operation cancelled: ${notification.params.requestId}`);
  });
  
  // 9. Initialized Notification - fired when server completes initialization
  client.setNotificationHandler(InitializedNotificationSchema, (notification) => {
    const event = { 
      type: 'initialized', 
      timestamp: new Date().toISOString(),
      data: notification
    };
    notifications.push(event);
    log.info(`✅ Server initialized`);
  });
  
  log.debug('All notification handlers set up successfully');
  
  // Trigger various actions to generate notifications
  log.section('Triggering actions to generate notifications');
  
  // List resources
  const resources = await client.listResources();
  log.debug(`Listed ${resources.resources?.length || 0} resources`);
  
  // Create a task to trigger notifications
  try {
    const createResult = await client.callTool({
      name: 'create_task',
      arguments: {
        title: 'Comprehensive Notification Test',
        tool: 'CLAUDECODE',
        instructions: 'Create a file test-notifications.txt with "Testing all notifications" content',
        branch: `notification-test-${Date.now()}`
      }
    });
    
    const content = createResult.content as any[];
    if (content?.[0]?.text) {
      const taskData = JSON.parse(content[0].text);
      log.debug(`Task created: ${taskData.result?.task_id}`);
      
      // Wait for task to complete and generate notifications
      await sleep(3000);
    }
  } catch (error) {
    log.warning(`Could not create task: ${error}`);
  }
  
  // Wait for any remaining notifications
  await sleep(1000);
  
  // Summary
  log.section('📋 Comprehensive Notification Summary');
  log.info(`Total notifications received: ${notifications.length}`);
  
  // Group notifications by type
  const notificationsByType = notifications.reduce((acc, notif) => {
    acc[notif.type] = (acc[notif.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  log.info('Notifications by type:');
  Object.entries(notificationsByType).forEach(([type, count]) => {
    log.debug(`  - ${type}: ${count}`);
  });
  
  if (notifications.length > 0) {
    log.info('\nDetailed notification log:');
    notifications.forEach((notif, idx) => {
      log.debug(`  ${idx + 1}. [${notif.timestamp}] ${notif.type}`);
      if (notif.data?.params) {
        log.debug(`     Params: ${JSON.stringify(notif.data.params)}`);
      }
    });
  }
}

/**
 * Test notification subscription patterns
 */
async function testSubscriptionPatterns(client: Client): Promise<void> {
  const notifications: string[] = [];
  
  // Handler 1
  const handler1 = (_notification: any) => {
    notifications.push('handler1');
    log.debug('Handler 1 called');
  };
  
  // Handler 2 (will replace handler 1)
  const handler2 = (_notification: any) => {
    notifications.push('handler2');
    log.debug('Handler 2 called');
  };
  
  // Set first handler
  client.setNotificationHandler(ResourceListChangedNotificationSchema, handler1);
  
  // Trigger a notification
  await client.listResources();
  await sleep(500);
  
  // Replace with second handler (previous one is overwritten)
  client.setNotificationHandler(ResourceListChangedNotificationSchema, handler2);
  
  // Trigger another notification
  await client.listResources();
  await sleep(500);
  
  log.info(`Notifications received: ${notifications.join(', ')}`);
  log.info('Note: Setting a new handler replaces the previous one');
}

/**
 * Test resource subscription for specific updates
 */
async function testResourceSubscription(client: Client): Promise<void> {
  const updates: string[] = [];
  
  // Set up handler for resource updates
  client.setNotificationHandler(ResourceUpdatedNotificationSchema, (notification) => {
    updates.push(notification.params.uri);
    log.info(`📝 Resource updated: ${notification.params.uri}`);
  });
  
  // Try to subscribe to specific resources if available
  try {
    const resources = await client.listResources();
    const statusResource = resources.resources?.find(r => r.uri === 'agent://status');
    
    if (statusResource) {
      // Subscribe to the status resource
      await client.subscribeResource({ uri: statusResource.uri });
      log.info(`📡 Subscribed to: ${statusResource.uri}`);
      
      // Wait for any updates
      await sleep(2000);
      
      // Unsubscribe
      await client.unsubscribeResource({ uri: statusResource.uri });
      log.info(`📴 Unsubscribed from: ${statusResource.uri}`);
    }
  } catch (error) {
    log.debug(`Resource subscription not supported or failed: ${error}`);
  }
  
  log.info(`Total resource updates received: ${updates.length}`);
}

/**
 * Main test runner
 */
export async function testNotificationsComprehensive(): Promise<void> {
  log.section('🚀 Comprehensive MCP SDK Notifications Test');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  
  try {
    // Create client with notifications enabled
    client = await createMCPClient(true);
    log.success('Connected to MCP server with notifications enabled');
    
    await runTest('All Notification Types', () => testAllNotificationTypes(client!), tracker);
    await runTest('Subscription Patterns', () => testSubscriptionPatterns(client!), tracker);
    await runTest('Resource Subscription', () => testResourceSubscription(client!), tracker);
    
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
  testNotificationsComprehensive().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}