#!/usr/bin/env node

/**
 * stop-all.ts - Stop all services gracefully
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m'
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

async function stopDocker(): Promise<void> {
  log('Stopping Docker services...', colors.blue);
  
  return new Promise((resolve) => {
    const docker = spawn('docker-compose', ['down'], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true
    });
    
    docker.on('close', (code: number | null) => {
      if (code === 0) {
        log('✓ Docker services stopped', colors.green);
      } else {
        log('⚠ Failed to stop Docker services', colors.red);
      }
      resolve();
    });
  });
}

async function stopProxy(): Promise<void> {
  log('Stopping proxy...', colors.blue);
  
  const pidFile = path.join(projectRoot, 'logs', 'proxy.pid');
  if (fs.existsSync(pidFile)) {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf-8'));
    try {
      process.kill(pid, 'SIGTERM');
      log(`✓ Proxy stopped (PID: ${pid})`, colors.green);
      fs.unlinkSync(pidFile);
    } catch (e) {
      log('⚠ Proxy was not running', colors.red);
    }
  } else {
    log('ℹ No proxy PID file found', colors.blue);
  }
}

async function main(): Promise<void> {
  log('\n==== Stopping All Services ====\n', colors.blue);
  
  await stopDocker();
  await stopProxy();
  
  log('\n✓ All services stopped\n', colors.green);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}