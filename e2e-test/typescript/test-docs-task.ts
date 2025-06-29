/**
 * @file Test creating documentation task
 * @module test-docs-task
 *
 * @remarks
 * Tests creating a documentation file for the project
 */

import { createMCPClient, log } from "./test-utils.js";
import * as path from "path";
import * as fs from "fs/promises";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test creating documentation
 */
async function testCreateDocumentation(): Promise<void> {
  const client = await createMCPClient(true);
  log.success("Connected to MCP server");

  try {
    const timestamp = Date.now();
    const branchName = `docs-test-${timestamp}`;

    // Create the task
    log.section("Creating Documentation Task");

    console.log("Instructions: Write a short paragraph explaining this project to docs/task.md\n");

    const result = await client.callTool({
      name: "create_task",
      arguments: {
        title: "Create Project Documentation",
        tool: "CLAUDECODE",
        instructions: "Write a short paragraph explaining this project to docs/task.md",
        branch: branchName,
      },
    });

    const content = result.content as any[];
    const taskData = JSON.parse(content[0].text as string);
    const taskId = taskData.result.task_id;

    log.success(`Task created: ${taskId}`);
    log.info(`Branch: ${branchName}`);

    // Wait for task to complete
    log.info("\nWaiting for task to complete...");

    let status = "in_progress";
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds

    while (status === "in_progress" && attempts < maxAttempts) {
      await sleep(1000);
      attempts++;

      try {
        const taskUri = `task://${taskId}`;
        const taskResource = await client.readResource({ uri: taskUri });

        if (taskResource.contents?.[0]?.text) {
          const taskInfo = JSON.parse(taskResource.contents[0].text as string);
          status = taskInfo.status;

          process.stdout.write(`\r⏳ Status: ${status} | Elapsed: ${attempts}s`);

          if (status === "completed" || status === "failed") {
            console.log(`\n\n✨ Task ${status}!\n`);

            // Show last few logs
            if (taskInfo.logs && taskInfo.logs.length > 0) {
              console.log("Recent logs:");
              const recentLogs = taskInfo.logs.slice(-5);
              recentLogs.forEach((log: string) => {
                console.log(`  ${log}`);
              });
            }
          }
        }
      } catch (e) {
        // Continue waiting
      }
    }

    if (status === "in_progress") {
      console.log("\n\n⚠️  Task did not complete within timeout");
    }

    // Check if file was created
    const projectRoot = process.env.PROJECT_ROOT || "/var/www/html/systemprompt-coding-agent";
    const docsPath = path.join(projectRoot, "docs", "task.md");

    try {
      log.section("Checking Created File");

      const fileContent = await fs.readFile(docsPath, "utf8");
      log.success("File created successfully!");

      console.log("\n📄 File Content:");
      console.log("─".repeat(60));
      console.log(fileContent);
      console.log("─".repeat(60));

      // Get file stats
      const stats = await fs.stat(docsPath);
      console.log(`\nFile size: ${stats.size} bytes`);
      console.log(`Created: ${stats.birthtime.toLocaleString()}`);
    } catch (error) {
      log.error("File was not created or could not be read");
      console.log(`Expected path: ${docsPath}`);
    }

    // Check git status
    try {
      log.section("Git Status");

      const { execSync } = await import("child_process");
      const gitStatus = execSync("git status --porcelain", {
        cwd: projectRoot,
        encoding: "utf8",
      });

      console.log("Changed files:");
      console.log(gitStatus || "(no changes)");

      // Show diff for docs/task.md if it exists
      if (gitStatus.includes("docs/task.md")) {
        console.log("\nGit diff for docs/task.md:");
        console.log("─".repeat(60));
        try {
          const diff = execSync("git diff docs/task.md", {
            cwd: projectRoot,
            encoding: "utf8",
          });
          console.log(diff || "(file is new)");
        } catch (e) {
          // File is new
          console.log("(new file)");
        }
        console.log("─".repeat(60));
      }
    } catch (error) {
      log.warning("Could not check git status");
    }

    // End the task
    try {
      await client.callTool({
        name: "end_task",
        arguments: {
          task_id: taskId,
        },
      });
      log.success("\nTask ended successfully");
    } catch (e) {
      log.warning("Could not end task");
    }
  } catch (error) {
    log.error(`Test failed: ${error}`);
  } finally {
    await client.close();
  }
}

// Run the test
testCreateDocumentation()
  .then(() => {
    log.success('\nTest completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
