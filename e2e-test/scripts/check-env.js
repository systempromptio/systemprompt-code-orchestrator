#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env file not found in e2e-test directory');
  console.error('Please create e2e-test/.env with your configuration');
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

console.log('✅ .env file found and loaded');

// Optional: Set MCP_BASE_URL if provided
if (envVars.MCP_BASE_URL) {
  console.log(`✅ MCP_BASE_URL set to: ${envVars.MCP_BASE_URL}`);
} else {
  console.log('ℹ️  MCP_BASE_URL not set, will use default: http://localhost:3000');
}