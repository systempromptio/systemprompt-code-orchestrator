/**
 * @file Unit testing prompts
 * @module handlers/prompts/unit-testing
 */

import type { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const CREATE_UNIT_TESTS_PROMPT: Prompt = {
  name: 'create_unit_tests',
  description: 'Create and run unit tests until achieving 100% pass rate',
  arguments: [
    {
      name: 'file_path',
      description: 'Path to the file or module to test',
      required: true,
    },
    {
      name: 'test_framework',
      description: 'Testing framework to use (e.g., jest, mocha, pytest, junit)',
      required: false,
    },
    {
      name: 'coverage_target',
      description: 'Target code coverage percentage (default: 80)',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Create comprehensive unit tests for {{file_path}} and ensure they all pass. Use {{test_framework}} framework. Target coverage: {{coverage_target}}%',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll create comprehensive unit tests for your code and ensure they all pass. Let me analyze the file and create appropriate tests.

**Test Creation Process:**

1. **Code Analysis**
   - Identify all functions, methods, and classes
   - Determine edge cases and error conditions
   - Map dependencies and mocking requirements

2. **Test Structure**
   - Set up test suites and describe blocks
   - Create test cases for happy paths
   - Add edge case and error handling tests
   - Include integration tests if needed

3. **Iterative Testing**
   - Run tests and identify failures
   - Fix failing tests or code issues
   - Add missing test cases
   - Ensure coverage targets are met

I'll now:
1. Analyze the code structure
2. Create a comprehensive test suite
3. Run tests and fix any issues
4. Continue until 100% pass rate is achieved

Let me start by examining the code...`,
      },
    },
  ],
};

export const ADD_MISSING_TESTS_PROMPT: Prompt = {
  name: 'add_missing_tests',
  description: 'Identify and add missing test cases to existing test suite',
  arguments: [
    {
      name: 'test_file',
      description: 'Path to the existing test file',
      required: true,
    },
    {
      name: 'source_file',
      description: 'Path to the source code being tested',
      required: true,
    },
    {
      name: 'focus_areas',
      description: 'Specific areas to focus on (e.g., error handling, edge cases)',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Analyze {{test_file}} for {{source_file}} and add any missing test cases. Focus on: {{focus_areas}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll analyze your existing tests and identify gaps in coverage. Let me examine both files to find missing test cases.

**Analysis Approach:**

1. **Coverage Analysis**
   - Check which functions/methods are untested
   - Identify untested code branches
   - Find missing edge cases

2. **Test Gap Identification**
   - Error handling scenarios
   - Boundary conditions
   - Null/undefined inputs
   - Concurrent operation tests
   - Performance edge cases

3. **Test Enhancement**
   - Add missing test cases
   - Improve existing test assertions
   - Add parameterized tests where applicable
   - Enhance test descriptions

I'll examine the current test coverage and add comprehensive tests for any gaps found.`,
      },
    },
  ],
};

export const FIX_FAILING_TESTS_PROMPT: Prompt = {
  name: 'fix_failing_tests',
  description: 'Debug and fix failing unit tests',
  arguments: [
    {
      name: 'test_output',
      description: 'The error output from failing tests',
      required: true,
    },
    {
      name: 'test_files',
      description: 'Paths to test files with failures',
      required: false,
    },
    {
      name: 'fix_approach',
      description: 'Preferred approach: fix tests, fix code, or both',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Fix these failing tests:\n{{test_output}}\n\nTest files: {{test_files}}\nApproach: {{fix_approach}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll analyze and fix the failing tests. Let me examine the error output and determine the best approach.

**Debugging Process:**

1. **Error Analysis**
   - Parse test failure messages
   - Identify root causes
   - Determine if it's a test issue or code issue

2. **Common Failure Patterns**
   - Assertion mismatches
   - Async timing issues
   - Mock configuration problems
   - Environment dependencies
   - State isolation issues

3. **Fix Strategy**
   - Update test expectations if code is correct
   - Fix implementation if tests reveal bugs
   - Improve test stability and isolation
   - Add better error messages

I'll systematically go through each failing test and apply the appropriate fix.`,
      },
    },
  ],
};

export const TEST_COVERAGE_IMPROVEMENT_PROMPT: Prompt = {
  name: 'improve_test_coverage',
  description: 'Improve test coverage to meet specific targets',
  arguments: [
    {
      name: 'coverage_report',
      description: 'Current coverage report or statistics',
      required: true,
    },
    {
      name: 'target_coverage',
      description: 'Target coverage percentage',
      required: true,
    },
    {
      name: 'exclude_patterns',
      description: 'Files or patterns to exclude from coverage',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Improve test coverage from current report to {{target_coverage}}%:\n{{coverage_report}}\nExclude: {{exclude_patterns}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll analyze the coverage report and create tests to reach your target coverage.

**Coverage Improvement Strategy:**

1. **Coverage Analysis**
   - Identify uncovered lines and branches
   - Prioritize critical business logic
   - Find untested error paths

2. **Test Priority**
   - High-value business logic first
   - Error handling and edge cases
   - Integration points
   - Utility functions

3. **Implementation Plan**
   - Create tests for uncovered functions
   - Add branch coverage tests
   - Test error scenarios
   - Verify coverage improvements

I'll create targeted tests to efficiently reach your coverage goals while ensuring test quality.`,
      },
    },
  ],
};