/**
 * @file Concurrent Claude Processes Test
 * @module test-concurrent-claude
 * 
 * @remarks
 * Tests creating and monitoring three concurrent Claude processes via MCP server
 */

import { createMCPClient, log } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log.section('🚀 Concurrent Claude Processes Test');
  
  let client: Client | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');

    // Step 1: Create three concurrent tasks
    log.section('📋 Step 1: Creating Three Concurrent Tasks');
    
    const timestamp = Date.now();
    const taskPromises = [
      {
        title: 'Fibonacci Generator',
        command: 'Create a fibonacci.js file with a function that calculates fibonacci numbers. Include tests for n=1 to 10.'
      },
      {
        title: 'Prime Checker',  
        command: 'Create a prime-checker.js file with a function that checks if a number is prime. Include tests for numbers 1-20.'
      },
      {
        title: 'Palindrome Detector',
        command: 'Create a palindrome.js file with a function that checks if a string is a palindrome. Include test cases.'
      }
    ];

    // Create all tasks concurrently
    const createPromises = taskPromises.map(async (task, index) => {
      const result = await client.callTool({
        name: 'create_task',
        arguments: {
          title: task.title,
          tool: 'CLAUDECODE',
          instructions: task.command,
          project_path: '/workspace',
          branch: `demo/concurrent-${timestamp}-task${index + 1}`,
          priority: 'high',
          start_immediately: true
        }
      });
      
      const response = JSON.parse((result.content as any[])[0].text);
      log.info(`Created task: ${task.title} (ID: ${response.result.task_id})`);
      return response.result;
    });

    const tasks = await Promise.all(createPromises);
    log.success(`Created ${tasks.length} concurrent tasks`);

    // Step 2: Monitor tasks using MCP resources
    log.section('📊 Step 2: Monitoring Task Progress');
    
    let allComplete = false;
    let attempts = 0;
    const maxAttempts = 60;
    
    while (!allComplete && attempts < maxAttempts) {
      attempts++;
      await sleep(3000); // Check every 3 seconds
      
      // Check status of all tasks via resources
      const statusPromises = tasks.map(async (task) => {
        try {
          const resource = await client.readResource({
            uri: `task://${task.task_id}`
          });
          return JSON.parse(resource.contents[0].text);
        } catch (e) {
          return null;
        }
      });
      
      const statuses = await Promise.all(statusPromises);
      
      // Display current status
      log.info(`\nCheck ${attempts}/${maxAttempts}:`);
      allComplete = true;
      
      for (let i = 0; i < statuses.length; i++) {
        const status = statuses[i];
        const task = tasks[i];
        
        if (status) {
          const icon = status.status === 'completed' ? '✓' : 
                      status.status === 'failed' ? '✗' : 
                      status.status === 'running' ? '⚡' : '○';
          
          log.info(`${icon} ${task.title}: ${status.status} (${status.progress}%)`);
          
          if (status.status !== 'completed' && status.status !== 'failed') {
            allComplete = false;
          }
        } else {
          log.warning(`? ${task.title}: Unable to get status`);
          allComplete = false;
        }
      }
    }

    // Step 3: Get final results and stats
    log.section('📈 Step 3: Final Results');
    
    // Get task outputs
    for (const task of tasks) {
      try {
        const outputResource = await client.readResource({
          uri: `task-output://${task.task_id}/stream`
        });
        const output = JSON.parse(outputResource.contents[0].text);
        log.info(`\nTask ${task.title} output messages: ${output.messages?.length || 0}`);
      } catch (e) {
        log.warning(`Could not get output for ${task.title}`);
      }
    }
    
    // Get overall stats
    const statsResult = await client.callTool({
      name: 'update_stats',
      arguments: {
        include_tasks: true,
        include_sessions: true
      }
    });
    
    const stats = JSON.parse((statsResult.content as any[])[0].text);
    log.info('\nSystem Statistics:');
    log.info(`Total tasks: ${stats.result.task_stats.total}`);
    log.info(`Completed: ${stats.result.task_stats.completed}`);
    log.info(`Failed: ${stats.result.task_stats.failed}`);
    log.info(`Active sessions: ${stats.result.session_stats.active}`);

  } catch (error) {
    log.error(`Error: ${error}`);
    console.error(error);
  } finally {
    if (client) {
      await client.close();
    }
    log.success('\nTest complete!');
  }
}

// Run the test
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});