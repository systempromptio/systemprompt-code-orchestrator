/**
 * @file Simple E2E Test for create_task Flow
 * @module test-e2e-simple
 * 
 * @remarks
 * Simplified test to debug the create_task flow
 */

import { createMCPClient, log } from './test-utils.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simple test of create_task
 */
async function testSimpleCreateTask(): Promise<void> {
  const client = await createMCPClient(true);
  log.success('Connected to MCP server');
  
  try {
    // Create a simple task
    const timestamp = Date.now();
    const branchName = `test-simple-${timestamp}`;
    
    log.info('Creating task...');
    const result = await client.callTool({
      name: 'create_task',
      arguments: {
        title: 'Simple Test',
        tool: 'CLAUDECODE',
        instructions: 'Create a file called test.txt with the content "Hello World"',
        branch: branchName
      }
    });
    
    const content = result.content as any[];
    const taskData = JSON.parse(content[0].text as string);
    
    log.success(`Task created: ${taskData.result.task_id}`);
    log.info(`Status: ${taskData.result.status}`);
    
    // Wait a bit for task to complete
    await sleep(15000);
    
    // Read final task state
    const taskUri = `task://${taskData.result.task_id}`;
    const finalStatus = await client.readResource({ uri: taskUri });
    
    if (finalStatus.contents?.[0]?.text) {
      const final = JSON.parse(finalStatus.contents[0].text as string);
      log.info(`Final Status: ${final.status}`);
      
      // Show logs
      if (final.logs) {
        log.section('Task Logs:');
        final.logs.forEach((logLine: string) => {
          console.log(logLine);
        });
      }
    }
    
    // End the task
    await client.callTool({
      name: 'end_task',
      arguments: {
        task_id: taskData.result.task_id
      }
    });
    
    log.success('Test completed');
    
  } catch (error) {
    log.error(`Test failed: ${error}`);
  } finally {
    await client.close();
  }
}

// Run the test
testSimpleCreateTask().catch(error => {
  log.error(`Fatal error: ${error}`);
  process.exit(1);
});