#!/usr/bin/env node

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function testFixedArchitecture() {
  console.log('Testing Fixed Architecture...\n');
  
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js'],
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });
  
  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });
  
  await client.connect(transport);
  
  // Test 1: Check status
  console.log('1. Checking system status...');
  const statusResult = await client.callTool({
    name: 'check_status',
    arguments: {}
  });
  
  const statusData = JSON.parse(statusResult.content[0].text);
  console.log('   File root:', statusData.result.file_root.path);
  console.log('   Claude available:', statusData.result.services.claude.cli_available);
  console.log('');
  
  // Test 2: Create a task with branch
  console.log('2. Creating task with branch...');
  const taskResult = await client.callTool({
    name: 'create_task',
    arguments: {
      title: 'Test Architecture Fix',
      description: 'Verify Claude Code runs on host with user project path',
      model: 'claude',
      command: 'pwd && git status',
      project_path: process.cwd(), // Use current directory as project
      branch: `test/architecture-fix-${Date.now()}`,
      priority: 'medium',
      start_immediately: true
    }
  });
  
  const taskData = JSON.parse(taskResult.content[0].text);
  console.log('   Task ID:', taskData.result.task_id);
  console.log('   Session ID:', taskData.result.session_id);
  console.log('');
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 3: Check task report
  console.log('3. Getting task report...');
  const reportResult = await client.callTool({
    name: 'report_task',
    arguments: {
      task_ids: [taskData.result.task_id],
      report_type: 'detailed'
    }
  });
  
  const reportData = JSON.parse(reportResult.content[0].text);
  const task = reportData.result.tasks[0];
  console.log('   Task status:', task.status);
  console.log('   Task branch:', task.branch);
  console.log('   Session assigned:', task.assigned_to);
  console.log('   Logs:');
  task.logs.forEach(log => console.log('     -', log));
  console.log('');
  
  await client.close();
  console.log('Test complete!');
}

testFixedArchitecture().catch(console.error);