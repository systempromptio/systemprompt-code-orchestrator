/**
 * @file Main Test Runner
 * @module test-all
 * 
 * @remarks
 * Runs all E2E tests for the MCP server
 */

import { log } from './test-utils.js';
import { testPrompts } from './test-prompts.js';
import { testTools } from './test-tools.js';
import { testResources } from './test-resources.js';
import { testE2E } from './test-e2e.js';
import { testTunnelConnection } from './test-tunnel.js';

async function runAllTests(): Promise<void> {
  log.section('🧪 Running All E2E Tests');
  
  const startTime = Date.now();
  
  try {
    // Run each test suite
    await testPrompts();
    await testTools();
    await testResources();
    await testE2E();
    
    // Check if we should run tunnel test
    const tunnelUrl = process.env.MCP_BASE_URL || process.env.TUNNEL_URL;
    if (tunnelUrl && tunnelUrl.startsWith('https://')) {
      log.section('🌍 Running Tunnel Test');
      await testTunnelConnection();
    } else {
      log.info('Skipping tunnel test (no TUNNEL_URL or MCP_BASE_URL set)');
    }
    
    const duration = Date.now() - startTime;
    log.section(`✅ All tests completed in ${duration}ms`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`❌ Test suite failed after ${duration}ms`);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      log.error(`Fatal error: ${error}`);
      process.exit(1);
    });
}