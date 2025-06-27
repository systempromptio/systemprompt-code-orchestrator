#!/usr/bin/env node

// Simple test to check the response structure of check_status

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testCheckStatus() {
  console.log('Testing check_status response structure...\n');
  
  const serverPath = './dist/index.js';
  const serverProcess = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
  });

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: { ...process.env }
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('Connected to server\n');

    // Call check_status with minimal parameters
    const result = await client.callTool({
      name: 'check_status',
      arguments: {
        test_sessions: false,
        verbose: false
      }
    });

    const content = result.content;
    console.log('Raw response content:', JSON.stringify(content, null, 2));
    
    if (content && content[0] && content[0].text) {
      const parsed = JSON.parse(content[0].text);
      console.log('\nParsed response structure:');
      console.log('- status:', parsed.status);
      console.log('- message:', parsed.message);
      console.log('- result keys:', Object.keys(parsed.result || {}));
      
      if (parsed.result) {
        console.log('\nResult structure:');
        console.log('- status:', parsed.result.status);
        console.log('- services:', Object.keys(parsed.result.services || {}));
        console.log('- file_root exists:', !!parsed.result.file_root);
        
        if (parsed.result.file_root) {
          console.log('\nfile_root structure:');
          console.log('- path:', parsed.result.file_root.path);
          console.log('- configured:', parsed.result.file_root.configured);
          console.log('- exists:', parsed.result.file_root.exists);
          console.log('- writable:', parsed.result.file_root.writable);
          console.log('- is_git_repo:', parsed.result.file_root.is_git_repo);
          console.log('- git_available:', parsed.result.file_root.git_available);
          console.log('- current_branch:', parsed.result.file_root.current_branch);
        } else {
          console.log('\nERROR: file_root is undefined in the response!');
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    serverProcess.kill();
  }
}

testCheckStatus().catch(console.error);