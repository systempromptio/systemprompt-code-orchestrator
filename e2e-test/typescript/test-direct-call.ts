import { createMCPClient } from './test-utils.js';

async function testDirectCall() {
  const client = await createMCPClient();
  
  try {
    console.log('Calling check_status directly...');
    const result = await client.callTool({
      name: 'check_status',
      arguments: {
        test_sessions: false,
        verbose: false
      }
    });
    
    console.log('Raw result:', result);
    console.log('\nContent:', result.content);
    
    if (result.content && Array.isArray(result.content)) {
      result.content.forEach((item, index) => {
        console.log(`\nContent[${index}]:`, item);
        if (item.type === 'text' && item.text) {
          try {
            const parsed = JSON.parse(item.text);
            console.log('Parsed content:', JSON.stringify(parsed, null, 2));
          } catch (e) {
            console.log('Failed to parse as JSON:', e);
          }
        }
      });
    }
  } catch (error) {
    console.error('Error calling tool:', error);
  } finally {
    await client.close();
  }
}

testDirectCall().catch(console.error);