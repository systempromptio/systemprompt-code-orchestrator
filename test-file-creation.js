// Simple test to verify Claude can create files
const fs = require('fs');
const path = require('path');

console.log('Current directory:', process.cwd());
console.log('Writing test file...');

const content = `// Test file created by direct script
const timestamp = ${Date.now()};
console.log('Hello from test file!');
console.log('Timestamp:', timestamp);
`;

const filename = `test-direct-${Date.now()}.js`;
fs.writeFileSync(filename, content);

console.log(`✓ File created: ${filename}`);
console.log('File contents:');
console.log(fs.readFileSync(filename, 'utf8'));