/**
 * @file Tunnel Connection Test
 * @module test-tunnel
 * 
 * @remarks
 * Test to verify connection to MCP server via tunnel URL
 */

import { createMCPClient, log, MCP_BASE_URL } from './test-utils.js';

async function testTunnelConnection(): Promise<void> {
  log.section('🌍 Testing Tunnel Connection');
  
  // Get the base URL from test-utils (which handles detection)
  const url = MCP_BASE_URL;
  
  if (!url || !url.startsWith('https://')) {
    log.warning('No tunnel URL detected!');
    log.info('The tunnel should be started automatically by npm run test:tunnel');
    log.info('Or set MCP_BASE_URL=https://your-tunnel.trycloudflare.com');
    process.exit(1);
  }
  
  log.info(`Testing connection to: ${url}`);
  
  try {
    // Test 1: Basic connection
    log.info('Test 1: Basic connection...');
    const client = await createMCPClient();
    log.success('Connected successfully!');
    
    // Test 2: Get server capabilities
    log.info('\nTest 2: Getting server capabilities...');
    const capabilities = await client.listTools();
    log.success(`Server has ${capabilities.tools?.length || 0} tools available`);
    
    // Test 3: List available tools
    log.info('\nTest 3: Listing available tools...');
    const tools = await client.listTools();
    log.success(`Found ${tools.tools.length} tools`);
    tools.tools.slice(0, 5).forEach(tool => {
      log.debug(`  - ${tool.name}: ${tool.description}`);
    });
    
    // Test 4: List resources
    log.info('\nTest 4: Listing resources...');
    const resources = await client.listResources();
    log.success(`Found ${resources.resources.length} resources`);
    resources.resources.slice(0, 5).forEach(resource => {
      log.debug(`  - ${resource.name}: ${resource.uri}`);
    });
    
    // Test 5: Call a simple tool
    log.info('\nTest 5: Calling a simple tool...');
    try {
      const result = await client.callTool({
        name: 'get_system_info',
        arguments: {}
      });
      log.success('Tool call successful!');
      const contentArray = result.content as any[];
      if (contentArray && contentArray.length > 0) {
        const content = contentArray[0];
        if (content.type === 'text') {
          const info = JSON.parse(content.text as string);
          log.debug(`  Platform: ${info.platform}`);
          log.debug(`  Node version: ${info.nodeVersion}`);
        }
      }
    } catch (error) {
      log.warning(`Tool call failed: ${error}`);
    }
    
    // Test 6: Health check via HTTP
    log.info('\nTest 6: Health check via HTTP...');
    try {
      const healthUrl = new URL('/health', url);
      const response = await fetch(healthUrl.toString());
      if (response.ok) {
        const health = await response.json();
        log.success(`Health check passed: ${(health as any).status}`);
      } else {
        log.error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      log.error(`Health check error: ${error}`);
    }
    
    // Close connection
    await client.close();
    
    log.section('✨ All tunnel tests passed!');
    log.success(`The MCP server is accessible via: ${url}`);
    log.info('\nYou can now run the full test suite with:');
    log.info(`  MCP_BASE_URL=${url} npm test`);
    
  } catch (error) {
    log.error(`Tunnel test failed: ${error}`);
    process.exit(1);
  }
}

// Run the test
if (process.argv[1].endsWith('test-tunnel.js') || process.argv[1].endsWith('test-tunnel.ts')) {
  testTunnelConnection()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      log.error(`Fatal error: ${error}`);
      process.exit(1);
    });
}

export { testTunnelConnection };