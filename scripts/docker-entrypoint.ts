#!/usr/bin/env node

/**
 * Docker Entrypoint Script - TypeScript Version
 * Initializes the Docker container environment and starts the server
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { spawn } from 'child_process';

class DockerEntrypoint {
  private stateDirectories = [
    '/data/state/tasks',
    '/data/state/sessions', 
    '/data/state/logs',
    '/data/state/reports'
  ];

  private projectsPath = '/data/projects';
  
  constructor() {
    this.initializeEnvironment();
  }

  private log(message: string): void {
    console.log(message);
  }

  private error(message: string): void {
    console.error(`ERROR: ${message}`);
  }

  private success(message: string): void {
    console.log(`✓ ${message}`);
  }

  private warning(message: string): void {
    console.log(`Warning: ${message}`);
  }

  private initializeEnvironment(): void {
    this.log('Initializing state directories...');
    
    // Ensure all directories exist
    [...this.stateDirectories, this.projectsPath].forEach(dir => {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        this.error(`Failed to create directory ${dir}: ${err}`);
      }
    });

    // Check write permissions
    const testFile = '/data/state/.write-test';
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      this.success('State directory is writable: /data/state');
    } catch (err) {
      this.warning('Cannot write to /data/state. Falling back to local directory.');
      process.env.STATE_PATH = './coding-agent-state';
      
      // Create local directories
      const localDirs = this.stateDirectories.map(dir => 
        dir.replace('/data/state', './coding-agent-state')
      );
      
      localDirs.forEach(dir => {
        fs.mkdirSync(dir, { recursive: true });
      });
    }

    // Set default environment variables
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
    process.env.PORT = process.env.PORT || '3000';
    process.env.STATE_PATH = process.env.STATE_PATH || '/data/state';
    process.env.PROJECTS_PATH = process.env.PROJECTS_PATH || '/data/projects';

    // Unset ANTHROPIC_API_KEY to use authenticated session
    delete process.env.ANTHROPIC_API_KEY;
    this.log('- Using Claude authenticated session (ANTHROPIC_API_KEY unset)');

    this.log('Starting Coding Agent MCP Server...');
    this.log(`- Environment: ${process.env.NODE_ENV}`);
    this.log(`- Port: ${process.env.PORT}`);
    this.log(`- State Path: ${process.env.STATE_PATH}`);
    this.log(`- Projects Path: ${process.env.PROJECTS_PATH}`);

    // Configure Git safe directory
    if (fs.existsSync('/workspace/.git')) {
      this.log('Configuring Git safe directory...');
      try {
        // Try system config first, then global
        try {
          execSync('git config --system --add safe.directory /workspace', { stdio: 'pipe' });
        } catch {
          execSync('git config --global --add safe.directory /workspace', { stdio: 'pipe' });
        }
        this.success('Git safe directory configured');
      } catch (err) {
        this.warning('Could not configure Git safe directory');
      }
    }
  }

  public execute(command: string[], args: string[]): void {
    // If no command provided, use the default from package.json
    if (command.length === 0) {
      command = ['node', 'dist/index.js'];
    }

    this.log(`Executing: ${command.join(' ')}`);
    
    // Use spawn for better signal handling
    const child = spawn(command[0], command.slice(1), {
      stdio: 'inherit',
      env: process.env
    });

    // Forward signals to child process
    process.on('SIGTERM', () => {
      child.kill('SIGTERM');
    });

    process.on('SIGINT', () => {
      child.kill('SIGINT');
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  }
}

// Main entry point
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  const entrypoint = new DockerEntrypoint();
  // Pass through any command line arguments
  const args = process.argv.slice(2);
  entrypoint.execute(args, []);
}

export { DockerEntrypoint };