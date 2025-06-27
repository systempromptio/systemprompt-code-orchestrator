import { createMCPClient } from './test-utils.js';

async function testListTools() {
  const client = await createMCPClient();
  
  try {
    console.log('Calling listTools...');
    const toolsResult = await client.listTools();
    console.log('Tools result:', JSON.stringify(toolsResult, null, 2));
    console.log('\nAvailable tools:');
    toolsResult.tools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
    
    // Check if check_status is in the list
    const hasCheckStatus = toolsResult.tools.some(t => t.name === 'check_status');
    console.log(`\ncheck_status tool found: ${hasCheckStatus}`);
  } finally {
    await client.close();
  }
}

testListTools().catch(console.error);