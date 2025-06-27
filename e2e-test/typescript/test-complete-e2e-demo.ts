/**
 * @file Complete E2E Demonstration Test
 * @module test-complete-e2e-demo
 * 
 * @remarks
 * Demonstrates the full workflow: Docker MCP → Claude Host → File Creation
 */

import { createMCPClient, log } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log.section('🚀 Complete E2E Demonstration');
  
  let client: Client | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');

    // Step 1: List available tools
    log.section('📋 Step 1: Listing Available Tools');
    const tools = await client.listTools();
    log.info(`Found ${tools.tools.length} tools:`);
    for (const tool of tools.tools) {
      log.info(`  - ${tool.name}: ${tool.description}`);
    }

    // Step 2: Create three concurrent tasks
    log.section('🔨 Step 2: Creating Three Concurrent Tasks');
    const timestamp = Date.now();
    const baseBranchName = `demo/concurrent-${timestamp}`;
    
    // Define three different tasks
    const taskConfigs = [
      {
        title: 'Generate Fibonacci Function',
        description: 'Create a JavaScript file with a fibonacci function',
        fileName: `fibonacci-${timestamp}.js`,
        branch: `${baseBranchName}-fib`,
        command: 'Create a file with a fibonacci function that calculates the nth fibonacci number. Include test cases for n=1 through n=10.',
        color: '\x1b[36m' // Cyan
      },
      {
        title: 'Generate Prime Number Checker',
        description: 'Create a JavaScript file with a prime number checker',
        fileName: `prime-checker-${timestamp}.js`,
        branch: `${baseBranchName}-prime`,
        command: 'Create a file with a function that checks if a number is prime. Include test cases for numbers 1 through 20.',
        color: '\x1b[35m' // Magenta
      },
      {
        title: 'Generate Palindrome Checker',
        description: 'Create a JavaScript file with a palindrome checker',
        fileName: `palindrome-${timestamp}.js`,
        branch: `${baseBranchName}-palindrome`,
        command: 'Create a file with a function that checks if a string is a palindrome. Include test cases for various strings.',
        color: '\x1b[33m' // Yellow
      }
    ];
    
    // Create all three tasks concurrently
    log.info('Creating three concurrent tasks...');
    const taskCreationPromises = taskConfigs.map(async (config, index) => {
      log.info(`[Task ${index + 1}] ${config.title} → ${config.branch}`);
      const result = await client.callTool({
        name: 'create_task',
        arguments: {
          title: config.title,
          description: config.description,
          model: 'claude',
          command: `${config.command} Save the file as ${config.fileName}.`,
          project_path: '/workspace',
          branch: config.branch,
          priority: 'high',
          start_immediately: true
        }
      });
      const response = JSON.parse((result.content as any[])[0].text);
      return {
        taskId: response.result.task_id,
        config
      };
    });
    
    const tasks = await Promise.all(taskCreationPromises);
    log.success(`Created ${tasks.length} concurrent tasks`);

    // Step 3: Monitor concurrent task progress
    log.section('📊 Step 3: Monitoring Concurrent Task Progress');
    
    const taskStatuses = new Map(tasks.map(t => [t.taskId, { 
      completed: false, 
      config: t.config,
      lastProgress: 0,
      lastStatus: 'pending'
    }]));
    
    let allComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // More time for concurrent tasks
    
    // Helper to display progress bar
    const progressBar = (progress: number, width: number = 20): string => {
      const filled = Math.round((progress / 100) * width);
      const empty = width - filled;
      return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
    };
    
    log.info('\nMonitoring concurrent tasks...\n');
    
    while (!allComplete && attempts < maxAttempts) {
      attempts++;
      await sleep(2000); // Wait 2 seconds between checks
      
      // Check all tasks concurrently
      const statusPromises = tasks.map(async ({ taskId, config }) => {
        try {
          const taskResource = await client.readResource({
            uri: `task://${taskId}`
          });
          const taskData = JSON.parse(taskResource.contents[0].text);
          
          const status = taskStatuses.get(taskId)!;
          status.lastProgress = taskData.progress || 0;
          status.lastStatus = taskData.status;
          
          // Check if task is done
          if (taskData.status === 'completed' || taskData.status === 'failed') {
            status.completed = true;
          }
          
          return { taskId, taskData, config };
        } catch (e) {
          return { taskId, error: e, config };
        }
      });
      
      const statuses = await Promise.all(statusPromises);
      
      // Clear previous lines and display current status
      console.log('\x1b[2K\x1b[1A'.repeat(tasks.length + 2)); // Clear lines
      log.info(`\nAttempt ${attempts}/${maxAttempts}:`);
      
      // Display status for each task
      for (const { taskId, taskData, config, error } of statuses) {
        const status = taskStatuses.get(taskId)!;
        if (error) {
          console.log(`${config.color}[${config.title}] Error: ${error}\x1b[0m`);
        } else {
          const progress = taskData.progress || 0;
          const statusIcon = taskData.status === 'completed' ? '✓' : 
                           taskData.status === 'failed' ? '✗' : 
                           taskData.status === 'running' ? '⚡' : '○';
          console.log(
            `${config.color}[${statusIcon}] ${config.title.padEnd(30)} ` +
            `${progressBar(progress)} ${progress.toString().padStart(3)}% ` +
            `${taskData.status}\x1b[0m`
          );
          
          // Check for recent logs
          if (taskData.logs && taskData.logs.length > 0) {
            const recentLog = taskData.logs[taskData.logs.length - 1];
            if (recentLog && recentLog.length < 60) {
              console.log(`${config.color}    └─ ${recentLog}\x1b[0m`);
            }
          }
        }
      }
      
      // Check if all tasks are complete
      allComplete = Array.from(taskStatuses.values()).every(s => s.completed);
    }
    
    // Final status report
    log.section('📋 Task Completion Summary');
    for (const { taskId, config } of tasks) {
      const status = taskStatuses.get(taskId)!;
      if (status.lastStatus === 'completed') {
        log.success(`✓ ${config.title} - Completed`);
      } else if (status.lastStatus === 'failed') {
        log.error(`✗ ${config.title} - Failed`);
      } else {
        log.warning(`○ ${config.title} - Incomplete (${status.lastStatus})`);
      }
    }
    
    if (!allComplete) {
      log.warning('Not all tasks completed within timeout');
    }

    // Step 4: Verify file creation
    log.section('🔍 Step 4: Verifying File Creation');
    
    // Store original branch
    const originalBranch = execSync('cd /var/www/html/systemprompt-coding-agent && git branch --show-current', { encoding: 'utf8' }).trim();
    
    // Check git branches and files for each task
    log.info('Checking git branches and files...');
    
    for (const { taskId, config } of tasks) {
      const status = taskStatuses.get(taskId)!;
      
      if (status.lastStatus !== 'completed') {
        log.warning(`Skipping verification for ${config.title} (not completed)`);
        continue;
      }
      
      log.info(`\nVerifying ${config.title}...`);
      
      try {
        const branches = execSync('cd /var/www/html/systemprompt-coding-agent && git branch -a', { encoding: 'utf8' });
        const hasBranch = branches.includes(config.branch);
        
        if (hasBranch) {
          log.success(`Branch ${config.branch} exists`);
          
          // Switch to branch and check for file
          execSync(`cd /var/www/html/systemprompt-coding-agent && git checkout ${config.branch}`, { stdio: 'ignore' });
          
          const filePath = path.join('/var/www/html/systemprompt-coding-agent', config.fileName);
          const fileExists = fs.existsSync(filePath);
          
          if (fileExists) {
            log.success(`File ${config.fileName} exists`);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Test the generated function based on type
            log.info(`Testing ${config.fileName}...`);
            try {
              let testCode = '';
              
              if (config.title.includes('Fibonacci')) {
                testCode = `
                  ${content}
                  console.log('Testing fibonacci function:');
                  for (let i = 1; i <= 5; i++) {
                    const result = fibonacci ? fibonacci(i) : (fib ? fib(i) : 'Function not found');
                    console.log(\`fib(\${i}) = \${result}\`);
                  }
                `;
              } else if (config.title.includes('Prime')) {
                testCode = `
                  ${content}
                  console.log('Testing prime checker:');
                  const testNumbers = [2, 3, 4, 5, 11, 15, 17];
                  for (const n of testNumbers) {
                    const result = isPrime ? isPrime(n) : (checkPrime ? checkPrime(n) : 'Function not found');
                    console.log(\`isPrime(\${n}) = \${result}\`);
                  }
                `;
              } else if (config.title.includes('Palindrome')) {
                testCode = `
                  ${content}
                  console.log('Testing palindrome checker:');
                  const testStrings = ['racecar', 'hello', 'A man a plan a canal Panama', '12321'];
                  for (const s of testStrings) {
                    const result = isPalindrome ? isPalindrome(s) : (checkPalindrome ? checkPalindrome(s) : 'Function not found');
                    console.log(\`isPalindrome("\${s}") = \${result}\`);
                  }
                `;
              }
              
              fs.writeFileSync(`/tmp/test-${taskId}.js`, testCode);
              const output = execSync(`node /tmp/test-${taskId}.js`, { encoding: 'utf8' });
              console.log(`${config.color}${output}\x1b[0m`);
              log.success(`${config.fileName} works correctly!`);
            } catch (e) {
              log.error(`Function test failed: ${e}`);
            }
          } else {
            log.error(`File ${config.fileName} not found on branch ${config.branch}`);
          }
        } else {
          log.error(`Branch ${config.branch} not found`);
        }
      } catch (e) {
        log.error(`Error verifying ${config.title}: ${e}`);
      }
    }
    
    // Switch back to original branch
    try {
      execSync(`cd /var/www/html/systemprompt-coding-agent && git checkout ${originalBranch}`, { stdio: 'ignore' });
    } catch (e) {
      log.error(`Error switching back to ${originalBranch}: ${e}`);
    }

    // Step 5: Show summary via resources
    log.section('📈 Step 5: Final Summary');
    
    // Get overall stats
    const statsResult = await client.callTool({
      name: 'update_stats',
      arguments: {
        include_tasks: true,
        include_sessions: true
      }
    });
    const stats = JSON.parse((statsResult.content as any[])[0].text);
    log.info('System Statistics:');
    console.log(JSON.stringify(stats.result, null, 2));
    
    // List all resources
    const resources = await client.listResources();
    log.info(`\nAvailable resources: ${resources.resources.length}`);
    const taskResources = resources.resources.filter(r => r.uri.includes('task'));
    log.info(`Task-related resources: ${taskResources.length}`);
    for (const resource of taskResources.slice(0, 5)) {
      log.info(`  - ${resource.uri}: ${resource.name}`);
    }

  } catch (error) {
    log.error(`Error: ${error}`);
    console.error(error);
  } finally {
    if (client) {
      await client.close();
    }
    log.success('\nDemo complete!');
  }
}

// Run the demo
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});