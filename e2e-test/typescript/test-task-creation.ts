/**
 * @file Automated Task Creation Test
 * @module test-task-creation
 * 
 * @remarks
 * Tests task creation with predefined inputs
 */

import { createMCPClient, log } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { TestReporter } from './test-reporter.js';
import * as path from 'path';
import { 
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema
} from '@modelcontextprotocol/sdk/types.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface TaskConfig {
  title: string;
  instructions: string;
  tool: 'CLAUDECODE' | 'GEMINICLI';
}

/**
 * Run a predefined task
 */
async function runPredefinedTask(client: Client, reporter: TestReporter, config: TaskConfig): Promise<boolean> {
  const timestamp = Date.now();
  let taskComplete = false;
  let taskId: string | null = null;
  let sessionId: string | null = null;
  const notifications: Array<{timestamp: string, type: string, data: any}> = [];
  
  console.log('\n' + '='.repeat(80));
  console.log(`🚀 Running Task: ${config.title}`);
  console.log('='.repeat(80));
  console.log(`Tool: ${config.tool}`);
  console.log(`Instructions: ${config.instructions}`);
  console.log('='.repeat(80) + '\n');
  
  // Define test parameters
  const testName = config.title;
  const branchName = `automated-${timestamp}`;
  
  // Set up notification handlers
  client.setNotificationHandler(ResourceListChangedNotificationSchema, (notification) => {
    const notif = {
      timestamp: new Date().toISOString(),
      type: 'ResourceListChanged',
      data: notification
    };
    notifications.push(notif);
    
    if (taskId) {
      reporter.addNotification(taskId, 'ResourceListChanged', notification);
    }
  });
  
  client.setNotificationHandler(ResourceUpdatedNotificationSchema, async (notification) => {
    const notif = {
      timestamp: new Date().toISOString(),
      type: 'ResourceUpdated',
      data: notification.params
    };
    notifications.push(notif);
    
    if (taskId) {
      reporter.addNotification(taskId, 'ResourceUpdated', notification.params);
    }
    
    // If it's our task, read the updated resource
    if (taskId && notification.params.uri === `task://${taskId}`) {
      try {
        const taskResource = await client.readResource({ uri: notification.params.uri });
        if (taskResource.contents?.[0]?.text) {
          const taskInfo = JSON.parse(taskResource.contents[0].text as string);
          
          // Update progress
          const statusSymbol = taskInfo.status === 'completed' ? '✅' : 
                              taskInfo.status === 'failed' ? '❌' : '⏳';
          process.stdout.write(`\r${statusSymbol} Status: ${taskInfo.status} | Progress: ${taskInfo.progress || 0}%`);
          
          if (taskId) {
            reporter.addLog(taskId, `Task Status: ${taskInfo.status}, Progress: ${taskInfo.progress}%`, 'STATUS_UPDATE');
          }
          
          // Add new logs to reporter
          if (taskInfo.logs && taskInfo.logs.length > 0 && taskId) {
            const recentLogs = taskInfo.logs.slice(-1);
            recentLogs.forEach((logLine: string) => {
              if (!logLine.includes('[STATUS_UPDATE]') && taskId) {
                reporter.addLog(taskId, logLine, 'TASK_LOG');
              }
            });
          }
          
          // Check if task is complete
          if (taskInfo.status === 'completed' || taskInfo.status === 'failed') {
            taskComplete = true;
            console.log(`\n\n✨ Task ${taskInfo.status}!`);
            if (taskId) {
              reporter.addLog(taskId, `Task ${taskInfo.status}`, 'TASK_COMPLETE');
            }
          }
        }
      } catch (error) {
        // Ignore read errors
      }
    }
  });
  
  // Create the task
  console.log('🔄 Creating task...\n');
  
  try {
    const createResult = await client.callTool({
      name: 'create_task',
      arguments: {
        title: config.title,
        tool: config.tool,
        instructions: config.instructions,
        branch: branchName
      }
    });
    
    const content = createResult.content as any[];
    if (!content?.[0]?.text) {
      throw new Error('create_task returned invalid response');
    }
    
    const taskData = JSON.parse(content[0].text as string);
    
    if (!taskData.result?.task_id) {
      throw new Error('create_task did not return a task_id');
    }
    
    taskId = taskData.result.task_id;
    sessionId = taskData.result.session_id;
    
    console.log(`✅ Task created successfully!`);
    console.log(`   Task ID: ${taskId}`);
    console.log(`   Session ID: ${sessionId || 'none'}`);
    console.log(`   Branch: ${branchName}\n`);
    
    // Start test report
    reporter.startTest(testName, taskId!, {
      tool: config.tool,
      branch: branchName,
      instructions: config.instructions,
      sessionId: sessionId || undefined
    });
    
    reporter.addLog(taskId!, `Task created successfully with ID: ${taskId}`, 'TASK_CREATED');
    reporter.addLog(taskId!, `Session ID: ${sessionId || 'none'}`, 'SESSION_INFO');
    reporter.addLog(taskId!, `Branch: ${branchName}`, 'BRANCH_INFO');
    
    // Wait for task completion
    console.log('⏳ Waiting for task completion...\n');
    
    const maxWaitTime = 120000; // 2 minutes
    const startTime = Date.now();
    
    while (!taskComplete && (Date.now() - startTime) < maxWaitTime) {
      await sleep(1000);
    }
    
    if (!taskComplete) {
      console.log('\n⚠️  Task did not complete within timeout period');
    }
    
    // Get final task state
    console.log('\n📊 Getting final task state...\n');
    
    const taskUri = `task://${taskId}`;
    const finalStatus = await client.readResource({ uri: taskUri });
    
    if (finalStatus.contents?.[0]?.text) {
      const final = JSON.parse(finalStatus.contents[0].text as string);
      
      console.log('Final Task Status:');
      console.log(`  Status: ${final.status}`);
      console.log(`  Total logs: ${final.logs?.length || 0}`);
      
      // Add all logs to reporter
      if (final.logs && final.logs.length > 0 && taskId) {
        final.logs.forEach((logLine: string) => {
          reporter.addLog(taskId!, logLine, 'FINAL_LOG');
        });
      }
      
      // Try to read task output
      try {
        const outputUri = `task-output://${taskId}`;
        const outputResource = await client.readResource({ uri: outputUri });
        
        if (outputResource.contents?.[0]?.text) {
          const output = JSON.parse(outputResource.contents[0].text as string);
          console.log(`\n📁 Files created/modified: ${output.files?.length || 0}`);
          if (output.files && output.files.length > 0) {
            output.files.forEach((file: any) => {
              console.log(`    - ${file.path} (${file.size} bytes)`);
            });
          }
        }
      } catch (e) {
        // No output available
      }
    }
    
    // End the task
    if (taskId) {
      await client.callTool({
        name: 'end_task',
        arguments: {
          task_id: taskId
        }
      });
      console.log('\n✅ Task ended successfully');
    }
    
    // Complete test report
    if (taskId) {
      await reporter.completeTest(taskId, {
        success: taskComplete,
        output: `Task ${taskComplete ? 'completed' : 'did not complete'} successfully`
      });
    }
    
    // Check if the file was created
    if (config.instructions.includes('docs/task.md')) {
      const expectedPath = path.join(process.env.PROJECT_ROOT || process.cwd(), 'docs/task.md');
      try {
        const { promises: fs } = await import('fs');
        const content = await fs.readFile(expectedPath, 'utf8');
        console.log('\n📄 File Content Preview:');
        console.log('─'.repeat(60));
        console.log(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
        console.log('─'.repeat(60));
      } catch (e) {
        console.log('\n⚠️  Could not read the created file');
      }
    }
    
    return taskComplete;
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Main test runner
 */
export async function runTaskCreationTests(): Promise<void> {
  log.section('🚀 Automated Task Creation Tests');
  
  const reporter = new TestReporter(process.env.PROJECT_ROOT || process.cwd());
  let client: Client | null = null;
  
  // Define test tasks
  const testTasks: TaskConfig[] = [
    {
      title: 'Create Project Documentation',
      instructions: 'Write a short paragraph explaining this project to docs/task.md',
      tool: 'CLAUDECODE'
    },
    {
      title: 'Create Test File',
      instructions: 'Create a file named test-output.txt with the content "This is a test file created by Claude"',
      tool: 'CLAUDECODE'
    },
    {
      title: 'Create JavaScript Function',
      instructions: 'Create a file named utils.js with a function that calculates the factorial of a number',
      tool: 'CLAUDECODE'
    }
  ];
  
  try {
    // Connect to MCP server
    console.log('\n🔌 Connecting to MCP server...');
    client = await createMCPClient(true);
    console.log('✅ Connected to MCP server\n');
    
    const results: boolean[] = [];
    
    // Run each test task
    for (const task of testTasks) {
      const success = await runPredefinedTask(client!, reporter, task);
      results.push(success);
      
      // Small delay between tasks
      await sleep(2000);
    }
    
    // Generate and save reports
    console.log('\n' + '='.repeat(80));
    console.log('📊 Generating Test Reports...');
    console.log('='.repeat(80) + '\n');
    
    reporter.printSummary();
    
    const reportDir = path.join(process.cwd(), 'test-reports');
    const { html, markdown } = await reporter.saveReports(reportDir);
    
    console.log(`\n📄 Reports saved:`);
    console.log(`   HTML: ${html}`);
    console.log(`   Markdown: ${markdown}`);
    
    // Print final summary
    const successCount = results.filter(r => r).length;
    const failCount = results.filter(r => !r).length;
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 Test Session Summary');
    console.log('='.repeat(80));
    console.log(`Total tasks run: ${results.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log('='.repeat(80) + '\n');
    
    if (failCount > 0) {
      process.exit(1);
    }
    
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
  runTaskCreationTests()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      log.error(`Fatal error: ${error}`);
      process.exit(1);
    });
}