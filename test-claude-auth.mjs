import { query } from '@anthropic-ai/claude-code';

async function testClaudeAuth() {
  try {
    console.log('Testing Claude Code SDK authentication...');
    console.log('ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY);
    console.log('USER:', process.env.USER);
    console.log('HOME:', process.env.HOME);
    
    // Check if there's a Claude config file
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.join(process.env.HOME || '', '.config', 'claude');
    
    try {
      if (fs.existsSync(configPath)) {
        console.log('Claude config directory exists:', configPath);
      }
    } catch (e) {
      console.log('No Claude config directory found');
    }
    
    const messages = [];
    const abortController = new AbortController();
    
    console.log('Starting query without API key...');
    for await (const message of query({
      prompt: 'echo "Hello from authenticated Claude"',
      abortController,
      options: {
        cwd: process.cwd()
      }
    })) {
      console.log('Message type:', message.type);
      if (message.type === 'assistant' && message.message) {
        console.log('Assistant content:', JSON.stringify(message.message.content, null, 2));
      }
      messages.push(message);
    }
    
    console.log('Query completed successfully');
    console.log('Total messages:', messages.length);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testClaudeAuth();