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

async function stopDaemon(): Promise<void> {
  log('Stopping daemon...', colors.blue);
  
  // Check in the daemon logs directory
  const pidFile = path.join(projectRoot, 'daemon', 'logs', 'daemon.pid');
  
  if (fs.existsSync(pidFile)) {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf-8'));
    try {
      process.kill(pid, 'SIGTERM');
      log(`✓ Daemon stopped (PID: ${pid})`, colors.green);
      fs.unlinkSync(pidFile);
    } catch (e) {
      // Process doesn't exist, remove stale PID file
      fs.unlinkSync(pidFile);
      log('⚠ Daemon was not running (stale PID file removed)', colors.red);
    }
  } else {
    log('⚠ Daemon was not running', colors.red);
  }
}

async function main(): Promise<void> {
  log('\n==== Stopping All Services ====\n', colors.blue);
  
  await stopDocker();
  await stopDaemon();
  
  log('\n✓ All services stopped\n', colors.green);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}