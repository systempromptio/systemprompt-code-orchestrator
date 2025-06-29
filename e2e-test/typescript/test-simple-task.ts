/**
 * Simple task test with minimal timeout
 */

import { createMCPClient, log } from './test-utils.js';

async function main() {
  const client = await createMCPClient();
  
  log.info('Creating simple task...');
  
  try {
    const result = await client.callTool({
      name: 'create_task',
      arguments: {
        title: 'Simple Test',
        tool: 'CLAUDECODE',
        instructions: 'Say hello'
      }
    });
    
    log.info('Result: ' + JSON.stringify(result, null, 2));
    
    // Get the task ID
    const content = result.content as any[];
    const taskData = JSON.parse(content[0].text);
    const taskId = taskData.result?.task_id;
    
    if (taskId) {
      // Read task
      const task = await client.readResource({ uri: `task://${taskId}` });
      const taskInfo = JSON.parse(task.contents[0].text as string);
      log.info('Task status: ' + taskInfo.status);
      log.info('Task logs: ' + JSON.stringify(taskInfo.logs));
    }
    
  } catch (error) {
    log.error('Error: ' + error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);