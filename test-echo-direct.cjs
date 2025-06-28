const net = require('net');

console.log('Testing echo command through proxy...');

const client = net.createConnection({ port: 9876, host: '127.0.0.1' }, () => {
  console.log('Connected to proxy');
  
  // Send a simple echo command that won't trigger Claude
  const message = JSON.stringify({
    command: `echo "Hello from proxy test"`,
    workingDirectory: '/var/www/html/systemprompt-coding-agent'
  });
  
  console.log('Sending:', message);
  client.write(message + '\n');
});

let buffer = '';
let responseReceived = false;

client.on('data', (data) => {
  buffer += data.toString();
  console.log('Received chunk:', data.toString());
  
  // Try to parse each line
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('Parsed response:', JSON.stringify(response, null, 2));
        responseReceived = true;
      } catch (e) {
        console.log('Failed to parse line:', line);
      }
    }
  }
});

// Wait a bit then close
setTimeout(() => {
  console.log('Closing connection...');
  client.end();
}, 2000);

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