/**
 * @file Bug fixing prompts
 * @module handlers/prompts/bug-fixing
 */

import type { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const FIX_BUG_PROMPT: Prompt = {
  name: 'fix_bug',
  description: 'Diagnose and fix a bug in the code',
  arguments: [
    {
      name: 'bug_description',
      description: 'Description of the bug or error',
      required: true,
    },
    {
      name: 'error_message',
      description: 'Error message or stack trace if available',
      required: false,
    },
    {
      name: 'affected_files',
      description: 'Files potentially related to the bug',
      required: false,
    },
    {
      name: 'reproduction_steps',
      description: 'Steps to reproduce the bug',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Fix this bug: {{bug_description}}\n\nError: {{error_message}}\nFiles: {{affected_files}}\nSteps to reproduce: {{reproduction_steps}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll help you diagnose and fix this bug systematically.

**Bug Investigation Process:**

1. **Error Analysis**
   - Parse error messages and stack traces
   - Identify the error type and location
   - Understand the failure context
   - Check for related issues

2. **Root Cause Analysis**
   - Trace execution flow
   - Examine variable states
   - Check data transformations
   - Identify edge cases

3. **Debugging Strategy**
   - Add strategic logging
   - Use debugger breakpoints
   - Isolate the problem
   - Test hypotheses

4. **Fix Implementation**
   - Apply minimal necessary changes
   - Handle edge cases properly
   - Add defensive coding
   - Prevent regression

I'll investigate the issue thoroughly and provide a robust fix.`,
      },
    },
  ],
};

export const DEBUG_ASYNC_ISSUE_PROMPT: Prompt = {
  name: 'debug_async_issue',
  description: 'Debug and fix asynchronous/timing related issues',
  arguments: [
    {
      name: 'issue_description',
      description: 'Description of the async/timing issue',
      required: true,
    },
    {
      name: 'symptoms',
      description: 'Observed symptoms (race conditions, deadlocks, etc)',
      required: true,
    },
    {
      name: 'async_operations',
      description: 'List of async operations involved',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Debug this async issue: {{issue_description}}\nSymptoms: {{symptoms}}\nAsync operations: {{async_operations}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll help you debug and fix this asynchronous issue.

**Async Debugging Approach:**

1. **Issue Identification**
   - Race conditions
   - Incorrect promise handling
   - Missing await keywords
   - Callback hell
   - Event loop blocking

2. **Analysis Tools**
   - Add timing logs
   - Trace async execution flow
   - Monitor promise states
   - Check for unhandled rejections

3. **Common Fixes**
   - Proper async/await usage
   - Promise.all for parallel operations
   - Sequential processing when needed
   - Timeout handling
   - Error boundaries for async errors

4. **Prevention Strategies**
   - Use async patterns consistently
   - Add proper error handling
   - Implement retry logic
   - Add concurrency controls

I'll trace through the async flow and implement a reliable solution.`,
      },
    },
  ],
};

export const FIX_MEMORY_LEAK_PROMPT: Prompt = {
  name: 'fix_memory_leak',
  description: 'Identify and fix memory leaks in the application',
  arguments: [
    {
      name: 'symptoms',
      description: 'Symptoms of the memory leak (growing memory, slow performance)',
      required: true,
    },
    {
      name: 'suspected_areas',
      description: 'Code areas suspected of causing leaks',
      required: false,
    },
    {
      name: 'profiler_data',
      description: 'Memory profiler data if available',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Fix memory leak with symptoms: {{symptoms}}\nSuspected areas: {{suspected_areas}}\nProfiler data: {{profiler_data}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll help you identify and fix the memory leak.

**Memory Leak Detection:**

1. **Common Leak Sources**
   - Event listeners not removed
   - Timers not cleared
   - Closures holding references
   - DOM references in JavaScript
   - Large objects in caches

2. **Investigation Steps**
   - Profile memory usage over time
   - Take heap snapshots
   - Compare object allocations
   - Track retained objects
   - Find detached DOM nodes

3. **Fix Strategies**
   - Remove event listeners on cleanup
   - Clear intervals and timeouts
   - Weak references for caches
   - Proper component unmounting
   - Limit cache sizes

4. **Prevention**
   - Use cleanup functions
   - Implement disposal patterns
   - Monitor memory in tests
   - Use memory-safe patterns

I'll systematically find and eliminate the memory leaks.`,
      },
    },
  ],
};

export const DEBUG_PRODUCTION_ISSUE_PROMPT: Prompt = {
  name: 'debug_production_issue',
  description: 'Debug issues that only occur in production environment',
  arguments: [
    {
      name: 'issue_description',
      description: 'Description of the production-only issue',
      required: true,
    },
    {
      name: 'environment_differences',
      description: 'Known differences between dev and production',
      required: false,
    },
    {
      name: 'logs_available',
      description: 'What logs or monitoring data is available',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Debug production issue: {{issue_description}}\nEnvironment differences: {{environment_differences}}\nAvailable logs: {{logs_available}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll help debug this production-specific issue systematically.

**Production Debugging Strategy:**

1. **Environment Analysis**
   - Build/compilation differences
   - Environment variables
   - API endpoints and services
   - CDN and caching issues
   - Minification effects

2. **Diagnostic Approach**
   - Add production-safe logging
   - Use feature flags for debugging
   - Implement error tracking
   - Monitor performance metrics
   - Check browser compatibility

3. **Common Production Issues**
   - CORS and security policies
   - HTTPS/SSL issues
   - Load balancer problems
   - Database connection pools
   - Third-party service failures

4. **Safe Debugging**
   - Use non-invasive techniques
   - Test fixes in staging first
   - Implement gradual rollouts
   - Have rollback plans ready

I'll identify the root cause while minimizing production impact.`,
      },
    },
  ],
};

export const FIX_PERFORMANCE_ISSUE_PROMPT: Prompt = {
  name: 'fix_performance_issue',
  description: 'Diagnose and fix performance bottlenecks',
  arguments: [
    {
      name: 'performance_issue',
      description: 'Description of the performance problem',
      required: true,
    },
    {
      name: 'metrics',
      description: 'Performance metrics (load time, CPU usage, etc)',
      required: false,
    },
    {
      name: 'user_impact',
      description: 'How the issue affects users',
      required: false,
    },
    {
      name: 'target_improvement',
      description: 'Target performance improvement needed',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Fix performance issue: {{performance_issue}}\nMetrics: {{metrics}}\nUser impact: {{user_impact}}\nTarget: {{target_improvement}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll analyze and fix the performance bottleneck to meet your targets.

**Performance Analysis:**

1. **Profiling**
   - Measure current performance
   - Identify bottlenecks
   - Profile CPU and memory usage
   - Analyze network requests
   - Check rendering performance

2. **Common Bottlenecks**
   - Inefficient algorithms (O(n²) → O(n))
   - Excessive DOM manipulation
   - Unoptimized database queries
   - Large bundle sizes
   - Synchronous operations blocking UI

3. **Optimization Techniques**
   - Algorithm optimization
   - Caching strategies
   - Lazy loading
   - Code splitting
   - Database query optimization
   - CDN utilization

4. **Validation**
   - Benchmark improvements
   - Load testing
   - Real user monitoring
   - Performance budgets

I'll implement targeted optimizations to achieve your performance goals.`,
      },
    },
  ],
};