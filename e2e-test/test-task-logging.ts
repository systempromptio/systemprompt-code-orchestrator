/**
 * Comprehensive test for task creation with world-class logging
 * This test demonstrates:
 * 1. Creating a task with detailed logging
 * 2. Real-time event tracking
 * 3. Resource update notifications
 * 4. Complete audit trail of the Claude process
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface TaskResponse {
  task_id: string;
  title: string;
  status: string;
  tool: string;
  session_id: string;
  created_at: string;
}

interface NotificationData {
  uri?: string;
  message?: string;
  level?: string;
  timestamp?: string;
  progress?: number;
  total?: number;
  progressToken?: string | number;
}

class TaskLoggingTest {
  private client: Client;
  private transport: StdioClientTransport;
  private taskId: string | null = null;
  private resourceUpdateCount = 0;
  private notificationLog: Array<{ time: string; type: string; data: NotificationData | undefined }> = [];
  private startTime: number = 0;

  async initialize() {
    console.log('🚀 Initializing MCP client...');
    
    this.transport = new StdioClientTransport({
      command: 'node',
      args: ['../build/index.js'],
      env: {
        ...process.env,
        PROJECT_ROOT: process.cwd(),
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
      }
    });

    this.client = new Client({
      name: 'task-logging-test',
      version: '1.0.0'
    }, {
      capabilities: {
        notifications: {
          resourceListChanged: true,
          resourceUpdated: true
        }
      }
    });

    // Set up notification handlers
    this.client.setNotificationHandler(async (notification: { method: string; params?: NotificationData }) => {
      const logEntry = {
        time: new Date().toISOString(),
        type: notification.method,
        data: notification.params
      };
      this.notificationLog.push(logEntry);

      if (notification.method === 'notifications/resources/updated' && notification.params?.uri) {
        this.resourceUpdateCount++;
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        console.log(`📡 [${elapsed}s] Resource updated (#${this.resourceUpdateCount}): ${notification.params.uri}`);
        
        // Immediately fetch and display the updated resource
        if (this.taskId && notification.params.uri === `task://${this.taskId}`) {
          await this.displayTaskState();
        }
      } else if (notification.method === 'notifications/resources/list_changed') {
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        console.log(`📋 [${elapsed}s] Resource list changed`);
      }
    });

    await this.client.connect(this.transport);
    console.log('✅ MCP client connected\n');
  }

  async createTask() {
    console.log('📝 Creating a new task...\n');
    this.startTime = Date.now();
    
    const createTaskArgs = {
      title: 'Test Task with World-Class Logging',
      tool: 'CLAUDECODE',
      instructions: `Create a simple Hello World script that:
1. Prints "Hello from Claude!"
2. Shows the current timestamp
3. Saves the output to a file called hello-output.txt
4. Add a test that verifies the file was created
5. Create a JSON configuration file with settings
Please show your work step by step and include JSON output.`,
      branch: 'test/logging-demo'
    };

    console.log('Task parameters:', JSON.stringify(createTaskArgs, null, 2));
    console.log('\n🎯 Calling create_task tool...\n');

    const result = await this.client.callTool('create_task', { arguments: createTaskArgs });
    
    if (result.isError) {
      throw new Error(`Failed to create task: ${JSON.stringify(result)}`);
    }

    const response = JSON.parse(result.content[0].text);
    const taskData = response.result as TaskResponse;
    this.taskId = taskData.task_id;

    console.log('✅ Task created successfully!');
    console.log(`📋 Task ID: ${taskData.task_id}`);
    console.log(`🤖 Session ID: ${taskData.session_id}`);
    console.log(`🌿 Branch: test/logging-demo`);
    console.log(`⏰ Created at: ${taskData.created_at}\n`);

    return taskData;
  }

  async displayTaskState() {
    if (!this.taskId) return;

    const result = await this.client.readResource({ uri: `task://${this.taskId}` });
    if (result.contents && result.contents.length > 0) {
      const task = JSON.parse(result.contents[0].text);
      
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      console.log(`\n📊 [${elapsed}s] Current Task State:`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Last updated: ${task.updated_at}`);
      console.log(`   Total logs: ${task.logs.length}`);
      
      // Show recent logs
      if (task.logs.length > 0) {
        console.log('\n📜 Recent logs:');
        const recentLogs = task.logs.slice(-5);
        recentLogs.forEach((log: string) => {
          // Extract just the message part after the timestamp
          const match = log.match(/\[[\d\-T:.Z]+\] (.+)/);
          const message = match ? match[1] : log;
          console.log(`   ${message}`);
        });
      }
    }
  }

  async displayFullLogs() {
    if (!this.taskId) return;

    console.log('\n\n' + '='.repeat(80));
    console.log('📚 COMPLETE TASK LOGS');
    console.log('='.repeat(80) + '\n');

    const result = await this.client.readResource({ uri: `task://${this.taskId}/logs` });
    if (result.contents && result.contents.length > 0) {
      const logs = result.contents[0].text;
      console.log(logs);
    }

    console.log('\n' + '='.repeat(80));
  }

  async waitForTaskCompletion(maxWaitMs: number = 60000) {
    console.log(`\n⏱️  Waiting for task completion (max ${maxWaitMs / 1000}s)...\n`);
    
    const checkInterval = 2000; // Check every 2 seconds
    let lastLogCount = 0;

    return new Promise<void>((resolve) => {
      const intervalId = setInterval(async () => {
        const elapsed = Date.now() - this.startTime;
        
        if (elapsed >= maxWaitMs) {
          clearInterval(intervalId);
          console.log('\n⏱️  Maximum wait time reached');
          resolve();
          return;
        }

        // Check task status
        if (this.taskId) {
          const result = await this.client.readResource({ uri: `task://${this.taskId}` });
          if (result.contents && result.contents.length > 0) {
            const task = JSON.parse(result.contents[0].text);
            
            // Show progress indicator if logs are growing
            if (task.logs.length > lastLogCount) {
              const elapsedSec = (elapsed / 1000).toFixed(1);
              console.log(`⏳ [${elapsedSec}s] Task active... (${task.logs.length} logs)`);
              lastLogCount = task.logs.length;
            }
            
            if (task.status === 'completed' || task.status === 'failed') {
              const elapsedSec = (elapsed / 1000).toFixed(1);
              console.log(`\n🏁 [${elapsedSec}s] Task ${task.status}!`);
              clearInterval(intervalId);
              resolve();
            }
          }
        }
      }, checkInterval);
    });
  }

  async displayNotificationSummary() {
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 NOTIFICATION SUMMARY');
    console.log('='.repeat(80) + '\n');

    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`Total execution time: ${totalTime}s`);
    console.log(`Total resource updates: ${this.resourceUpdateCount}`);
    console.log(`Total notifications: ${this.notificationLog.length}\n`);

    // Group notifications by type
    const byType = this.notificationLog.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Notifications by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // Show notification timeline
    console.log('\nNotification timeline:');
    this.notificationLog.slice(0, 10).forEach(log => {
      const timestamp = new Date(log.time);
      const elapsed = ((timestamp.getTime() - this.startTime) / 1000).toFixed(1);
      console.log(`  [${elapsed}s] ${log.type}`);
    });

    if (this.notificationLog.length > 10) {
      console.log(`  ... and ${this.notificationLog.length - 10} more`);
    }

    console.log('\n' + '='.repeat(80));
  }

  async displayFinalTaskAnalysis() {
    if (!this.taskId) return;

    console.log('\n\n' + '='.repeat(80));
    console.log('📈 TASK EXECUTION ANALYSIS');
    console.log('='.repeat(80) + '\n');

    const result = await this.client.readResource({ uri: `task://${this.taskId}` });
    if (result.contents && result.contents.length > 0) {
      const task = JSON.parse(result.contents[0].text);
      
      // Analyze log types
      const logTypes: Record<string, number> = {};
      task.logs.forEach((log: string) => {
        const match = log.match(/\[[\d\-T:.Z]+\] \[([^\]]+)\]/);
        if (match) {
          const logType = match[1];
          logTypes[logType] = (logTypes[logType] || 0) + 1;
        }
      });

      console.log('Log entries by type:');
      Object.entries(logTypes)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });

      // Find key events
      console.log('\nKey events detected:');
      const keyEvents = [
        'SESSION_LINKED',
        'BRANCH_CREATED',
        'FILE_CREATED',
        'TESTS_RUNNING',
        'JSON_OUTPUT',
        'TASK_COMPLETED'
      ];

      keyEvents.forEach(event => {
        const found = task.logs.find((log: string) => log.includes(`[${event}]`));
        if (found) {
          const match = found.match(/\[([\d\-T:.Z]+)\]/);
          if (match) {
            const timestamp = new Date(match[1]);
            const elapsed = ((timestamp.getTime() - this.startTime) / 1000).toFixed(1);
            console.log(`  ✓ ${event} at ${elapsed}s`);
          }
        }
      });
    }

    console.log('\n' + '='.repeat(80));
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    await this.client.close();
    await this.transport.close();
    console.log('✅ Test complete!\n');
  }

  async run() {
    try {
      await this.initialize();
      await this.createTask();
      await this.waitForTaskCompletion(60000); // Wait up to 60 seconds
      await this.displayFullLogs();
      await this.displayFinalTaskAnalysis();
      await this.displayNotificationSummary();
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new TaskLoggingTest();
  test.run().catch(console.error);
}

export { TaskLoggingTest };