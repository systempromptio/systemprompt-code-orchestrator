const net = require('net');

const client = net.createConnection({ port: 9876, host: '127.0.0.1' }, () => {
  console.log('Connected to proxy');
  
  const message = JSON.stringify({
    command: 'pwd',
    workingDirectory: '/var/www/html/systemprompt-coding-agent'
  });
  
  client.write(message);
});

let buffer = '';
client.on('data', (data) => {
  buffer += data.toString();
  console.log('Received data:', data.toString());
});

client.on('end', () => {
  console.log('Connection closed');
  console.log('Final buffer:', buffer);
});

client.on('error', (err) => {
  console.error('Error:', err);
});

setTimeout(() => {
  console.log('Timeout - closing connection');
  client.end();
}, 5000);