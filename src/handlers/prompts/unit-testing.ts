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
        text: `# Unit Test Creation Task

## Test Requirements
- **File to Test**: {{file_path}}
- **Test Framework**: {{test_framework}}
- **Coverage Target**: {{coverage_target}}%

## Instructions

Create comprehensive unit tests following these guidelines:

### 1. Code Analysis Phase
**Function/Method Analysis**:
- Identify all exported functions, methods, and classes
- Map function signatures and return types
- Document side effects and state changes
- Identify pure vs impure functions
- Note async/promise-based operations
- List external dependencies

**Dependency Mapping**:
- External modules/packages
- Database connections
- API calls
- File system operations
- Environment variables
- Global state access

**Code Path Analysis**:
- All conditional branches (if/else, switch)
- Loop conditions and iterations
- Error handling paths
- Early returns
- Default parameter values
- Optional chaining paths

### 2. Test Planning
**Test Categories**:
1. **Happy Path Tests**: Normal operation with valid inputs
2. **Edge Cases**: Boundary values, empty inputs, maximum values
3. **Error Cases**: Invalid inputs, null/undefined, type mismatches
4. **Integration Points**: Mock external dependencies
5. **Async Operations**: Promise resolution/rejection
6. **State Management**: State initialization and mutations

**Test Structure Template**:
\`\`\`javascript
describe('ModuleName', () => {
  // Setup and teardown
  beforeEach(() => {
    // Reset state, create mocks
  });
  
  afterEach(() => {
    // Cleanup, restore mocks
  });
  
  describe('functionName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = setupTestData();
      
      // Act
      const result = functionName(input);
      
      // Assert
      expect(result).toBe(expectedValue);
    });
    
    it('should handle edge case', () => {
      // Test edge cases
    });
    
    it('should handle error case', () => {
      // Test error scenarios
    });
  });
});
\`\`\`

### 3. Mock Strategy
**Mock Creation**:
\`\`\`javascript
// External modules
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

// Database
const mockDb = {
  query: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn()
};

// File system
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn()
}));
\`\`\`

**Mock Patterns**:
- Use dependency injection for testability
- Create factory functions for mock data
- Implement mock builders for complex objects
- Use spy functions to verify calls
- Mock timers for time-dependent code

### 4. Test Implementation
**Assertion Strategies**:
\`\`\`javascript
// Value assertions
expect(result).toBe(expected);           // Exact equality
expect(result).toEqual(expected);        // Deep equality
expect(result).toMatchObject(partial);   // Partial matching

// Array/Collection assertions
expect(array).toContain(item);
expect(array).toHaveLength(5);
expect(array).toEqual(expect.arrayContaining([1, 2]));

// Async assertions
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow(Error);

// Function call assertions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenCalledTimes(2);
\`\`\`

### 5. Edge Case Coverage
**Common Edge Cases**:
- Empty strings, arrays, objects
- Null and undefined values
- Zero, negative numbers, infinity
- Maximum safe integer
- Unicode and special characters
- Circular references
- Very large datasets
- Concurrent operations
- Race conditions

**Boundary Testing**:
\`\`\`javascript
describe('boundary tests', () => {
  it('handles minimum values', () => {
    expect(func(0)).toBe(expectedMin);
    expect(func(-1)).toThrow();
  });
  
  it('handles maximum values', () => {
    expect(func(Number.MAX_SAFE_INTEGER)).toBe(expectedMax);
    expect(func(Infinity)).toThrow();
  });
  
  it('handles empty inputs', () => {
    expect(func('')).toBe(defaultValue);
    expect(func([])).toEqual([]);
    expect(func({})).toEqual({});
  });
});
\`\`\`

### 6. Async Testing
**Promise Testing**:
\`\`\`javascript
// Using async/await
it('handles async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});

// Using returned promises
it('handles promise', () => {
  return expect(promiseFunction()).resolves.toBe(expected);
});

// Testing rejection
it('handles async error', async () => {
  await expect(asyncFunction()).rejects.toThrow('Error message');
});
\`\`\`

**Timing and Delays**:
\`\`\`javascript
// Mock timers
jest.useFakeTimers();

it('handles delayed operation', () => {
  const callback = jest.fn();
  delayedFunction(callback);
  
  expect(callback).not.toHaveBeenCalled();
  
  jest.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();
});
\`\`\`

### 7. Error Testing
**Error Scenarios**:
\`\`\`javascript
it('throws on invalid input', () => {
  expect(() => func(null)).toThrow('Input cannot be null');
  expect(() => func(-1)).toThrow(RangeError);
  expect(() => func('invalid')).toThrow(/invalid format/i);
});

it('handles async errors gracefully', async () => {
  mockApi.get.mockRejectedValue(new Error('Network error'));
  
  const result = await fetchData();
  expect(result).toEqual({ error: 'Network error', data: null });
});
\`\`\`

### 8. Coverage Requirements
**Coverage Metrics**:
- Statement coverage: Every line executed
- Branch coverage: All if/else paths tested
- Function coverage: All functions called
- Line coverage: All executable lines tested

**Coverage Commands**:
\`\`\`bash
# Jest with coverage
jest --coverage --coverageThreshold='{
  "global": {
    "branches": 80,
    "functions": 80,
    "lines": 80,
    "statements": 80
  }
}'

# Generate HTML report
jest --coverage --coverageReporters=html
\`\`\`

### 9. Test Quality Checklist
- [ ] All exported functions have tests
- [ ] Each test has a single responsibility
- [ ] Test names clearly describe the scenario
- [ ] No test depends on another test
- [ ] Mocks are properly reset between tests
- [ ] Async operations are properly awaited
- [ ] Error cases are thoroughly tested
- [ ] Edge cases are covered
- [ ] Tests run in isolation
- [ ] No hardcoded values in tests

### 10. Continuous Testing
**Test Execution**:
1. Run tests after each implementation
2. Fix failing tests immediately
3. Add tests for any bugs found
4. Refactor tests for maintainability
5. Keep tests fast and focused

**Iteration Process**:
1. Write initial test suite
2. Run tests and check coverage
3. Identify uncovered code
4. Add missing tests
5. Repeat until target coverage reached
6. Ensure 100% pass rate

### Output Requirements
- Complete test file(s)
- All tests passing (100% pass rate)
- Coverage report meeting target
- Mock implementations
- Test data factories/builders
- Documentation of test scenarios`,
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
        text: `# Add Missing Tests Task

## Files to Analyze
- **Test File**: {{test_file}}
- **Source File**: {{source_file}}
- **Focus Areas**: {{focus_areas}}

## Instructions

Analyze existing tests and add missing coverage:

### 1. Test Gap Analysis
**Coverage Assessment**:
- Run coverage report on current tests
- Identify uncovered lines and branches
- List untested functions/methods
- Find missing error scenarios
- Check for untested edge cases
- Review async operation coverage

**Gap Categories**:
1. **Completely Untested Functions**: No tests exist
2. **Partial Coverage**: Some paths untested
3. **Missing Error Cases**: Happy path only
4. **Edge Cases**: Boundary conditions not tested
5. **Integration Points**: Mocks not fully utilized
6. **Async Scenarios**: Promise rejections not tested

### 2. Missing Test Identification
**Code Review Checklist**:
- [ ] All public functions have at least one test
- [ ] All conditional branches have tests
- [ ] Error handling blocks are tested
- [ ] Default parameters are tested
- [ ] Optional parameters are tested with/without values
- [ ] Array/object methods test empty inputs
- [ ] Numeric functions test zero/negative/max values
- [ ] String functions test empty/whitespace/unicode
- [ ] Async functions test both resolve and reject
- [ ] Cleanup/teardown code is tested

### 3. Test Priority Matrix
**High Priority**:
- Core business logic
- Security-related functions
- Data validation/sanitization
- Error handling
- Public API endpoints
- Financial calculations

**Medium Priority**:
- Utility functions
- Data transformations
- Internal helpers
- Logging functions

**Low Priority**:
- Simple getters/setters
- Trivial wrappers
- Console output functions

### 4. Test Case Generation
**For Each Untested Scenario**:
1. Identify the code path
2. Determine required setup
3. Define expected behavior
4. Create minimal test case
5. Add assertions
6. Verify test catches regressions

**Test Case Template**:
\`\`\`javascript
describe('Additional test cases for [Function]', () => {
  // Missing: Error handling
  describe('error handling', () => {
    it('should handle null input gracefully', () => {
      expect(() => func(null)).toThrow(TypeError);
    });
    
    it('should handle invalid type', () => {
      expect(() => func(123)).toThrow('Expected string');
    });
  });
  
  // Missing: Edge cases
  describe('edge cases', () => {
    it('should handle empty array', () => {
      expect(func([])).toEqual([]);
    });
    
    it('should handle maximum size input', () => {
      const largeInput = new Array(10000).fill('test');
      expect(() => func(largeInput)).not.toThrow();
    });
  });
  
  // Missing: Async errors
  describe('async error scenarios', () => {
    it('should handle network timeout', async () => {
      mockApi.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );
      
      await expect(fetchData()).rejects.toThrow('Timeout');
    });
  });
});
\`\`\`

### 5. Special Focus Areas
**Error Handling Tests**:
\`\`\`javascript
// Test all catch blocks
it('logs error and returns default on failure', async () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  mockDb.query.mockRejectedValue(new Error('DB Error'));
  
  const result = await getUser(1);
  
  expect(consoleSpy).toHaveBeenCalledWith('Failed to get user:', expect.any(Error));
  expect(result).toEqual({ id: 1, name: 'Unknown' });
  
  consoleSpy.mockRestore();
});
\`\`\`

**Edge Case Tests**:
\`\`\`javascript
// Boundary values
describe('boundary conditions', () => {
  it('handles minimum date', () => {
    const minDate = new Date(-8640000000000000);
    expect(formatDate(minDate)).toBe('Invalid Date');
  });
  
  it('handles concurrent calls', async () => {
    const promises = Array(100).fill(null).map(() => processItem());
    const results = await Promise.all(promises);
    expect(results).toHaveLength(100);
    expect(new Set(results).size).toBe(100); // All unique
  });
});
\`\`\`

### 6. Mock Enhancement
**Improve Existing Mocks**:
\`\`\`javascript
// Add missing mock behaviors
beforeEach(() => {
  // Existing mock
  mockApi.get.mockResolvedValue({ data: {} });
  
  // Add missing scenarios
  mockApi.get.mockImplementation((url) => {
    if (url.includes('error')) {
      return Promise.reject(new Error('API Error'));
    }
    if (url.includes('empty')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: { id: 1 } });
  });
});
\`\`\`

### 7. Parameterized Tests
**Data-Driven Testing**:
\`\`\`javascript
describe.each([
  ['empty string', '', ''],
  ['single word', 'hello', 'Hello'],
  ['multiple words', 'hello world', 'Hello World'],
  ['mixed case', 'hELLo WoRLD', 'Hello World'],
  ['with numbers', 'hello123world', 'Hello123world'],
  ['special chars', 'hello-world', 'Hello-world'],
  ['unicode', 'hëllo wörld', 'Hëllo Wörld'],
])('capitalizeWords(%s)', (description, input, expected) => {
  it(\`returns \${expected}\`, () => {
    expect(capitalizeWords(input)).toBe(expected);
  });
});
\`\`\`

### 8. Integration Test Gaps
**Missing Integration Scenarios**:
- Multiple function interactions
- State changes across functions
- Event emission and handling
- Middleware chain testing
- Transaction rollback scenarios
- Cache invalidation tests

### 9. Performance Tests
**Add Performance Regression Tests**:
\`\`\`javascript
it('processes large dataset within time limit', () => {
  const largeArray = Array(10000).fill(null).map((_, i) => ({
    id: i,
    data: 'x'.repeat(1000)
  }));
  
  const start = Date.now();
  processArray(largeArray);
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(1000); // 1 second limit
});
\`\`\`

### Output Requirements
- Updated test file with new cases
- Coverage report showing improvement
- List of added test scenarios
- Documentation of why each test was added
- Any refactoring to improve testability
- Recommendations for further testing`,
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
        text: `# Fix Failing Tests Task

## Test Failure Information
### Error Output
{{test_output}}

### Test Files
{{test_files}}

### Fix Approach
{{fix_approach}}

## Instructions

Debug and fix failing tests systematically:

### 1. Failure Analysis
**Parse Error Messages**:
- Identify test file and line number
- Extract actual vs expected values
- Note assertion type that failed
- Check stack trace for root cause
- Identify error types (TypeError, ReferenceError, etc.)

**Failure Categories**:
1. **Assertion Failures**: Expected value doesn't match actual
2. **Runtime Errors**: Code throws unexpected errors
3. **Async Failures**: Promise rejections, timeouts
4. **Mock Failures**: Mock not returning expected values
5. **Setup Failures**: Before/after hooks failing
6. **Environment Issues**: Missing env vars, files

### 2. Common Failure Patterns
**Assertion Mismatches**:
\`\`\`javascript
// Common fix patterns
// Problem: Comparing objects with toBe
expect(result).toBe({ id: 1 }); // Fails

// Fix: Use toEqual for deep equality
expect(result).toEqual({ id: 1 }); // Passes

// Problem: Floating point precision
expect(0.1 + 0.2).toBe(0.3); // Fails

// Fix: Use toBeCloseTo
expect(0.1 + 0.2).toBeCloseTo(0.3); // Passes
\`\`\`

**Async Test Issues**:
\`\`\`javascript
// Problem: Not waiting for async operation
it('loads data', () => {
  const data = fetchData(); // Returns promise
  expect(data).toEqual({ id: 1 }); // Fails
});

// Fix: Add async/await
it('loads data', async () => {
  const data = await fetchData();
  expect(data).toEqual({ id: 1 }); // Passes
});

// Problem: Timeout too short
it('slow operation', async () => {
  await slowOperation(); // Takes 6 seconds
}, 5000); // 5 second timeout - Fails

// Fix: Increase timeout
it('slow operation', async () => {
  await slowOperation();
}, 10000); // 10 second timeout - Passes
\`\`\`

### 3. Mock-Related Fixes
**Mock Configuration Issues**:
\`\`\`javascript
// Problem: Mock not reset between tests
beforeEach(() => {
  // Missing mockClear()
});

// Fix: Clear mocks
beforeEach(() => {
  jest.clearAllMocks();
  // or
  mockFunction.mockClear();
});

// Problem: Mock returning undefined
mockApi.get(); // undefined

// Fix: Configure mock properly
mockApi.get.mockResolvedValue({ data: [] });
// or
mockApi.get.mockImplementation(() => Promise.resolve({ data: [] }));
\`\`\`

### 4. Environment and Setup Fixes
**Missing Dependencies**:
\`\`\`javascript
// Problem: Module not mocked
import fs from 'fs'; // Actual fs used in tests

// Fix: Add mock
jest.mock('fs');

// Problem: Environment variable missing
process.env.API_KEY // undefined in test

// Fix: Set in test setup
beforeAll(() => {
  process.env.API_KEY = 'test-key';
});

afterAll(() => {
  delete process.env.API_KEY;
});
\`\`\`

### 5. Timing and Race Conditions
**Fix Race Conditions**:
\`\`\`javascript
// Problem: State not updated immediately
fireEvent.click(button);
expect(screen.getByText('Updated')).toBeInTheDocument(); // Fails

// Fix: Wait for update
fireEvent.click(button);
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});

// Problem: Debounced function
input.value = 'test';
expect(searchCalled).toBe(true); // Fails - debounced

// Fix: Advance timers
jest.useFakeTimers();
input.value = 'test';
jest.advanceTimersByTime(300); // Advance past debounce
expect(searchCalled).toBe(true); // Passes
\`\`\`

### 6. Fix Decision Matrix
**When to Fix Tests**:
- Test expectations are outdated
- Test logic is incorrect
- Mock setup is wrong
- Test is testing wrong behavior

**When to Fix Code**:
- Code has actual bug
- Business logic is incorrect
- Edge case not handled
- Performance issue revealed

**When to Fix Both**:
- Requirement changed
- API contract updated
- Refactoring needed
- Better approach found

### 7. Debugging Techniques
**Isolation Testing**:
\`\`\`javascript
// Run single test
it.only('specific test', () => {
  // Debug this test in isolation
});

// Skip other tests temporarily
it.skip('other test', () => {
  // Skipped during debugging
});
\`\`\`

**Debug Output**:
\`\`\`javascript
// Add console logs
it('debugging test', () => {
  const result = complexFunction();
  console.log('Result:', JSON.stringify(result, null, 2));
  console.log('Type:', typeof result);
  console.log('Keys:', Object.keys(result));
  
  expect(result).toEqual(expected);
});
\`\`\`

### 8. Test Refactoring
**Improve Test Quality**:
\`\`\`javascript
// Before: Brittle test
expect(result).toEqual({
  id: 1,
  name: 'John',
  timestamp: 1234567890,
  random: 'abc123'
});

// After: Flexible matching
expect(result).toMatchObject({
  id: 1,
  name: 'John'
});
expect(result.timestamp).toBeGreaterThan(0);
expect(result.random).toMatch(/^[a-z0-9]+$/);
\`\`\`

### 9. Regression Prevention
**Add Defensive Tests**:
- Test the exact scenario that was failing
- Add edge case that caused failure
- Test integration between components
- Add type checking tests
- Verify error handling

### 10. Fix Verification
**Ensure Fix is Complete**:
1. Run single failing test - should pass
2. Run entire test suite - all should pass
3. Run with coverage - maintain/improve coverage
4. Test in different environments
5. Verify no performance regression

### Output Requirements
- All tests passing (green)
- Explanation of what was wrong
- Specific fixes applied
- Any code changes needed
- Recommendations to prevent similar failures
- Updated test documentation`,
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
        text: `# Test Coverage Improvement Task

## Coverage Information
### Current Coverage Report
{{coverage_report}}

### Target Coverage
{{target_coverage}}%

### Exclusions
{{exclude_patterns}}

## Instructions

Systematically improve test coverage to meet targets:

### 1. Coverage Report Analysis
**Understanding Metrics**:
- **Statement Coverage**: % of code statements executed
- **Branch Coverage**: % of decision branches taken
- **Function Coverage**: % of functions called
- **Line Coverage**: % of executable lines run

**Coverage Gaps**:
- Red lines: Never executed
- Yellow lines: Partially covered (some branches)
- Green lines: Fully covered

### 2. Priority Assessment
**High-Impact Areas** (Test First):
1. Core business logic
2. Public APIs and interfaces
3. Error handling code
4. Security functions
5. Data validation
6. Complex algorithms

**Lower Priority** (Test if Needed for Target):
1. Simple getters/setters
2. Configuration files
3. Type definitions
4. Constants
5. Logging statements

### 3. Coverage Strategy
**Efficient Coverage Gains**:
\`\`\`javascript
// Target untested functions first
// Each new function test can add 2-5% coverage

// Then target branches
if (condition) {
  // Branch 1: tested ✓
} else {
  // Branch 2: untested ✗ - Add test for this
}

// Finally, edge cases for partial coverage
function calculate(a, b) {
  if (a < 0) return 0; // Tested ✓
  if (b < 0) return -1; // Untested ✗
  return a + b; // Tested ✓
}
\`\`\`

### 4. Test Generation Patterns
**For Uncovered Functions**:
\`\`\`javascript
// If function 'validateUser' is uncovered:
describe('validateUser', () => {
  it('validates correct user object', () => {
    const user = { name: 'John', age: 25 };
    expect(validateUser(user)).toBe(true);
  });
  
  it('rejects invalid user object', () => {
    expect(validateUser({})).toBe(false);
    expect(validateUser(null)).toBe(false);
  });
});
\`\`\`

**For Uncovered Branches**:
\`\`\`javascript
// Original code with branches
function getDiscount(user) {
  if (user.isPremium) {
    return user.years > 5 ? 0.20 : 0.10;
  }
  return 0;
}

// Tests for all branches
describe('getDiscount branches', () => {
  it('returns 20% for premium users > 5 years', () => {
    expect(getDiscount({ isPremium: true, years: 6 })).toBe(0.20);
  });
  
  it('returns 10% for premium users <= 5 years', () => {
    expect(getDiscount({ isPremium: true, years: 3 })).toBe(0.10);
  });
  
  it('returns 0% for non-premium users', () => {
    expect(getDiscount({ isPremium: false, years: 10 })).toBe(0);
  });
});
\`\`\`

### 5. Specific Coverage Patterns
**Error Handling Coverage**:
\`\`\`javascript
// Force errors to cover catch blocks
it('handles database error', async () => {
  mockDb.query.mockRejectedValue(new Error('Connection failed'));
  
  const result = await getData();
  expect(result).toEqual({ error: 'Connection failed', data: null });
});
\`\`\`

**Default Parameter Coverage**:
\`\`\`javascript
function greet(name = 'World', greeting = 'Hello') {
  return \`\${greeting}, \${name}!\`;
}

// Test all combinations
it('uses default parameters', () => {
  expect(greet()).toBe('Hello, World!');
  expect(greet('John')).toBe('Hello, John!');
  expect(greet('John', 'Hi')).toBe('Hi, John!');
  expect(greet(undefined, 'Hi')).toBe('Hi, World!');
});
\`\`\`

### 6. Complex Scenario Coverage
**Switch Statement Coverage**:
\`\`\`javascript
// Test each case
describe.each([
  ['monday', 'Start of week'],
  ['friday', 'TGIF'],
  ['sunday', 'Weekend'],
  ['invalid', 'Unknown day']
])('getDayMessage(%s)', (day, expected) => {
  it(\`returns \${expected}\`, () => {
    expect(getDayMessage(day)).toBe(expected);
  });
});
\`\`\`

**Async Iterator Coverage**:
\`\`\`javascript
it('covers async generator', async () => {
  const results = [];
  for await (const item of asyncGenerator()) {
    results.push(item);
  }
  expect(results).toEqual([1, 2, 3]);
});
\`\`\`

### 7. Coverage Anti-Patterns to Avoid
**Don't Write Meaningless Tests**:
\`\`\`javascript
// Bad: Testing for coverage only
it('calls the function', () => {
  someFunction(); // No assertions
});

// Good: Meaningful test
it('processes data correctly', () => {
  const result = someFunction(testData);
  expect(result).toHaveProperty('processed', true);
  expect(result.count).toBe(testData.length);
});
\`\`\`

### 8. Coverage Improvement Workflow
1. **Run Coverage Report**
   \`\`\`bash
   npm test -- --coverage
   \`\`\`

2. **Open HTML Report**
   \`\`\`bash
   open coverage/lcov-report/index.html
   \`\`\`

3. **Identify Biggest Gaps**
   - Sort by uncovered lines
   - Focus on files with < 50% coverage

4. **Write Targeted Tests**
   - One test per uncovered function
   - One test per uncovered branch

5. **Verify Improvement**
   - Re-run coverage
   - Check metrics increased

### 9. Advanced Coverage Techniques
**Threshold Enforcement**:
\`\`\`json
// package.json or jest.config.js
"jest": {
  "coverageThreshold": {
    "global": {
      "statements": 80,
      "branches": 80,
      "functions": 80,
      "lines": 80
    },
    "./src/utils/": {
      "statements": 90
    }
  }
}
\`\`\`

**Ignore Patterns**:
\`\`\`javascript
/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info');
}

/* istanbul ignore file */
// Entire file ignored from coverage
\`\`\`

### 10. Incremental Improvement
**Step-by-Step Approach**:
1. Current: 60% → Target: 80%
2. First focus: 0% coverage files
3. Then: < 50% coverage files  
4. Then: Branch coverage in 50-79% files
5. Finally: Edge cases in 80%+ files

**Quick Wins**:
- Test utility functions (usually easy)
- Test pure functions (no side effects)
- Test validation logic
- Test error messages
- Test default exports

### Output Requirements
- New/updated test files
- Coverage report showing improvement
- List of covered scenarios
- Explanation of remaining gaps
- Recommendations for maintaining coverage
- CI/CD configuration for coverage gates`,
      },
    },
  ],
};