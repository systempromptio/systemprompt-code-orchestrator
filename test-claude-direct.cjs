const net = require('net');

console.log('Testing Claude execution through proxy...');

const client = net.createConnection({ port: 9876, host: '127.0.0.1' }, () => {
  console.log('Connected to proxy');
  
  // Send just the prompt - proxy will add the claude command
  const message = JSON.stringify({
    command: `Create a simple JavaScript file called hello.js that exports a function called greet(name) that returns 'Hello, {name}!'`,
    workingDirectory: '/var/www/html/systemprompt-coding-agent'
  });
  
  console.log('Sending:', message);
  client.write(message + '\n');
});

let buffer = '';
let responseReceived = false;

client.on('data', (data) => {
  buffer += data.toString();
  console.log('Received chunk:', data.toString().substring(0, 100) + '...');
  
  // Try to parse each line
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('Parsed response:', JSON.stringify(response, null, 2));
        
        if (response.type === 'stream' || response.type === 'result' || response.type === 'stdout') {
          responseReceived = true;
          console.log('Got expected response, closing connection...');
          client.end();
        }
      } catch (e) {
        console.log('Failed to parse line:', line);
      }
    }
  }
});

client.on('end', () => {
  console.log('Connection closed');
  if (!responseReceived) {
    console.log('No response received!');
    process.exit(1);
  } else {
    console.log('Test successful!');
    process.exit(0);
  }
});

client.on('error', (err) => {
  console.error('Connection error:', err);
  process.exit(1);
});

// Timeout after 60 seconds
setTimeout(() => {
  console.log('Test timeout after 60 seconds');
  client.destroy();
  process.exit(1);
}, 60000);