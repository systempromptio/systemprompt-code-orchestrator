const net = require('net');

console.log('Testing proxy with simple echo command...');

const client = net.createConnection({ port: 9876, host: '127.0.0.1' }, () => {
  console.log('Connected to proxy');
  
  const message = JSON.stringify({
    command: 'echo "Hello from test"',
    workingDirectory: '/var/www/html/systemprompt-coding-agent'
  });
  
  console.log('Sending:', message);
  client.write(message);
});

let responseBuffer = '';

client.on('data', (data) => {
  responseBuffer += data.toString();
  console.log('Received chunk:', data.toString());
  
  // Try to parse line-delimited JSON responses
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || ''; // Keep incomplete line
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('Parsed response:', response);
        
        if (response.type === 'complete') {
          console.log('Command completed with code:', response.code);
          client.end();
          process.exit(0);
        }
      } catch (e) {
        console.error('Failed to parse line:', line);
      }
    }
  }
});

client.on('end', () => {
  console.log('Connection closed');
});

client.on('error', (err) => {
  console.error('Connection error:', err);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('Test timeout - closing connection');
  client.end();
  process.exit(1);
}, 30000);