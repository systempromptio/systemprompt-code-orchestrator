/**
 * @file E2E Test Suite Runner
 * @module index
 * 
 * @remarks
 * Main test runner for all E2E tests
 */

import { testTools } from './typescript/test-tools.js';
import { testPrompts } from './typescript/test-prompts.js';
import { testResources } from './typescript/test-resources.js';
import { testSampling } from './typescript/test-sampling.js';
import { testConcurrent } from './typescript/test-concurrent.js';

const log = {
  title: (msg: string) => console.log(`\n\x1b[1m\x1b[35m${msg}\x1b[0m`),
  success: (msg: string) => console.log(`\x1b[32m✅\x1b[0m ${msg}`),
  error: (msg: string) => console.log(`\x1b[31m❌\x1b[0m ${msg}`),
  section: (msg: string) => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`)
};

interface TestSuite {
  name: string;
  run: () => Promise<void>;
}

const testSuites: TestSuite[] = [
  { name: 'Tools', run: testTools },
  { name: 'Prompts', run: testPrompts },
  { name: 'Resources', run: testResources },
  { name: 'Sampling', run: testSampling },
  { name: 'Concurrent Operations', run: testConcurrent }
];

async function runAllTests(): Promise<void> {
  log.title('🚀 MCP Server E2E Test Suite');
  log.section('Running all tests...');
  
  const results: { name: string; passed: boolean; error?: string }[] = [];
  const startTime = Date.now();
  
  for (const suite of testSuites) {
    try {
      await suite.run();
      results.push({ name: suite.name, passed: true });
      log.success(`${suite.name} test suite completed`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({ name: suite.name, passed: false, error: errorMsg });
      log.error(`${suite.name} test suite failed: ${errorMsg}`);
    }
  }
  
  const duration = Date.now() - startTime;
  
  // Print summary
  log.section('Test Summary');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\nTotal: ${results.length} suites`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
  
  if (failed > 0) {
    console.log('\nFailed suites:');
    results
      .filter(r => !r.passed)
      .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  }
  
  // Exit with appropriate code
  if (failed > 0) {
    log.error('\nSome tests failed!');
    process.exit(1);
  } else {
    log.success('\nAll tests passed!');
    process.exit(0);
  }
}

// Check if specific test suite is requested
const args = process.argv.slice(2);
if (args.length > 0) {
  const suiteName = args[0].toLowerCase();
  const suite = testSuites.find(s => s.name.toLowerCase() === suiteName);
  
  if (suite) {
    log.title(`🚀 Running ${suite.name} Test Suite`);
    suite.run()
      .then(() => {
        log.success(`${suite.name} test suite completed successfully!`);
        process.exit(0);
      })
      .catch(error => {
        log.error(`${suite.name} test suite failed: ${error}`);
        process.exit(1);
      });
  } else {
    log.error(`Unknown test suite: ${args[0]}`);
    console.log('Available suites:', testSuites.map(s => s.name).join(', '));
    process.exit(1);
  }
} else {
  // Run all tests
  runAllTests().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}