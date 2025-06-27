import { createMCPClient } from './test-utils.js';

async function checkCreateTaskSchema() {
  const client = await createMCPClient();
  
  try {
    const toolsResult = await client.listTools();
    const createTaskTool = toolsResult.tools.find(t => t.name === 'create_task');
    
    if (createTaskTool) {
      console.log('create_task tool schema:');
      console.log(JSON.stringify(createTaskTool.inputSchema, null, 2));
      
      // Check if branch is in required fields
      const required = (createTaskTool.inputSchema as any).required;
      console.log('\nRequired fields:', required);
      console.log('Branch is required:', required?.includes('branch'));
      
      // Check if branch property exists
      const properties = (createTaskTool.inputSchema as any).properties;
      console.log('\nBranch property:', properties?.branch);
    } else {
      console.error('create_task tool not found!');
    }
  } finally {
    await client.close();
  }
}

checkCreateTaskSchema().catch(console.error);