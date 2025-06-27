const net = require('net');

const client = net.createConnection({ port: 9876, host: '127.0.0.1' }, () => {
  console.log('Connected to proxy');
  
  // Keep connection alive
  client.setKeepAlive(true, 1000);
  client.setTimeout(0);
  
  const message = JSON.stringify({
    command: 'Write a simple Python function that calculates factorial',
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
  
  // Process line-delimited JSON
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        
        switch (response.type) {
          case 'stream':
            console.log('[STREAM]', response.data);
            break;
          case 'error':
            console.error('[ERROR]', response.data);
            break;
          case 'complete':
            console.log('[COMPLETE] Process exited with code:', response.code);
            client.end();
            break;
          default:
            console.log('[UNKNOWN]', response);
        }
      } catch (e) {
        console.error('Failed to parse line:', e.message, 'Line:', line);
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

// No timeout - let it run until completion
process.on('SIGINT', () => {
  console.log('\nClosing connection...');
  client.end();
  process.exit(0);
});