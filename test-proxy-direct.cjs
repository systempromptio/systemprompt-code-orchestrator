const net = require('net');

console.log('Testing direct proxy connection...');

const client = net.createConnection({ port: 9876, host: '127.0.0.1' }, () => {
  console.log('Connected to proxy');
  
  const message = JSON.stringify({
    command: 'echo "Hello from Claude proxy test"',
    workingDirectory: '/var/www/html/systemprompt-coding-agent'
  });
  
  console.log('Sending:', message);
  client.write(message);
});

client.on('data', (data) => {
  console.log('Received:', data.toString());
});

client.on('end', () => {
  console.log('Connection closed');
});

client.on('error', (err) => {
  console.error('Connection error:', err);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('Test timeout - closing connection');
  client.end();
  process.exit(1);
}, 10000);