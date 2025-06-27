import { createMCPClient } from './test-utils.js';

async function checkTools() {
  const client = await createMCPClient();
  
  try {
    const toolsResult = await client.listTools();
    console.log('Available tools:');
    toolsResult.tools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
  } finally {
    await client.close();
  }
}

checkTools().catch(console.error);