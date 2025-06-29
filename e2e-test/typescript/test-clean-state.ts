#!/usr/bin/env npx tsx

/**
 * End-to-end test for clean-state functionality
 * Tests creating a task, listing resources, and deleting with clean-state tool
 */

import { createMCPClient, log } from './test-utils.js';

async function runTest() {
  log.section('Clean State E2E Test');
  
  const client = await createMCPClient();

  try {
    // List available tools
    const tools = await client.listTools();
    log.info(`Available tools: ${tools.tools.length}`);
    
    // Print all tool names
    tools.tools.forEach(tool => {
      log.debug(`Tool: ${tool.name}`);
    });
    
    // Check that required tools exist
    const requiredTools = ['create_task', 'clean_state'];
    const toolNames = tools.tools.map(t => t.name);
    
    for (const toolName of requiredTools) {
      if (!toolNames.includes(toolName)) {
        throw new Error(`Required tool ${toolName} not found`);
      }
    }
    log.success('All required tools found');

    // Step 1: Create a test task
    log.section('Step 1: Creating test task');
    const createResult = await client.callTool({
      name: 'create_task',
      arguments: {
        title: 'Test Task for Clean State',
        tool: 'CLAUDECODE',
        instructions: 'echo "This is a test task"',
        branch: `test-clean-state-${Date.now()}`
      }
    });

    const content = (createResult as any).content;
    if (!content || !Array.isArray(content) || content.length === 0 || !content[0].text) {
      throw new Error('Failed to create task');
    }

    const createResponse = JSON.parse(content[0].text);
    const taskId = createResponse.result?.task?.id;
    
    if (!taskId) {
      throw new Error('No task ID returned from create_task');
    }
    
    log.success(`Created task with ID: ${taskId}`);

    // Step 2: List resources to verify task exists
    log.section('Step 2: Listing resources');
    const resources = await client.listResources();
    
    const taskResource = resources.resources.find(r => r.uri === `task://${taskId}`);
    if (!taskResource) {
      throw new Error('Created task not found in resources');
    }
    
    log.success(`Task found in resources: ${taskResource.name}`);
    log.info(`URI: ${taskResource.uri}`);
    log.info(`Description: ${taskResource.description}`);

    // Step 3: Delete the specific task using clean-state
    log.section('Step 3: Deleting specific task with clean-state');
    const deleteResult = await client.callTool({
      name: 'clean_state',
      arguments: {
        task_id: taskId
      }
    });

    const deleteContent = (deleteResult as any).content;
    if (!deleteContent || !Array.isArray(deleteContent) || deleteContent.length === 0 || !deleteContent[0].text) {
      throw new Error('Failed to delete task');
    }

    const deleteResponse = JSON.parse(deleteContent[0].text);
    log.success(`Clean state response: ${deleteResponse.message}`);

    // Step 4: Verify task is deleted
    log.section('Step 4: Verifying task is deleted');
    const resourcesAfter = await client.listResources();
    
    const taskStillExists = resourcesAfter.resources.find(r => r.uri === `task://${taskId}`);
    if (taskStillExists) {
      throw new Error('Task still exists after deletion!');
    }
    
    log.success('Task successfully deleted from resources');

    // Step 5: Create multiple tasks and delete all
    log.section('Step 5: Testing delete all functionality');
    
    // Create 3 test tasks
    const taskIds = [];
    for (let i = 1; i <= 3; i++) {
      const result = await client.callTool({
        name: 'create_task',
        arguments: {
          title: `Bulk Test Task ${i}`,
          tool: 'CLAUDECODE',
          instructions: `echo "Bulk test ${i}"`,
          branch: `test-bulk-${Date.now()}-${i}`
        }
      });
      
      const resultContent = (result as any).content;
      if (!resultContent || !Array.isArray(resultContent) || resultContent.length === 0 || !resultContent[0].text) {
        throw new Error(`Failed to create task ${i}`);
      }
      const response = JSON.parse(resultContent[0].text);
      taskIds.push(response.result?.task?.id);
      log.info(`Created task ${i}: ${response.result?.task?.id}`);
    }

    // Delete all tasks
    log.info('Deleting all tasks...');
    const deleteAllResult = await client.callTool({
      name: 'clean_state',
      arguments: {} // Empty arguments = delete all
    });

    const deleteAllContent = (deleteAllResult as any).content;
    if (!deleteAllContent || !Array.isArray(deleteAllContent) || deleteAllContent.length === 0 || !deleteAllContent[0].text) {
      throw new Error('Failed to delete all tasks');
    }
    const deleteAllResponse = JSON.parse(deleteAllContent[0].text);
    log.success(deleteAllResponse.message);
    
    // Verify all tasks are gone
    const finalResources = await client.listResources();
    const remainingTasks = finalResources.resources.filter(r => r.uri.startsWith('task://'));
    
    if (remainingTasks.length > 0) {
      throw new Error(`${remainingTasks.length} tasks still remain after delete all!`);
    }
    
    log.success('All tasks successfully deleted');
    
    log.section('All tests passed!');

  } catch (error) {
    log.error(`Test failed: ${error}`);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});