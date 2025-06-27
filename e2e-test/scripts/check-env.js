#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env file not found in e2e-test directory');
  console.error('Please create e2e-test/.env with your MCP_ACCESS_TOKEN');
  process.exit(1);
}

// Read and parse .env file
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

// Check for required MCP_ACCESS_TOKEN
if (!envVars.MCP_ACCESS_TOKEN) {
  console.error('❌ Error: MCP_ACCESS_TOKEN is not set in .env file');
  console.error('');
  console.error('To run the tests, you must obtain a valid OAuth token:');
  console.error('1. Start the MCP server');
  console.error('2. Go through the OAuth flow to authenticate with Reddit');
  console.error('3. Copy the JWT token and set it as MCP_ACCESS_TOKEN in e2e-test/.env');
  console.error('');
  console.error('Note: OAuth tokens are valid for 24 hours');
  process.exit(1);
}

console.log('✅ MCP_ACCESS_TOKEN found in .env file');