/**
 * @file MCP Concurrent Operations Test
 * @module test-concurrent
 * 
 * @remarks
 * Tests concurrent operations and session management
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Test concurrent tool calls
 */
async function testConcurrentTools(client: Client): Promise<void> {
  // Create multiple tasks concurrently
  const taskPromises = Array.from({ length: 3 }, (_, i) => 
    client.callTool({
      name: 'create_task',
      arguments: {
        title: `Concurrent Task ${i + 1}`,
        description: `Testing concurrent task creation ${i + 1}`,
        model: i % 2 === 0 ? 'claude' : 'gemini',
        command: `echo "Task ${i + 1} running"`,
        project_path: `/tmp/concurrent-test-${i + 1}`,
        priority: 'low',
        start_immediately: false
      }
    })
  );
  
  const results = await Promise.all(taskPromises);
  
  // Verify all tasks were created
  const taskIds: string[] = [];
  for (const result of results) {
    const content = result.content as any[];
    const taskData = JSON.parse(content[0].text);
    if (!taskData.task_id) {
      throw new Error('Concurrent task creation failed - missing task_id');
    }
    taskIds.push(taskData.task_id);
  }
  
  log.debug(`Created ${taskIds.length} tasks concurrently`);
  
  // Clean up
  await Promise.all(taskIds.map(id => 
    client.callTool({
      name: 'end_task',
      arguments: {
        task_id: id,
        status: 'cancelled',
        summary: 'Cleaned up after concurrent test'
      }
    })
  ));
}

/**
 * Test concurrent resource reads
 */
async function testConcurrentResources(client: Client): Promise<void> {
  // Read multiple resources concurrently
  const resourcePromises = [
    client.readResource({ uri: 'agent://status' }),
    client.readResource({ uri: 'agent://tasks' }),
    client.readResource({ uri: 'agent://sessions' })
  ];
  
  const results = await Promise.all(resourcePromises);
  
  // Verify all resources were read successfully
  for (const result of results) {
    if (!result.contents || result.contents.length === 0) {
      throw new Error('Concurrent resource read failed');
    }
  }
  
  log.debug('Successfully read 3 resources concurrently');
}

/**
 * Test mixed concurrent operations
 */
async function testMixedConcurrent(client: Client): Promise<void> {
  // Mix of different operations
  const operations = Promise.all([
    // Create a task
    client.callTool({
      name: 'create_task',
      arguments: {
        title: 'Mixed Operation Task',
        description: 'Part of mixed concurrent test',
        model: 'claude',
        command: 'echo "Mixed test"',
        project_path: '/tmp/mixed-test',
        priority: 'medium',
        start_immediately: false
      }
    }),
    // Get stats
    client.callTool({
      name: 'update_stats',
      arguments: {
        include_tasks: true,
        include_sessions: true
      }
    }),
    // Read status resource
    client.readResource({ uri: 'agent://status' }),
    // List tools
    client.listTools(),
    // List prompts
    client.listPrompts()
  ]);
  
  const results = await operations;
  
  // Extract task ID for cleanup
  const createResult = results[0] as any;
  const taskId = JSON.parse(createResult.content[0].text).task_id;
  
  // Verify all operations completed
  if (results.length !== 5) {
    throw new Error('Not all concurrent operations completed');
  }
  
  log.debug('Successfully completed 5 mixed concurrent operations');
  
  // Clean up
  await client.callTool({
    name: 'end_task',
    arguments: {
      task_id: taskId,
      status: 'cancelled',
      summary: 'Cleaned up after mixed concurrent test'
    }
  });
}

/**
 * Test rate limiting behavior
 */
async function testRateLimiting(client: Client): Promise<void> {
  // Send many requests rapidly to test rate limiting
  const requests = Array.from({ length: 20 }, () => 
    client.callTool({
      name: 'update_stats',
      arguments: {
        include_tasks: true,
        include_sessions: false
      }
    }).catch(error => ({ error }))
  );
  
  const results = await Promise.all(requests);
  
  // Count successful vs rate-limited requests
  const successful = results.filter(r => !('error' in r)).length;
  const rateLimited = results.filter(r => 'error' in r).length;
  
  log.debug(`Rate limiting test: ${successful} successful, ${rateLimited} rate-limited`);
  
  // We expect at least some to succeed
  if (successful === 0) {
    throw new Error('All requests were rate-limited');
  }
}

/**
 * Main test runner
 */
export async function testConcurrent(): Promise<void> {
  log.section('🔄 Testing Concurrent Operations');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    await runTest('Concurrent Tools', () => testConcurrentTools(client!), tracker);
    await runTest('Concurrent Resources', () => testConcurrentResources(client!), tracker);
    await runTest('Mixed Concurrent', () => testMixedConcurrent(client!), tracker);
    await runTest('Rate Limiting', () => testRateLimiting(client!), tracker);
    
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
  testConcurrent().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}