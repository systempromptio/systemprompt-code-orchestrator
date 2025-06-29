/**
 * @file Interactive E2E Test for create_task Flow
 * @module test-interactive
 * 
 * @remarks
 * Interactive test that allows users to input custom tasks via CLI
 */

import { createMCPClient, log } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { TestReporter } from './test-reporter.js';
import * as path from 'path';
import * as readline from 'readline';
import { 
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema
} from '@modelcontextprotocol/sdk/types.js';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper to prompt user for input
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Interactive task creation and monitoring
 */
async function runInteractiveTask(client: Client, reporter: TestReporter): Promise<boolean> {
  const timestamp = Date.now();
  let taskComplete = false;
  let executionComplete = false;
  let taskId: string | null = null;
  let sessionId: string | null = null;
  const notifications: Array<{timestamp: string, type: string, data: any}> = [];
  
  // Get user input
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Interactive Task Creator');
  console.log('='.repeat(60));
  
  const title = await prompt('\n📝 Task Title (e.g., "Create Documentation"): ');
  const instructions = await prompt('\n📋 Instructions for Claude (e.g., "Write a short paragraph explaining this project to docs/task.md"): ');
  const tool = await prompt('\n🔧 Tool to use (CLAUDECODE/GEMINICLI) [default: CLAUDECODE]: ') || 'CLAUDECODE';
  
  console.log('\n' + '='.repeat(60));
  console.log('Task Configuration:');
  console.log(`  Title: ${title}`);
  console.log(`  Tool: ${tool}`);
  console.log(`  Instructions: ${instructions}`);
  console.log('='.repeat(60) + '\n');
  
  const confirm = await prompt('Proceed with task creation? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Task creation cancelled.');
    return false;
  }
  
  // Define test parameters
  const testName = title;
  const branchName = `interactive-${timestamp}`;
  
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
          
          // Update progress with more detail
          const statusSymbol = taskInfo.status === 'completed' ? '✅' : 
                              taskInfo.status === 'failed' ? '❌' : '⏳';
          const logCount = taskInfo.logs?.length || 0;
          const lastLog = taskInfo.logs?.[taskInfo.logs.length - 1] || '';
          
          // Clear line and show detailed progress
          process.stdout.write('\r' + ' '.repeat(100) + '\r');
          process.stdout.write(`${statusSymbol} Status: ${taskInfo.status} | Logs: ${logCount} | Progress: ${taskInfo.progress || 0}%`);
          
          // Log important state changes
          if (lastLog.includes('[STATUS_CHANGE]') || 
              lastLog.includes('[EXECUTION_SUCCESS]') || 
              lastLog.includes('[SESSION_CREATED]') ||
              lastLog.includes('[INSTRUCTIONS_SENDING]')) {
            console.log(`\n📍 ${lastLog}`);
          }
          
          if (taskId) {
            reporter.addLog(taskId, `Task Status: ${taskInfo.status}, Progress: ${taskInfo.progress}%`, 'STATUS_UPDATE');
          }
          
          // Add new logs to reporter
          if (taskInfo.logs && taskInfo.logs.length > 0 && taskId) {
            const recentLogs = taskInfo.logs.slice(-1);
            recentLogs.forEach((logLine: string) => {
              if (!logLine.includes('[STATUS_UPDATE]') && taskId) {
                reporter.addLog(taskId, logLine, 'TASK_LOG');
                
                // Check if agent execution completed
                if (logLine.includes('[EXECUTION_SUCCESS]')) {
                  console.log('\n\n✨ Agent execution completed successfully!');
                  console.log('📝 Marking as complete for test purposes...');
                  executionComplete = true; // Track execution completion separately
                }
                
                // Log other important events
                if (logLine.includes('[COMMAND_SENT]')) {
                  console.log(`\n📤 ${logLine}`);
                } else if (logLine.includes('[CLAUDECODE_OUTPUT]')) {
                  console.log(`\n📥 Claude completed execution`);
                }
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
  console.log('\n🔄 Creating task...\n');
  
  try {
    const createResult = await client.callTool({
      name: 'create_task',
      arguments: {
        title: title,
        tool: tool as 'CLAUDECODE' | 'GEMINICLI',
        instructions: instructions,
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
      tool: tool as 'CLAUDECODE' | 'GEMINICLI',
      branch: branchName,
      instructions: instructions,
      sessionId: sessionId || undefined
    });
    
    reporter.addLog(taskId!, `Task created successfully with ID: ${taskId}`, 'TASK_CREATED');
    reporter.addLog(taskId!, `Session ID: ${sessionId || 'none'}`, 'SESSION_INFO');
    reporter.addLog(taskId!, `Branch: ${branchName}`, 'BRANCH_INFO');
    
    // Wait for task completion
    console.log('⏳ Waiting for task completion...\n');
    
    const maxWaitTime = 120000; // 2 minutes
    const startTime = Date.now();
    
    while (!executionComplete && !taskComplete && (Date.now() - startTime) < maxWaitTime) {
      await sleep(1000);
    }
    
    if (!executionComplete && !taskComplete) {
      console.log('\n\n⚠️  Agent did not complete execution within timeout period');
      console.log('    The task may still be running in the background.');
    } else if (executionComplete) {
      console.log('\n\n✅ Execution completed! Getting final results...');
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
    
    // Check for created files based on instructions
    if (instructions.toLowerCase().includes('html')) {
      console.log('\n🔍 Looking for created HTML files...');
      try {
        const { execSync } = await import('child_process');
        const projectRoot = process.env.PROJECT_ROOT || '/var/www/html/systemprompt-coding-agent';
        const htmlFiles = execSync('find . -name "*.html" -type f -mmin -5 | head -10', {
          cwd: projectRoot,
          encoding: 'utf8'
        }).trim();
        
        if (htmlFiles) {
          console.log('📄 Recently created HTML files:');
          htmlFiles.split('\n').forEach(file => {
            console.log(`    ${file}`);
          });
          
          // Show content of the most recent file
          const mostRecent = htmlFiles.split('\n')[0];
          if (mostRecent) {
            console.log(`\n📋 Content preview of ${mostRecent}:`);
            const fsModule = await import('fs/promises');
            const content = await fsModule.readFile(path.join(projectRoot, mostRecent), 'utf8');
            console.log('─'.repeat(60));
            console.log(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
            console.log('─'.repeat(60));
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    // End the task
    if (taskId) {
      console.log('\n📝 Ending task...');
      await client.callTool({
        name: 'end_task',
        arguments: {
          task_id: taskId
        }
      });
      console.log('✅ Task ended successfully');
    }
    
    // Complete test report
    if (taskId) {
      await reporter.completeTest(taskId, {
        success: taskComplete,
        output: `Task ${taskComplete ? 'completed' : 'did not complete'} successfully`
      });
    }
    
    return taskComplete;
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Main interactive test runner
 */
export async function runInteractiveTest(): Promise<void> {
  log.section('🚀 Interactive E2E Test for Task Creation');
  
  const reporter = new TestReporter(process.env.PROJECT_ROOT || process.cwd());
  let client: Client | null = null;
  
  try {
    // Connect to MCP server
    console.log('\n🔌 Connecting to MCP server...');
    client = await createMCPClient(true);
    console.log('✅ Connected to MCP server\n');
    
    let continueTests = true;
    const results: boolean[] = [];
    
    while (continueTests) {
      const success = await runInteractiveTask(client!, reporter);
      results.push(success);
      
      const another = await prompt('\n\nRun another task? (y/n): ');
      continueTests = another.toLowerCase() === 'y';
    }
    
    // Generate and save reports
    console.log('\n' + '='.repeat(60));
    console.log('📊 Generating Test Reports...');
    console.log('='.repeat(60) + '\n');
    
    reporter.printSummary();
    
    const reportDir = path.join(process.cwd(), 'test-reports');
    const { html, markdown } = await reporter.saveReports(reportDir);
    
    console.log(`\n📄 Reports saved:`);
    console.log(`   HTML: ${html}`);
    console.log(`   Markdown: ${markdown}`);
    
    // Print final summary
    const successCount = results.filter(r => r).length;
    const failCount = results.filter(r => !r).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 Test Session Summary');
    console.log('='.repeat(60));
    console.log(`Total tasks run: ${results.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    log.error(`Test suite failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    rl.close();
    if (client) {
      await client.close();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runInteractiveTest()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      log.error(`Fatal error: ${error}`);
      process.exit(1);
    });
}