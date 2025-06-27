/**
 * @file Single Claude Process Test
 * @module test-single-claude
 * 
 * @remarks
 * Tests creating a single Claude process via MCP server
 */

import { createMCPClient, log } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function main() {
  log.section('🚀 Single Claude Process Test');
  
  let client: Client | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');

    // List available tools first
    log.info('Listing available tools...');
    const tools = await client.listTools();
    const createTaskTool = tools.tools.find(t => t.name === 'create_task');
    if (createTaskTool) {
      log.info('create_task tool schema:');
      console.log(JSON.stringify(createTaskTool, null, 2));
    }

    // Create a single task
    log.section('📋 Creating Single Task');
    
    const timestamp = Date.now();
    
    log.info('Calling create_task with following arguments:');
    const taskArgs = {
      title: 'Test Task',
      tool: 'CLAUDECODE',
      instructions: 'Create a simple hello.js file that prints "Hello from Claude!"',
      branch: `demo/single-${timestamp}`
    };
    console.log(JSON.stringify(taskArgs, null, 2));
    
    const result = await client.callTool({
      name: 'create_task',
      arguments: taskArgs
    });
    
    const response = JSON.parse((result.content as any[])[0].text);
    log.success(`Task created with ID: ${response.result.task_id}`);
    console.log('Full response:', JSON.stringify(response, null, 2));

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