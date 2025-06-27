#!/usr/bin/env node

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

async function demonstrateCompleteFlow() {
  console.log("=== E2E DEMONSTRATION: Complete MCP Orchestrator Flow ===\n");
  
  const MCP_BASE_URL = process.env.MCP_BASE_URL || 'http://127.0.0.1:3000';
  
  const transport = new StreamableHTTPClientTransport(
    new URL('/mcp', MCP_BASE_URL),
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
    name: "demo-flow-test",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  console.log("✓ Connected to MCP server at", MCP_BASE_URL, "\n");

  try {
    // Step 1: Create a single task with clear file creation
    console.log("STEP 1: Creating task to generate test file...");
    const timestamp = Date.now();
    const branchName = `demo/test-files-${timestamp}`;
    
    const createResult = await client.callTool({
      name: "create_task",
      arguments: {
        title: "Demo: Create Test File",
        description: "Demonstrate complete flow with file creation",
        model: "claude",
        command: `Create a file called test-demo-${timestamp}.js with the following content:
// Test file created by MCP Orchestrator
// Timestamp: ${timestamp}
// Branch: ${branchName}

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Test the function
console.log('Fibonacci sequence:');
for (let i = 0; i < 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}

module.exports = { fibonacci };
`,
        project_path: "/var/www/html/systemprompt-coding-agent",
        branch: branchName,
        requirements: [
          "Create the test file with the exact content provided",
          "Save it in the project root",
          "Ensure the file is properly formatted"
        ],
        priority: "high",
        start_immediately: true
      }
    });
    
    const taskResult = JSON.parse(createResult.content[0].text);
    const taskId = taskResult.result.task_id;
    console.log(`✓ Task created: ${taskId}`);
    console.log(`  Branch: ${branchName}`);
    console.log(`  Session: ${taskResult.result.session_id}\n`);

    // Step 2: Monitor progress
    console.log("STEP 2: Monitoring task progress...");
    let checkCount = 0;
    let taskCompleted = false;
    
    while (checkCount < 20 && !taskCompleted) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      // Get task report
      const reportResult = await client.callTool({
        name: "report_task",
        arguments: { 
          task_ids: [taskId],
          report_type: "detailed"
        }
      });
      
      const report = JSON.parse(reportResult.content[0].text);
      const task = report.result.tasks[0];
      
      console.log(`  Check ${++checkCount}: Status=${task.status}, Progress=${task.progress}%`);
      
      if (task.logs && task.logs.length > 0) {
        console.log(`  Latest log: ${task.logs[task.logs.length - 1]}`);
      }
      
      if (task.status === 'completed' || task.status === 'failed') {
        taskCompleted = true;
      }
    }
    
    // Step 3: Check resources
    console.log("\nSTEP 3: Checking task output resources...");
    const resources = await client.listResources();
    const taskOutputResource = resources.resources.find(r => 
      r.uri.includes('task-output') && r.uri.includes(taskId)
    );
    
    if (taskOutputResource) {
      console.log(`✓ Found task output resource: ${taskOutputResource.name}`);
      
      const outputResult = await client.readResource({
        uri: taskOutputResource.uri
      });
      
      const output = JSON.parse(outputResult.contents[0].text);
      console.log("\nTask Output Summary:");
      console.log(`  Status: ${output.task.status}`);
      console.log(`  Branch: ${output.task.branch}`);
      console.log(`  Stream output lines: ${output.stream_output.split('\n').length}`);
      console.log(`  Total logs: ${output.logs.length}`);
      
      if (output.stream_output) {
        console.log("\nStream Output Preview:");
        const lines = output.stream_output.split('\n').slice(0, 10);
        lines.forEach(line => console.log(`  > ${line}`));
      }
    }
    
    // Step 4: Check if file was created
    console.log("\nSTEP 4: Verifying file creation...");
    console.log(`Checking branch: ${branchName}`);
    console.log(`Expected file: test-demo-${timestamp}.js`);
    
    // End task
    await client.callTool({
      name: "end_task",
      arguments: { 
        task_id: taskId,
        reason: "Demo completed"
      }
    });
    console.log("\n✓ Task ended");
    
    console.log("\n=== DEMONSTRATION COMPLETE ===");
    console.log("\nTo verify the results:");
    console.log(`1. Check out the branch: git checkout ${branchName}`);
    console.log(`2. Look for the file: ls -la test-demo-${timestamp}.js`);
    console.log(`3. View the file content: cat test-demo-${timestamp}.js`);
    
  } catch (error) {
    console.error("\nError:", error);
  } finally {
    await client.close();
  }
}

// Run the demonstration
demonstrateCompleteFlow().catch(console.error);