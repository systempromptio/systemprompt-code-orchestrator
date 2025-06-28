#!/usr/bin/env npx tsx
/**
 * Comprehensive E2E test for create_task flow with full logging and progress tracking
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { 
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema 
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Test utilities
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface TestNotification {
  type: string;
  timestamp: string;
  data?: any;
}

class TestLogger {
  private startTime = Date.now();
  
  info(message: string) {
    console.log(`\x1b[34mℹ\x1b[0m ${message}`);
  }
  
  success(message: string) {
    console.log(`\x1b[32m✅\x1b[0m ${message}`);
  }
  
  error(message: string) {
    console.log(`\x1b[31m❌\x1b[0m ${message}`);
  }
  
  warning(message: string) {
    console.log(`\x1b[33m⚠️\x1b[0m ${message}`);
  }
  
  debug(message: string) {
    console.log(`\x1b[36m  🔍\x1b[0m ${message}`);
  }
  
  section(title: string) {
    console.log(`\n\x1b[1m\x1b[34m${title}\x1b[0m`);
  }
  
  elapsed() {
    return `${Date.now() - this.startTime}ms`;
  }
}

async function testCreateTaskFlow() {
  const log = new TestLogger();
  log.section('🚀 Comprehensive E2E Test for create_task Flow');
  
  // Test configuration
  const MCP_URL = process.env.TEST_MCP_URL || 'http://127.0.0.1:3000';
  const timestamp = Date.now();
  const testBranch = `e2e-test-${timestamp}`;
  
  // Connect to MCP server
  log.debug(`Connecting to MCP server at ${MCP_URL}`);
  const transport = new StreamableHTTPClientTransport(
    new URL('/mcp', MCP_URL),
    {
      requestInit: {
        headers: {
          'Accept': 'application/json, text/event-stream',
          'Content-Type': 'application/json'
        }
      }
    }
  );
  const client = new Client({
    name: 'e2e-test-comprehensive',
    version: '1.0.0',
  }, {
    capabilities: {
      notifications: {
        resourceListChanged: true,
        resourceUpdated: true,
      },
      subscriptions: {
        resources: true
      }
    }
  });
  
  const notifications: TestNotification[] = [];
  let taskComplete = false;
  let taskProgress: any[] = [];
  
  // Setup notification handlers
  client.setNotificationHandler(ResourceListChangedNotificationSchema, async () => {
    notifications.push({ type: 'ResourceListChanged', timestamp: new Date().toISOString() });
  });
  
  let taskId: string = ''; // Initialize for use in handler
  
  client.setNotificationHandler(ResourceUpdatedNotificationSchema, async (notification) => {
    notifications.push({ 
      type: 'ResourceUpdated', 
      timestamp: new Date().toISOString(),
      data: notification.params 
    });
    
    // If it's our task, try to read updated status
    if (taskId && notification.params.uri.includes(taskId)) {
      try {
        const resource = await client.readResource({ uri: notification.params.uri });
        if (resource.contents?.[0]?.text) {
          const data = JSON.parse(resource.contents[0].text as string);
          
          // Track progress
          if (notification.params.uri.endsWith('/logs')) {
            taskProgress.push({
              timestamp: new Date().toISOString(),
              logs: data.logs || []
            });
          } else {
            taskProgress.push({
              timestamp: new Date().toISOString(),
              status: data.status,
              progress: data.progress,
              elapsed: data.elapsed_seconds
            });
            
            if (data.status === 'completed' || data.status === 'failed') {
              taskComplete = true;
            }
          }
        }
      } catch (e) {
        // Silent fail - resource might not be ready yet
      }
    }
  });
  
  await client.connect(transport);
  log.success('Connected to MCP server with notifications enabled');
  
  // Step 1: List all available resources before task creation
  log.section('📋 Initial Resources');
  const initialResources = await client.listResources();
  log.info(`Total resources: ${initialResources.resources?.length || 0}`);
  
  // Step 2: Create a task
  log.section('🔨 Creating Task');
  const createResult = await client.callTool({
    name: 'create_task',
    arguments: {
      title: 'Comprehensive E2E Test Task',
      tool: 'CLAUDECODE',
      instructions: 'Create a file called index.html with "Hello World" content using proper HTML5 structure',
      branch: testBranch
    }
  });
  
  const content = createResult.content as any[];
  if (!content?.[0]?.text) {
    throw new Error('create_task returned invalid response');
  }
  
  const createData = JSON.parse(content[0].text as string);
  taskId = createData.result.task_id; // Assign to outer scope variable
  const sessionId = createData.result.session_id;
  
  log.success(`Task created: ${taskId}`);
  log.info(`Branch: ${testBranch}`);
  log.info(`Session: ${sessionId}`);
  
  // Step 3: Subscribe to task resources
  const taskUri = `task://${taskId}`;
  const logsUri = `task://${taskId}/logs`;
  
  try {
    await client.subscribeResource({ uri: taskUri });
    log.success(`Subscribed to ${taskUri}`);
  } catch (e) {
    log.warning(`Could not subscribe to ${taskUri}: ${e}`);
  }
  
  try {
    await client.subscribeResource({ uri: logsUri });
    log.success(`Subscribed to ${logsUri}`);
  } catch (e) {
    log.warning(`Could not subscribe to ${logsUri}: ${e}`);
  }
  
  // Step 4: List resources after task creation
  await sleep(500); // Give server time to update
  log.section('📋 Resources After Task Creation');
  const resourcesAfter = await client.listResources();
  const taskResources = resourcesAfter.resources?.filter(r => r.uri.includes(taskId)) || [];
  
  log.info(`Task-related resources: ${taskResources.length}`);
  taskResources.forEach(resource => {
    log.debug(`- ${resource.uri} (${resource.name})`);
  });
  
  // Step 5: Read all task resources
  log.section('📊 Task Resource Details');
  for (const resource of taskResources) {
    try {
      log.info(`Reading ${resource.uri}...`);
      const data = await client.readResource({ uri: resource.uri });
      
      if (data.contents?.[0]?.text) {
        const content = JSON.parse(data.contents[0].text as string);
        
        if (resource.uri.endsWith('/logs')) {
          log.info(`  Logs count: ${content.logs?.length || 0}`);
          if (content.logs && content.logs.length > 0) {
            log.info('  Recent logs:');
            content.logs.slice(-5).forEach((log: string, idx: number) => {
              console.log(`    ${content.logs.length - 5 + idx + 1}. ${log}`);
            });
          }
        } else if (resource.uri.includes('task://')) {
          log.info(`  Status: ${content.status}`);
          log.info(`  Progress: ${content.progress || 0}%`);
          log.info(`  Branch: ${content.branch}`);
          log.info(`  Elapsed: ${content.elapsed_seconds || 0}s`);
        }
      }
    } catch (e) {
      log.warning(`  Could not read ${resource.uri}: ${e}`);
    }
  }
  
  // Step 5: Monitor task execution
  log.section('⏳ Monitoring Task Execution');
  const maxWaitTime = 120000; // 2 minutes
  const startTime = Date.now();
  let lastStatus = '';
  
  while (!taskComplete && (Date.now() - startTime) < maxWaitTime) {
    await sleep(2000);
    
    // Read current task status
    try {
      const taskUri = `task://${taskId}`;
      const taskData = await client.readResource({ uri: taskUri });
      
      if (taskData.contents?.[0]?.text) {
        const task = JSON.parse(taskData.contents[0].text as string);
        
        if (task.status !== lastStatus) {
          lastStatus = task.status;
          log.info(`Status changed to: ${task.status} (${task.elapsed_seconds || 0}s elapsed)`);
        }
        
        // Read latest logs
        const logsUri = `task://${taskId}/logs`;
        const logsData = await client.readResource({ uri: logsUri });
        
        if (logsData.contents?.[0]?.text) {
          const logs = JSON.parse(logsData.contents[0].text as string);
          if (logs.logs && logs.logs.length > 0) {
            const latestLog = logs.logs[logs.logs.length - 1];
            log.debug(`Latest log: ${latestLog}`);
          }
        }
      }
    } catch (e) {
      // Continue monitoring
    }
  }
  
  if (!taskComplete) {
    log.warning('Task did not complete within timeout period');
  }
  
  // Step 6: Call end_task
  log.section('🏁 Ending Task');
  const endResult = await client.callTool({
    name: 'end_task',
    arguments: {
      task_id: taskId,
      status: 'completed'
    }
  });
  
  const endContent = endResult.content as any[];
  if (endContent?.[0]?.text) {
    const endData = JSON.parse(endContent[0].text as string);
    log.success(`Task ended: ${endData.message}`);
  }
  
  // Step 7: Get final comprehensive state
  log.section('📈 Final Task Analysis');
  
  // Read final task data
  try {
    const finalTask = await client.readResource({ uri: `task://${taskId}` });
    if (finalTask.contents?.[0]?.text) {
      const task = JSON.parse(finalTask.contents[0].text as string);
      
      log.info('Task Summary:');
      log.info(`  ID: ${task.id}`);
      log.info(`  Title: ${task.title}`);
      log.info(`  Status: ${task.status}`);
      log.info(`  Branch: ${task.branch}`);
      log.info(`  Started: ${task.started_at || 'N/A'}`);
      log.info(`  Completed: ${task.completed_at || 'N/A'}`);
      log.info(`  Duration: ${task.elapsed_seconds || 0} seconds`);
      log.info(`  Progress: ${task.progress || 0}%`);
    }
  } catch (e) {
    log.error(`Could not read final task state: ${e}`);
  }
  
  // Read all logs
  try {
    const finalLogs = await client.readResource({ uri: `task://${taskId}/logs` });
    if (finalLogs.contents?.[0]?.text) {
      const logs = JSON.parse(finalLogs.contents[0].text as string);
      
      log.section('📝 Complete Task Logs');
      log.info(`Total log entries: ${logs.logs?.length || 0}`);
      
      if (logs.logs && logs.logs.length > 0) {
        logs.logs.forEach((logEntry: string, idx: number) => {
          console.log(`  ${idx + 1}. ${logEntry}`);
        });
      }
    }
  } catch (e) {
    log.error(`Could not read task logs: ${e}`);
  }
  
  // Step 8: Check git branch and files
  log.section('🌿 Git Branch Verification');
  try {
    // Get all branches
    const branches = execSync('git branch -a', { encoding: 'utf-8' });
    log.debug('All branches:');
    console.log(branches);
    
    // Check if our branch exists
    if (branches.includes(testBranch)) {
      log.success(`Git branch "${testBranch}" was created successfully`);
      
      // Check files in the branch
      execSync(`git checkout ${testBranch}`, { stdio: 'ignore' });
      const files = execSync('ls -la *.html 2>/dev/null || echo "No HTML files found"', { encoding: 'utf-8' });
      log.info('Files in the branch:');
      console.log(files);
      
      // Check file content if exists
      if (fs.existsSync('index.html')) {
        const content = fs.readFileSync('index.html', 'utf-8');
        log.success('index.html created with content:');
        console.log(content);
      }
      
      // Switch back to main
      execSync('git checkout main', { stdio: 'ignore' });
    } else {
      log.error(`Git branch "${testBranch}" was NOT created`);
    }
  } catch (e) {
    log.error(`Git verification failed: ${e}`);
  }
  
  // Step 9: Progress timeline
  log.section('📊 Task Progress Timeline');
  log.info(`Total progress updates: ${taskProgress.length}`);
  
  if (taskProgress.length > 0) {
    const startTs = new Date(taskProgress[0].timestamp).getTime();
    
    taskProgress.forEach((update, idx) => {
      const elapsed = new Date(update.timestamp).getTime() - startTs;
      const elapsedSec = (elapsed / 1000).toFixed(1);
      
      if (update.status) {
        console.log(`  [+${elapsedSec}s] Status: ${update.status}, Progress: ${update.progress || 0}%`);
      } else if (update.logs) {
        console.log(`  [+${elapsedSec}s] New logs: ${update.logs.length} entries`);
      }
    });
  }
  
  // Step 10: Notification analysis
  log.section('🔔 Notification Analysis');
  log.info(`Total notifications: ${notifications.length}`);
  
  const notificationTypes = notifications.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(notificationTypes).forEach(([type, count]) => {
    log.info(`  ${type}: ${count} times`);
  });
  
  // Step 11: Docker container paths
  log.section('📁 Docker Container Paths');
  log.info('Task data locations:');
  log.info(`  Task file: /data/state/tasks/${taskId}.json`);
  log.info(`  Reports: /data/state/reports/report_${taskId}_*.json`);
  log.info(`  State backups: /data/state/state.backup.*.json`);
  log.info('');
  log.info('To view task file in Docker:');
  log.info(`  docker exec systemprompt-coding-agent-mcp-server-1 cat /data/state/tasks/${taskId}.json | jq`);
  
  // Final summary
  log.section('✨ Test Summary');
  log.success(`Test completed in ${log.elapsed()}`);
  log.info(`Task completed: ${taskComplete ? 'Yes' : 'No'}`);
  log.info(`Final status: ${lastStatus}`);
  
  await client.close();
}

// Run the test
testCreateTaskFlow().catch(error => {
  console.error('\x1b[31mTest failed:\x1b[0m', error);
  process.exit(1);
});