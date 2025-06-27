/**
 * @file Test Local Git Integration
 * @module test-local-git-integration
 * 
 * @remarks
 * Tests the integration with local Git repository and file system
 */

import { createMCPClient, log, TestTracker, runTest } from './test-utils.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Helper to wait for a specified time
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check system file root configuration
 */
async function checkFileRootConfig(client: Client): Promise<void> {
  const result = await client.callTool({
    name: 'check_status',
    arguments: {
      test_sessions: false,
      verbose: true,
      include_tasks: false,
      include_sessions: false,
      include_tools: false,
      include_resources: false
    }
  });
  
  const content = result.content as any[];
  const response = JSON.parse(content[0].text);
  
  if (response.status !== 'success') {
    throw new Error(`check_status failed: ${response.message}`);
  }
  
  const statusData = response.result;
  
  log.debug('File root configuration:');
  log.debug(`  Path: ${statusData.file_root.path}`);
  log.debug(`  Configured: ${statusData.file_root.configured ? 'Yes' : 'No'}`);
  log.debug(`  Exists: ${statusData.file_root.exists ? 'Yes' : 'No'}`);
  log.debug(`  Writable: ${statusData.file_root.writable ? 'Yes' : 'No'}`);
  log.debug(`  Git Available: ${statusData.file_root.git_available ? 'Yes' : 'No'}`);
  log.debug(`  Is Git Repo: ${statusData.file_root.is_git_repo ? 'Yes' : 'No'}`);
  log.debug(`  Current Branch: ${statusData.file_root.current_branch || 'N/A'}`);
  
  if (!statusData.file_root.exists) {
    throw new Error('File root does not exist');
  }
  
  if (!statusData.file_root.writable) {
    throw new Error('File root is not writable');
  }
  
  if (!statusData.file_root.git_available) {
    throw new Error('Git is not available');
  }
}

/**
 * Create a test task on a new branch
 */
async function createTestTaskWithBranch(client: Client): Promise<{ taskId: string; branchName: string }> {
  const branchName = `test/local-git-${Date.now()}`;
  
  const result = await client.callTool({
    name: 'create_task',
    arguments: {
      title: 'Test Local Git Integration',
      description: 'Create a test file on a new branch',
      model: 'claude',
      command: `Create a file named test-${Date.now()}.md with the content "# Test File\n\nThis file was created by Claude Code on branch ${branchName}"`,
      project_path: '.',  // Use current directory relative to FILE_ROOT
      branch: branchName,
      priority: 'medium',
      start_immediately: true,
      context: {
        system_prompt: 'You are a helpful assistant. Create the requested file exactly as specified.',
        max_turns: 2
      }
    }
  });
  
  const content = result.content as any[];
  const response = JSON.parse(content[0].text);
  
  if (response.status === 'error') {
    throw new Error(`Failed to create task: ${response.message}`);
  }
  
  const taskData = response.result;
  
  log.debug(`Task created: ${taskData.task_id}`);
  log.debug(`Branch: ${branchName}`);
  log.debug(`Session: ${taskData.session_id}`);
  
  return { taskId: taskData.task_id, branchName };
}

/**
 * Verify Git branch was created
 */
async function verifyGitBranch(branchName: string): Promise<void> {
  try {
    // Check if branch exists in local repo
    const branches = execSync('git branch -a', { 
      encoding: 'utf-8',
      cwd: process.cwd()
    }).split('\n').map(b => b.trim());
    
    const branchExists = branches.some(b => 
      b === branchName || 
      b === `* ${branchName}` || 
      b.endsWith(`/${branchName}`)
    );
    
    if (!branchExists) {
      log.warning(`Branch ${branchName} not found in local repo`);
      log.debug('Available branches:');
      branches.forEach(b => log.debug(`  ${b}`));
    } else {
      log.success(`Branch ${branchName} exists in local repo`);
    }
    
    // Check current branch
    const currentBranch = execSync('git branch --show-current', {
      encoding: 'utf-8',
      cwd: process.cwd()
    }).trim();
    
    log.debug(`Current branch: ${currentBranch}`);
    
  } catch (error) {
    log.error(`Failed to verify Git branch: ${error}`);
    throw error;
  }
}

/**
 * Monitor task and verify file creation
 */
