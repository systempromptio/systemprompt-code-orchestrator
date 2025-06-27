import { query } from '@anthropic-ai/claude-code';

async function testClaudeCode() {
  try {
    console.log('Testing Claude Code SDK...');
    console.log('ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY);
    
    const messages = [];
    const abortController = new AbortController();
    
    console.log('Starting query...');
    for await (const message of query({
      prompt: 'echo "Hello from Claude Code SDK"',
      abortController,
      options: {
        cwd: process.cwd()
      }
    })) {
      console.log('Message type:', message.type);
      if (message.type === 'assistant' && message.message) {
        console.log('Assistant content:', message.message.content);
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

testClaudeCode();