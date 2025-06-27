/**
 * @file MCP Integration Test
 * @module test-mcp-integration
 * 
 * @remarks
 * Tests the MCP server integration without relying on Claude Code execution
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';


/**
 * Test MCP integration
 */
export async function testMCPIntegration() {
  log.section('🔧 Testing MCP Server Integration');
  
  const tracker = new TestTracker();
  let client: any = null;
  let taskId: string | null = null;
  const testBranch = `test-${Date.now()}`;
  
  try {
    // 1. Connect to MCP server
    await runTest('Connect to MCP Server', async () => {
      client = await createMCPClient();
      log.debug('Successfully connected to MCP server');
    }, tracker);

    // 2. List tools
    await runTest('List Tools', async () => {
      const tools = await client.listTools();
      
      if (!tools.tools || tools.tools.length === 0) {
        throw new Error('No tools available');
      }
      
      log.debug(`Found ${tools.tools.length} tools`);
      
      // Verify required tools exist
      const requiredTools = ['create_task', 'update_task', 'report_task', 'check_status'];
      for (const toolName of requiredTools) {
        const tool = tools.tools.find((t: any) => t.name === toolName);
        if (!tool) {
          throw new Error(`Required tool ${toolName} not found`);
        }
      }
    }, tracker);

    // 3. Check status
    await runTest('Check Status', async () => {
      const result = await client.callTool({
        name: 'check_status',
        arguments: {}
      });
      
      const response = JSON.parse(result.content[0].text);
      
      if (response.status !== 'success') {
        throw new Error('Status check failed');
      }
      
      log.debug(`System status: ${response.result.status}`);
      log.debug(`Claude available: ${response.result.services.claude.cli_available}`);
      log.debug(`Gemini available: ${response.result.services.gemini.cli_available}`);
    }, tracker);

    // 4. Create task (without immediate start to avoid Claude Code issues)
    await runTest('Create Task', async () => {
      const result = await client.callTool({
        name: 'create_task',
        arguments: {
          title: 'MCP Integration Test',
          description: 'Test task creation and management',
          model: 'claude',
          command: 'echo "Test task"',
          project_path: '.',
          branch: testBranch,
          priority: 'medium',
          start_immediately: false  // Don't start Claude Code
        }
      });
      
      const response = JSON.parse(result.content[0].text);
      
      if (response.status !== 'success') {
        throw new Error(`Task creation failed: ${response.message}`);
      }
      
      taskId = response.result.task_id;
      log.debug(`Task created: ${taskId}`);
      log.debug(`Branch: ${testBranch}`);
    }, tracker);

    // 5. Update task
    await runTest('Update Task', async () => {
      const result = await client.callTool({
        name: 'update_task',
        arguments: {
          task_id: taskId,
          update: {
            status: 'in_progress',
            progress: 50,
            add_log: 'Task is progressing'
          }
        }
      });
      
      const response = JSON.parse(result.content[0].text);
      
      if (response.status !== 'success') {
        throw new Error('Task update failed');
      }
      
      log.debug('Task updated successfully');
    }, tracker);

    // 6. Get task report
    await runTest('Get Task Report', async () => {
      const result = await client.callTool({
        name: 'report_task',
        arguments: {
          task_ids: [taskId],
          report_type: 'detailed'
        }
      });
      
      const response = JSON.parse(result.content[0].text);
      
      if (response.status !== 'success') {
        throw new Error('Report generation failed');
      }
      
      const task = response.result.tasks[0];
      log.debug(`Task status: ${task.status}`);
      log.debug(`Task progress: ${task.progress}%`);
      log.debug(`Task branch: ${task.branch}`);
      
      // Verify updates were applied
      if (task.progress !== 50) {
        throw new Error('Task progress not updated correctly');
      }
      
      if (!task.logs.some((log: string) => log.includes('Task is progressing'))) {
        throw new Error('Task log not added correctly');
      }
    }, tracker);

    // 7. List resources
    await runTest('List Resources', async () => {
      const resources = await client.listResources();
      
      if (!resources.resources || resources.resources.length === 0) {
        throw new Error('No resources available');
      }
      
      log.debug(`Found ${resources.resources.length} resources`);
      
      // Check for task resource
      const taskResource = resources.resources.find((r: any) => r.uri === `task://${taskId}`);
      if (!taskResource) {
        log.warning('Task resource not found in list');
      } else {
        log.debug(`Task resource found: ${taskResource.name}`);
      }
    }, tracker);

    // 8. Read task resource
    await runTest('Read Task Resource', async () => {
      const result = await client.readResource({
        uri: `task://${taskId}`
      });
      
      const taskData = JSON.parse(result.contents[0].text);
      
      log.debug(`Task from resource:`);
      log.debug(`  ID: ${taskData.id}`);
      log.debug(`  Title: ${taskData.title}`);
      log.debug(`  Status: ${taskData.status}`);
      log.debug(`  Branch: ${taskData.branch}`);
    }, tracker);

    // 9. Get statistics
    await runTest('Get Statistics', async () => {
      const result = await client.callTool({
        name: 'update_stats',
        arguments: {}
      });
      
      const response = JSON.parse(result.content[0].text);
      
      if (response.status !== 'success') {
        throw new Error('Statistics update failed');
      }
      
      log.debug('Statistics:');
      log.debug(`  Total tasks: ${response.result.tasks.total}`);
      log.debug(`  Active tasks: ${response.result.tasks.active}`);
      log.debug(`  Sessions: ${response.result.sessions.active}`);
    }, tracker);

    // 10. End task
    await runTest('End Task', async () => {
      const result = await client.callTool({
        name: 'end_task',
        arguments: {
          task_id: taskId,
          status: 'completed',
          summary: 'MCP integration test completed',
          generate_report: false
        }
      });
      
      const response = JSON.parse(result.content[0].text);
      
      if (response.status !== 'success') {
        throw new Error('Failed to end task');
      }
      
      log.debug('Task ended successfully');
    }, tracker);

    // 11. Clean state
    await runTest('Clean State', async () => {
      const result = await client.callTool({
        name: 'clean_state',
        arguments: {
          dry_run: true  // Just check what would be cleaned
        }
      });
      
      const response = JSON.parse(result.content[0].text);
      
      if (response.status !== 'success') {
        throw new Error('Clean state failed');
      }
      
      log.debug(`Would clean ${response.result.tasks_to_clean} tasks`);
      log.debug(`Would clean ${response.result.sessions_to_clean} sessions`);
    }, tracker);

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
  testMCPIntegration().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}