async function monitorTaskAndVerifyFile(client: Client, taskId: string): Promise<string | null> {
  let attempts = 0;
  const maxAttempts = 30;
  let createdFile: string | null = null;
  
  while (attempts < maxAttempts) {
    const result = await client.callTool({
      name: 'report_task',
      arguments: {
        task_ids: [taskId],
        report_type: 'detailed',
        format: 'json'
      }
    });
    
    const content = result.content as any[];
    const response = JSON.parse(content[0].text);
    const task = response.result.tasks[0];
    
    log.debug(`Task status: ${task.status} (${task.progress}%)`);
    
    // Check logs for file creation
    if (task.logs && task.logs.length > 0) {
      const recentLogs = task.logs.slice(-5);
      recentLogs.forEach((logEntry: string) => {
        if (logEntry.includes('Created file') || logEntry.includes('test-') && logEntry.includes('.md')) {
          const match = logEntry.match(/test-\d+\.md/);
          if (match) {
            createdFile = match[0];
            log.success(`File created: ${createdFile}`);
          }
        }
      });
    }
    
    if (task.status === 'completed') {
      log.success('Task completed');
      break;
    }
    
    if (task.status === 'failed') {
      throw new Error(`Task failed: ${task.logs?.[task.logs.length - 1] || 'Unknown error'}`);
    }
    
    attempts++;
    await sleep(1000);
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Task timeout');
  }
  
  return createdFile;
}

/**
 * Verify file exists in the file system
 */
async function verifyFileExists(fileName: string | null): Promise<void> {
  if (!fileName) {
    log.warning('No file name detected from task logs');
    return;
  }
  
  try {
    const filePath = path.join(process.cwd(), fileName);
    const stats = await fs.stat(filePath);
    
    if (stats.isFile()) {
      log.success(`File exists: ${filePath}`);
      
      // Read and display file content
      const content = await fs.readFile(filePath, 'utf-8');
      log.debug('File content:');
      content.split('\n').forEach(line => log.debug(`  ${line}`));
      
      // Clean up - remove the test file
      await fs.unlink(filePath);
      log.debug(`Cleaned up test file: ${fileName}`);
    }
  } catch (error) {
    log.warning(`File not found or error reading: ${fileName}`);
  }
}

/**
 * Clean up Git branch
 */
async function cleanupGitBranch(branchName: string): Promise<void> {
  try {
    // Switch back to main branch
    execSync('git checkout main', {
      cwd: process.cwd(),
      encoding: 'utf-8'
    });
    
    // Delete test branch
    execSync(`git branch -D ${branchName}`, {
      cwd: process.cwd(),
      encoding: 'utf-8'
    });
    
    log.debug(`Cleaned up branch: ${branchName}`);
  } catch (error) {
    log.warning(`Failed to cleanup branch ${branchName}: ${error}`);
  }
}

/**
 * Main test runner
 */
export async function testLocalGitIntegration(): Promise<void> {
  log.section('🔧 Testing Local Git Integration');
  
  const tracker = new TestTracker();
  let client: Client | null = null;
  let taskId: string | null = null;
  let branchName: string | null = null;
  let createdFile: string | null = null;
  
  try {
    client = await createMCPClient();
    log.success('Connected to MCP server');
    
    // Check file root configuration
    await runTest('Check File Root Config', async () => {
      await checkFileRootConfig(client!);
    }, tracker);
    
    // Create task with branch
    await runTest('Create Task with Branch', async () => {
      const result = await createTestTaskWithBranch(client!);
      taskId = result.taskId;
      branchName = result.branchName;
    }, tracker);
    
    if (taskId && branchName) {
      // Verify Git branch
      await runTest('Verify Git Branch', async () => {
        await verifyGitBranch(branchName!);
      }, tracker);
      
      // Monitor task and get created file
      await runTest('Monitor Task Execution', async () => {
        createdFile = await monitorTaskAndVerifyFile(client!, taskId!);
      }, tracker);
      
      // Verify file exists
      await runTest('Verify File Creation', async () => {
        await verifyFileExists(createdFile);
      }, tracker);
    }
    
    tracker.printSummary();
    
  } catch (error) {
    log.error(`Test suite failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    // Clean up
    if (branchName) {
      try {
        await cleanupGitBranch(branchName);
      } catch (cleanupError) {
        log.warning('Failed to cleanup Git branch');
      }
    }
    
    if (client) {
      await client.close();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testLocalGitIntegration().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}