#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'claude-proxy.log');
const pidFile = path.join(logsDir, 'proxy.pid');

// Open log file for append
const out = fs.openSync(logFile, 'a');
const err = fs.openSync(logFile, 'a');

// Spawn the proxy process with inherited environment
const child = spawn('node', [path.join(__dirname, 'claude-host-proxy.js')], {
  detached: true,
  stdio: ['ignore', out, err],
  env: process.env  // Pass all environment variables
});

// Write PID file
fs.writeFileSync(pidFile, child.pid.toString());

// Detach the child process
child.unref();

console.log(`Claude proxy started with PID: ${child.pid}`);
console.log(`Log file: ${logFile}`);

process.exit(0);