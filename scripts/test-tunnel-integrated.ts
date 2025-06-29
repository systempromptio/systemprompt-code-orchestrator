#!/usr/bin/env node

/**
 * @file Integrated tunnel test runner
 * @module scripts/test-tunnel-integrated
 * 
 * @remarks
 * This script automatically:
 * 1. Starts the MCP server
 * 2. Starts cloudflared tunnel
 * 3. Captures the tunnel URL
 * 4. Runs tests against the tunnel URL
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class IntegratedTunnelTest {
  private tunnelProcess: any = null;
  private tunnelUrl: string | null = null;
  
  private log(message: string, color: string = colors.reset): void {
    console.log(`${color}${message}${colors.reset}`);
  }
  
  private error(message: string): void {
    this.log(`❌ ${message}`, colors.red);
  }
  
  private success(message: string): void {
    this.log(`✅ ${message}`, colors.green);
  }
  
  private info(message: string): void {
    this.log(`ℹ️  ${message}`, colors.blue);
  }
  
  private warning(message: string): void {
    this.log(`⚠️  ${message}`, colors.yellow);
  }
  
  async checkPrerequisites(): Promise<boolean> {
    this.info('Checking prerequisites...');
    
    // Check if cloudflared is installed
    try {
      const { execSync } = await import('child_process');
      execSync('which cloudflared', { stdio: 'ignore' });
      this.success('cloudflared is installed');
    } catch {
      this.error('cloudflared not found. Please run: npm run setup');
      return false;
    }
    
    // Check if Docker is running
    try {
      const { execSync } = await import('child_process');
      execSync('docker ps', { stdio: 'ignore' });
      this.success('Docker is running');
    } catch {
      this.error('Docker is not running. Please start Docker.');
      return false;
    }
    
    return true;
  }
  
  async ensureServicesRunning(): Promise<boolean> {
    this.info('Checking MCP server status...');
    
    try {
      // Check if server is already running
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        this.success('MCP server is already running');
        return true;
      }
    } catch {
      // Server not running, need to start it
    }
    
    this.info('Starting MCP server...');
    
    // Stop any existing services first
    try {
      const { execSync } = await import('child_process');
      execSync('npm run stop', { 
        cwd: projectRoot,
        stdio: 'inherit'
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {
      // Ignore stop errors
    }
    
    // Start the server
    try {
      const { execSync } = await import('child_process');
      this.info('Running npm start...');
      
      // Start in background
      const startProcess = spawn('npm', ['start'], {
        cwd: projectRoot,
        detached: true,
        stdio: 'ignore'
      });
      startProcess.unref();
      
      // Wait for server to be ready
      this.info('Waiting for server to start...');
      for (let i = 0; i < 30; i++) {
        try {
          const response = await fetch('http://localhost:3000/health');
          if (response.ok) {
            this.success('MCP server started successfully');
            return true;
          }
        } catch {
          // Not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        process.stdout.write('.');
      }
      
      this.error('Server failed to start after 30 seconds');
      return false;
      
    } catch (error) {
      this.error(`Failed to start server: ${error}`);
      return false;
    }
  }
  
  async startTunnel(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.info('Starting Cloudflare tunnel...');
      
      // Remove any existing tunnel URL file
      const tunnelFile = path.join(projectRoot, '.tunnel-url');
      if (fs.existsSync(tunnelFile)) {
        fs.unlinkSync(tunnelFile);
      }
      
      // Start cloudflared tunnel
      this.tunnelProcess = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:3000'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false  // Keep it attached to this process
      });
      
      let output = '';
      let errorOutput = '';
      let resolved = false;
      
      // Capture stdout
      this.tunnelProcess.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        output += text;
        
        // Look for the tunnel URL in the output
        const urlMatch = text.match(/https:\/\/[^\s]+\.trycloudflare\.com/);
        if (urlMatch && !resolved) {
          resolved = true;
          this.tunnelUrl = urlMatch[0];
          this.success(`Tunnel established: ${this.tunnelUrl}`);
          
          // Save tunnel URL to file
          fs.writeFileSync(tunnelFile, this.tunnelUrl);
          
          resolve(this.tunnelUrl);
        }
      });
      
      // Capture stderr (cloudflared outputs URL here too)
      this.tunnelProcess.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        errorOutput += text;
        
        // Check stderr for URL as well
        const urlMatch = text.match(/https:\/\/[^\s]+\.trycloudflare\.com/);
        if (urlMatch && !resolved) {
          resolved = true;
          this.tunnelUrl = urlMatch[0];
          this.success(`Tunnel established: ${this.tunnelUrl}`);
          
          // Save tunnel URL to file
          fs.writeFileSync(tunnelFile, this.tunnelUrl);
          
          resolve(this.tunnelUrl);
        }
      });
      
      this.tunnelProcess.on('error', (error: Error) => {
        if (!resolved) {
          this.error(`Failed to start tunnel: ${error.message}`);
          reject(error);
        }
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (!resolved) {
          this.error('Timeout waiting for tunnel URL');
          if (this.tunnelProcess) {
            this.tunnelProcess.kill();
          }
          reject(new Error('Timeout waiting for tunnel URL'));
        }
      }, 30000);
    });
  }
  
  async runTests(tunnelUrl: string): Promise<number> {
    this.info('\nRunning E2E tests against tunnel URL...');
    this.info(`Tunnel URL: ${tunnelUrl}`);
    
    return new Promise((resolve) => {
      const testProcess = spawn('npm', ['test'], {
        cwd: path.join(projectRoot, 'e2e-test'),
        stdio: 'inherit',
        env: {
          ...process.env,
          MCP_BASE_URL: tunnelUrl,
          TUNNEL_MODE: 'true',
          TUNNEL_URL: tunnelUrl
        }
      });
      
      testProcess.on('close', (code) => {
        resolve(code || 0);
      });
      
      testProcess.on('error', (error) => {
        this.error(`Test process error: ${error}`);
        resolve(1);
      });
    });
  }
  
  async cleanup(): Promise<void> {
    this.info('\nCleaning up...');
    
    // Kill tunnel process
    if (this.tunnelProcess) {
      this.tunnelProcess.kill();
      this.success('Tunnel stopped');
    }
    
    // Remove tunnel URL file
    const tunnelFile = path.join(projectRoot, '.tunnel-url');
    if (fs.existsSync(tunnelFile)) {
      fs.unlinkSync(tunnelFile);
    }
  }
  
  async run(): Promise<void> {
    console.log('🚀 Integrated Tunnel Test Runner');
    console.log('================================\n');
    
    try {
      // Check prerequisites
      if (!await this.checkPrerequisites()) {
        process.exit(1);
      }
      
      // Ensure services are running
      if (!await this.ensureServicesRunning()) {
        process.exit(1);
      }
      
      // Start tunnel
      const tunnelUrl = await this.startTunnel();
      
      // Wait a bit for tunnel to stabilize
      this.info('Waiting for tunnel to stabilize...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Display tunnel info
      console.log('\n' + '='.repeat(60));
      this.success('🌍 Tunnel is ready!');
      this.info(`📡 Public URL: ${colors.cyan}${tunnelUrl}${colors.reset}`);
      this.info(`🔗 MCP Endpoint: ${colors.cyan}${tunnelUrl}/mcp${colors.reset}`);
      console.log('='.repeat(60) + '\n');
      
      // Run tests
      const exitCode = await this.runTests(tunnelUrl);
      
      // Check result
      if (exitCode === 0) {
        this.success('\n✨ All tests passed!');
      } else {
        this.error(`\n Tests failed with exit code: ${exitCode}`);
      }
      
      // Clean up
      await this.cleanup();
      
      process.exit(exitCode);
      
    } catch (error) {
      this.error(`Fatal error: ${error}`);
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n\nReceived SIGINT, cleaning up...');
  const runner = new IntegratedTunnelTest();
  await runner.cleanup();
  process.exit(0);
});

// Main entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const runner = new IntegratedTunnelTest();
  runner.run().catch(error => {
    console.error('Failed to run tunnel test:', error);
    process.exit(1);
  });
}

export { IntegratedTunnelTest };