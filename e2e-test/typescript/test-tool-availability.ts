/**
 * Test tool availability validation
 */

import { createMCPClient, log } from './test-utils.js';

async function main() {
  const client = await createMCPClient();
  
  log.info('Testing tool availability validation...');
  
  try {
    // First, list tools to see what's available
    const tools = await client.listTools();
    const createTask = tools.tools.find(t => t.name === 'create_task');
    
    if (createTask && createTask.inputSchema.type === 'object' && createTask.inputSchema.properties) {
      log.info('create_task tool found');
      log.info('Description: ' + createTask.description);
      
      const toolProp = createTask.inputSchema.properties.tool;
      if (toolProp && typeof toolProp === 'object' && 'enum' in toolProp && 'description' in toolProp) {
        const toolEnum = (toolProp as { enum: string[]; description: string }).enum;
        log.info('Available tools in enum: ' + JSON.stringify(toolEnum));
        
        const toolDescription = (toolProp as { enum: string[]; description: string }).description;
        log.info('Tool field description: ' + toolDescription);
      }
    }
    
    // Test 1: Try to create a task with Claude (should work)
    log.info('\nTest 1: Creating task with CLAUDECODE...');
    try {
      const claudeResult = await client.callTool({
        name: 'create_task',
        arguments: {
          title: 'Test Claude Availability',
          tool: 'CLAUDECODE',
          instructions: 'Say hello',
          branch: 'test-claude-' + Date.now()
        }
      });
      
      if (!claudeResult.content || !Array.isArray(claudeResult.content) || claudeResult.content.length === 0) {
        throw new Error('Invalid response format');
      }
      const firstContent = claudeResult.content[0];
      if (!firstContent || typeof firstContent !== 'object' || !('text' in firstContent)) {
        throw new Error('Invalid content format');
      }
      const content = JSON.parse(firstContent.text as string);
      if (content.status === 'error') {
        log.error('Claude task failed: ' + content.message);
      } else {
        log.success('Claude task created: ' + content.result.task_id);
      }
    } catch (error) {
      log.error('Claude test error: ' + error);
    }
    
    // Test 2: Try to create a task with Gemini 
    log.info('\nTest 2: Creating task with GEMINICLI...');
    try {
      const geminiResult = await client.callTool({
        name: 'create_task',
        arguments: {
          title: 'Test Gemini Availability',
          tool: 'GEMINICLI',
          instructions: 'Say hello',
          branch: 'test-gemini-' + Date.now()
        }
      });
      
      if (!geminiResult.content || !Array.isArray(geminiResult.content) || geminiResult.content.length === 0) {
        throw new Error('Invalid response format');
      }
      const firstContent = geminiResult.content[0];
      if (!firstContent || typeof firstContent !== 'object' || !('text' in firstContent)) {
        throw new Error('Invalid content format');
      }
      const content = JSON.parse(firstContent.text as string);
      if (content.status === 'error') {
        if (content.error?.type === 'tool_not_available') {
          log.warning('Gemini not available (expected if not installed): ' + content.message);
          log.info('Available tools: ' + JSON.stringify(content.error.details.available_tools));
        } else {
          log.error('Gemini task failed: ' + content.message);
        }
      } else {
        log.success('Gemini task created: ' + content.result.task_id);
      }
    } catch (error) {
      log.error('Gemini test error: ' + error);
    }
    
    // Test 3: Try with invalid tool name
    log.info('\nTest 3: Testing with invalid tool name...');
    try {
      await client.callTool({
        name: 'create_task',
        arguments: {
          title: 'Test Invalid Tool',
          tool: 'INVALID_TOOL' as 'CLAUDECODE' | 'GEMINICLI',
          instructions: 'This should fail',
          branch: 'test-invalid-' + Date.now()
        }
      });
      
      log.error('Expected validation error but got result');
    } catch (error) {
      log.success('Got expected error for invalid tool: ' + (error instanceof Error ? error.message : String(error)));
    }
    
  } catch (error) {
    log.error('Test failed: ' + error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);