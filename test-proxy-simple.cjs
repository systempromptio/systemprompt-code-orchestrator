const net = require('net');

const client = net.createConnection({ port: 9876, host: '127.0.0.1' }, () => {
  console.log('Connected to proxy');
  
  // Keep connection alive
  client.setKeepAlive(true, 1000);
  client.setTimeout(0);
  
  const message = JSON.stringify({
    command: 'Just say "Hello from Claude" and nothing else',
    workingDirectory: '/tmp'
  });
  
  console.log('Sending:', message);
  client.write(message, (err) => {
    if (err) {
      console.error('Error writing:', err);
    } else {
      console.log('Message sent successfully');
    }
  });
});

let buffer = '';
client.on('data', (data) => {
  buffer += data.toString();
  console.log('Received data:', data.toString());
  
  // Check if we have a complete message
  if (buffer.includes('\n')) {
    try {
      const response = JSON.parse(buffer.trim());
      console.log('Parsed response:', response);
      client.end();
    } catch (e) {
      console.log('Failed to parse:', e.message);
    }
  }
});

client.on('end', () => {
  console.log('Connection closed');
});

client.on('error', (err) => {
  console.error('Error:', err);
});

// Timeout after 90 seconds to give Claude time to respond
setTimeout(() => {
  console.log('Timeout - closing connection');
  client.end();
}, 90000);