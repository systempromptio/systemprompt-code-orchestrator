/**
 * @file Test Task Execution
 * @module test-task-execution
 * 
 * @remarks
 * Tests actual task execution with more complex instructions
 */

import { createMCPClient, log } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log.section('🚀 Testing Task Execution with Detailed Logs');
  
  let client: Client | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    const timestamp = Date.now();
    
    // Create a more complex task
    log.info('Creating task with detailed instructions...');
    const createResult = await client.callTool({
      name: 'create_task',
      arguments: {
        title: 'Create Test Module',
        tool: 'CLAUDECODE',
        instructions: `Please create a TypeScript module for calculating statistics. The module should:
1. Create a file called statistics.ts
2. Export functions for: mean, median, mode, standardDeviation
3. Include JSDoc comments for each function
4. Create a test file called statistics.test.ts with test cases
5. Add a README.md explaining how to use the module

Make sure all files are properly formatted and include error handling.`,
        branch: `feature/statistics-${timestamp}`
      }
    });
    
    const content = createResult.content as any[];
    const taskData = JSON.parse(content[0].text);
    const taskId = taskData.result.task_id;
    
    log.info(`Task created: ${taskId}`);
    log.info(`Session: ${taskData.result.session_id || 'none'}`);
    
    // Monitor task for longer
    log.info('\nMonitoring task execution...\n');
    
    let lastLogCount = 0;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes
    
    while (attempts < maxAttempts) {
      attempts++;
      await sleep(2000);
      
      try {
        const taskResource = await client.readResource({ uri: `task://${taskId}` });
        const task = JSON.parse(taskResource.contents[0].text);
        
        // Show new logs
        if (task.logs && task.logs.length > lastLogCount) {
          const newLogs = task.logs.slice(lastLogCount);
          newLogs.forEach((logLine: string) => {
            log.debug(`  📝 ${logLine}`);
          });
          lastLogCount = task.logs.length;
        }
        
        // Show status update
        if (attempts % 5 === 0 || task.status !== 'in_progress') {
          log.info(`\n📊 Status: ${task.status}, Progress: ${task.progress}%, Logs: ${task.logs?.length || 0}`);
        }
        
        if (task.status === 'completed' || task.status === 'failed') {
          log.info(`\n✅ Task ${task.status}!`);
          
          // Show all logs
          if (task.logs && task.logs.length > 0) {
            log.section('📋 Complete Task Logs');
            task.logs.forEach((logLine: string, idx: number) => {
              console.log(`${idx + 1}. ${logLine}`);
            });
          }
          
          // Try to get task output
          try {
            const outputResource = await client.readResource({ uri: `task-output://${taskId}` });
            const output = JSON.parse(outputResource.contents[0].text);
            log.section('📄 Task Output');
            log.info(`Files created: ${output.files?.length || 0}`);
            if (output.files) {
              output.files.forEach((file: any) => {
                log.info(`  - ${file.path} (${file.size} bytes)`);
              });
            }
          } catch (e) {
            log.debug('No task output available');
          }
          
          break;
        }
      } catch (error) {
        log.debug(`Waiting... (${error})`);
      }
    }
    
    // Check git status
    log.section('🌿 Git Status');
    try {
      const { execSync } = await import('child_process');
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      log.info(`Current branch: ${branch}`);
      
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status) {
        log.info('Modified files:');
        console.log(status);
      } else {
        log.info('No changes detected');
      }
    } catch (e) {
      log.error(`Git error: ${e}`);
    }
    
  } catch (error) {
    log.error(`Test failed: ${error}`);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the test
main().catch(error => {
  log.error(`Fatal error: ${error}`);
  process.exit(1);
});