import { createMCPClient, log } from './test-utils.js';

async function testCheckStatus() {
  log.info('Testing check_status tool');
  
  const client = await createMCPClient();
  
  try {
    // Test check_status with no parameters
    log.info('Calling check_status tool...');
    const result = await client.callTool({
      name: 'check_status',
      arguments: {}  // Empty object - no parameters
    });

    log.success('check_status completed successfully');
    log.info('Result: ' + JSON.stringify(result, null, 2));

    // Parse the response
    const content = result.content as any[];
    const statusData = JSON.parse(content[0].text);
    
    log.info('Status: ' + statusData.result?.status);
    log.info('Services:');
    log.info('  - Claude: ' + statusData.result?.services?.claude?.status);
    log.info('  - Gemini: ' + statusData.result?.services?.gemini?.status);
    
    log.success('Test completed successfully!');

  } catch (error) {
    log.error('Error: ' + error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the test
testCheckStatus().catch(console.error);