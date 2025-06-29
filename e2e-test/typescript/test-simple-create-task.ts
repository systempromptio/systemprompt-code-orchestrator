#!/usr/bin/env tsx

/**
 * Simple test for create_task functionality
 */

import { createMCPClient, log } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function testSimpleCreateTask(client: Client): Promise<void> {
  const timestamp = Date.now();
  const branchName = `test-simple-${timestamp}`;
  
  log.info('Creating a simple task...');
  
  try {
    const result = await client.callTool({
      name: 'create_task',
      arguments: {
        title: 'Simple Test Task',
        tool: 'CLAUDECODE',
        instructions: 'Create a file called test.txt with content "Hello World"',
        branch: branchName
      }
    });
    
    const content = result.content as any[];
    if (!content?.[0]?.text) {
      throw new Error('Invalid response format');
    }
    
    const taskData = JSON.parse(content[0].text as string);
    log.success(`Task created: ${taskData.result?.task_id}`);
    log.info(`Status: ${taskData.result?.status}`);
    log.info(`Branch: ${taskData.result?.branch}`);
    log.info(`Session: ${taskData.result?.session_id}`);
    
    // Wait a bit for task to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check task status
    if (taskData.result?.task_id) {
      log.info('Checking task status...');
      const statusResult = await client.callTool({
        name: 'check_status',
        arguments: {
          process: taskData.result.session_id || taskData.result.task_id
        }
      });
      
      const statusContent = statusResult.content as any[];
      if (statusContent?.[0]?.text) {
        const statusData = JSON.parse(statusContent[0].text as string);
        log.info(`Task status: ${JSON.stringify(statusData, null, 2)}`);
      }
    }
    
  } catch (error) {
    log.error(`Create task failed: ${error}`);
    throw error;
  }
}

async function main() {
  log.section('🚀 Simple Create Task Test');
  
  let client: Client | null = null;
  
  try {
    client = await createMCPClient(true);
    log.success('Connected to MCP server');
    
    await testSimpleCreateTask(client);
    
    log.success('Test completed successfully!');
    
  } catch (error) {
    log.error(`Test failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

main();