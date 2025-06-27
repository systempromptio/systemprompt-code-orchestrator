import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function testCompleteWorkflow() {
  console.log("=== E2E Test: Complete MCP Orchestrator Workflow ===\n");
  
  // 1. Connect to existing MCP server
  console.log("1. Connecting to existing MCP server...");
  
  const MCP_BASE_URL = process.env.MCP_BASE_URL || `http://127.0.0.1:${process.env.PORT || '3000'}`;
  
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
    name: "test-complete-workflow",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  console.log("✓ Connected to MCP server at", MCP_BASE_URL, "\n");

  try {
    // 2. List available tools
    console.log("2. Listing available tools:");
    const tools = await client.listTools();
    const orchestratorTools = tools.tools.filter(tool => 
      tool.name.includes('orchestrator') || tool.name.includes('task')
    );
    console.log("Found orchestrator tools:");
    orchestratorTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log();

    // 3. Create 3 test tasks simultaneously
    console.log("3. Creating 3 tasks simultaneously on different branches...");
    const timestamp = Date.now();
    
    const taskPromises = [
      // Task 1: Create a JavaScript test file
      client.callTool({
        name: "create_task",
        arguments: {
          title: "Generate JavaScript Test File",
          description: "Create a JavaScript test file with unit tests",
          model: "claude",
          command: `Create a test file called 'mcp-test-js-${timestamp}.js' with:
            1. A function that calculates fibonacci numbers
            2. Unit tests for the function
            3. Proper JSDoc comments`,
          project_path: "/var/www/html/systemprompt-coding-agent",
          branch: `feature/js-tests-${timestamp}`,
          requirements: [
            "Create JavaScript test file",
            "Include fibonacci function",
            "Add unit tests",
            "Add JSDoc documentation"
          ],
          priority: "high",
          start_immediately: true,
          context: {
            system_prompt: "You are creating JavaScript test files. Be efficient and focus on the task."
          }
        }
      }),
      
      // Task 2: Create a TypeScript module
      client.callTool({
        name: "create_task",
        arguments: {
          title: "Generate TypeScript Module",
          description: "Create a TypeScript module with interfaces and classes",
          model: "claude",
          command: `Create a TypeScript file called 'mcp-module-${timestamp}.ts' with:
            1. An interface for a Task
            2. A class that implements task management
            3. Export the module properly`,
          project_path: "/var/www/html/systemprompt-coding-agent",
          branch: `feature/ts-module-${timestamp}`,
          requirements: [
            "Create TypeScript file",
            "Define Task interface",
            "Implement TaskManager class",
            "Export module"
          ],
          priority: "medium",
          start_immediately: true,
          context: {
            system_prompt: "You are creating TypeScript modules. Focus on type safety and clean code."
          }
        }
      }),
      
      // Task 3: Create configuration files
      client.callTool({
        name: "create_task",
        arguments: {
          title: "Generate Configuration Files",
          description: "Create configuration files for the MCP system",
          model: "claude",
          command: `Create a configuration file called 'mcp-config-${timestamp}.json' with:
            1. Server configuration settings
            2. Tool configurations
            3. Environment settings`,
          project_path: "/var/www/html/systemprompt-coding-agent",
          branch: `feature/config-${timestamp}`,
          requirements: [
            "Create JSON config file",
            "Include server settings",
            "Add tool configurations",
            "Document each setting"
          ],
          priority: "low",
          start_immediately: true,
          context: {
            system_prompt: "You are creating configuration files. Use clear, well-documented JSON."
          }
        }
      })
    ];
    
    // Execute all tasks in parallel
    console.log("Sending all 3 task creation requests...");
    const createResults = await Promise.all(taskPromises);
    
    // Extract task IDs
    const taskIds = createResults.map((result, index) => {
      const parsed = JSON.parse((result.content as any)[0].text);
      const taskId = parsed.result.task_id;
      console.log(`✓ Task ${index + 1} created with ID: ${taskId}`);
      console.log(`  - Title: ${parsed.result.title}`);
      console.log(`  - Branch: ${[`feature/js-tests-${timestamp}`, `feature/ts-module-${timestamp}`, `feature/config-${timestamp}`][index]}`);
      console.log(`  - Status: ${parsed.result.status}`);
      return taskId;
    });
    
    console.log(`\n✓ All 3 tasks created successfully\n`);

    // 4. Wait for tasks to complete their work
    console.log("4. Waiting for tasks to create files (30 seconds)...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds for Claude to work

    // 5. Get report for all tasks
    console.log("5. Getting report for all 3 tasks...");
    const reportResult = await client.callTool({
      name: "report_task",
      arguments: { 
        task_ids: taskIds,
        report_type: "detailed"
      }
    });
    
    const report = JSON.parse((reportResult.content as any)[0].text);
    console.log(`\nTask Report Summary:`);
    console.log(`Total tasks: ${report.result.tasks.length}`);
    
    report.result.tasks.forEach((task: any, index: number) => {
      console.log(`\nTask ${index + 1}:`);
      console.log(`  ID: ${task.id}`);
      console.log(`  Title: ${task.title}`);
      console.log(`  Status: ${task.status}`);
      console.log(`  Branch: ${task.branch}`);
      console.log(`  Progress: ${task.progress}%`);
      console.log(`  Model: ${task.model}`);
      console.log(`  Session ID: ${task.session_id}`);
      
      if (task.logs && task.logs.length > 0) {
        console.log(`  Recent logs:`);
        task.logs.slice(-3).forEach((log: string) => {
          console.log(`    - ${log}`);
        });
      }
    });
    console.log();

    // 6. Check overall system status
    console.log("6. Checking overall system status...");
    const statusResult = await client.callTool({
      name: "check_status",
      arguments: {}
    });
    
    const status = JSON.parse((statusResult.content as any)[0].text);
    console.log("\nSystem Status:");
    console.log(`  Overall: ${status.result.status}`);
    console.log(`  Total tasks: ${status.result.tasks.total}`);
    console.log(`  Tasks by status:`);
    Object.entries(status.result.tasks.by_status).forEach(([status, count]) => {
      console.log(`    - ${status}: ${count}`);
    });
    
    console.log(`\n  Active tasks (${status.result.tasks.active_tasks.length}):`);
    status.result.tasks.active_tasks.slice(0, 5).forEach((task: any) => {
      console.log(`    - ${task.title} (${task.id.substring(0, 8)}...) on branch ${task.branch}`);
    });
    console.log();

    // 7. End all created tasks
    console.log("7. Ending all 3 task sessions...");
    const endPromises = taskIds.map((taskId, index) => 
      client.callTool({
        name: "end_task",
        arguments: { 
          task_id: taskId,
          reason: "Test completed successfully"
        }
      }).then(() => {
        console.log(`✓ Task ${index + 1} session ended`);
      })
    );
    
    await Promise.all(endPromises);
    console.log("✓ All task sessions ended\n");

    console.log("=== E2E Test Complete! ===");
    console.log(`Created 3 tasks on separate branches:`);
    console.log(`  - feature/js-tests-${timestamp}`);
    console.log(`  - feature/ts-module-${timestamp}`);
    console.log(`  - feature/config-${timestamp}`);
    console.log("\nThe MCP orchestrator successfully:");
    console.log("  1. Created 3 tasks simultaneously");
    console.log("  2. Started Claude sessions on the host for each task");
    console.log("  3. Managed parallel task execution");
    console.log("  4. Provided detailed reporting");
    console.log("  5. Cleaned up all sessions");

  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the test
testCompleteWorkflow().catch(console.error);