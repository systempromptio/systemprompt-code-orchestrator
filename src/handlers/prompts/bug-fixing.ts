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
        text: `# Bug Fix Task

## Bug Description
{{bug_description}}

## Error Information
{{error_message}}

## Affected Files
{{affected_files}}

## Reproduction Steps
{{reproduction_steps}}

## Instructions

You are tasked with diagnosing and fixing this bug. Follow this systematic approach:

### 1. Error Analysis
- Parse and understand the error message and stack trace
- Identify the exact error type, location, and failure context
- Search for similar or related issues in the codebase
- Document your understanding of what's failing and why

### 2. Root Cause Investigation
- Trace the execution flow leading to the error
- Examine the state of variables at the point of failure
- Analyze data transformations and type conversions
- Identify edge cases or unexpected inputs
- Check for race conditions or timing issues

### 3. Debugging Implementation
- Add strategic console.log statements or debugging output
- Use appropriate debugging tools for the language/framework
- Isolate the problem to the smallest reproducible case
- Test your hypotheses systematically
- Document each finding

### 4. Fix Development
- Implement the minimal necessary changes to fix the bug
- Handle all identified edge cases properly
- Add defensive programming measures to prevent similar issues
- Ensure the fix doesn't introduce regression
- Add appropriate error handling and validation

### 5. Testing & Validation
- Verify the bug is fixed with the original reproduction steps
- Test edge cases and boundary conditions
- Ensure no existing functionality is broken
- Add unit tests to prevent regression
- Update documentation if needed

### Output Requirements
- Provide a clear explanation of the root cause
- Show the exact code changes needed
- Include any new tests or validation logic
- Document any assumptions or limitations
- Suggest preventive measures for similar bugs`,
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
        text: `# Asynchronous Issue Debugging Task

## Issue Description
{{issue_description}}

## Observed Symptoms
{{symptoms}}

## Async Operations Involved
{{async_operations}}

## Instructions

Debug and fix this asynchronous/timing issue using the following systematic approach:

### 1. Issue Classification
Identify the type of async issue:
- Race conditions between competing operations
- Incorrect promise handling or chaining
- Missing await keywords causing premature execution
- Callback hell or pyramid of doom patterns
- Event loop blocking from synchronous operations
- Deadlocks from circular dependencies
- Memory leaks from unresolved promises

### 2. Diagnostic Analysis
- Add timestamp logging before and after each async operation
- Trace the complete async execution flow
- Monitor promise states (pending, fulfilled, rejected)
- Check for unhandled promise rejections
- Identify operations that should be sequential vs parallel
- Measure actual execution order vs expected order
- Look for shared state mutations

### 3. Implementation Solutions
- Convert callback-based code to async/await for clarity
- Use Promise.all() for truly parallel operations
- Use Promise.allSettled() when you need all results regardless of failures
- Implement proper sequential processing with for-await loops
- Add timeout handling with Promise.race()
- Create error boundaries for async error propagation
- Use mutex/semaphore patterns for resource access control
- Implement proper cleanup in finally blocks

### 4. Error Handling Strategy
- Wrap async operations in try-catch blocks
- Implement exponential backoff for retry logic
- Add circuit breakers for failing services
- Use proper error propagation patterns
- Log errors with full context
- Implement graceful degradation

### 5. Prevention & Best Practices
- Establish consistent async patterns across the codebase
- Use TypeScript to catch promise handling errors
- Implement integration tests for async flows
- Add concurrency controls (rate limiting, connection pooling)
- Document async contracts and dependencies
- Use observability tools for production monitoring

### Output Requirements
- Detailed explanation of the root cause
- Step-by-step fix implementation
- Before/after code comparison
- Test cases covering the async scenarios
- Performance impact analysis
- Recommendations for preventing similar issues`,
      },
    },
  ],
}

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
        text: `# Memory Leak Fix Task

## Symptoms
{{symptoms}}

## Suspected Areas
{{suspected_areas}}

## Profiler Data
{{profiler_data}}

## Instructions

Identify and fix memory leaks using this comprehensive approach:

### 1. Leak Source Identification
Investigate common memory leak sources:
- **Event Listeners**: Not removed when components unmount
- **Timers**: setInterval/setTimeout not cleared
- **Closures**: Functions holding references to large objects
- **DOM References**: JavaScript keeping references to removed DOM nodes
- **Caches**: Unbounded caches growing without limits
- **Global Variables**: Accidental globals holding data
- **Circular References**: Objects referencing each other
- **WebSocket/SSE**: Connections not properly closed
- **Worker Threads**: Not terminated properly
- **External Libraries**: Third-party code leaking memory

### 2. Diagnostic Process
- Take initial heap snapshot as baseline
- Perform the actions that cause memory growth
- Take another heap snapshot
- Compare snapshots to find growing objects
- Use Chrome DevTools "Allocation Timeline" to track allocations
- Identify retained objects and their retainer chains
- Look for detached DOM trees
- Check for growing array/object sizes
- Monitor garbage collection frequency

### 3. Analysis Techniques
- Use performance.measureUserAgentSpecificMemory() for measurements
- Add memory logging at strategic points
- Track object counts and sizes over time
- Use WeakMap/WeakSet for metadata storage
- Implement memory profiling in tests
- Monitor memory in production with tools

### 4. Fix Implementation
**Event Listener Management**:
- Store listener references for removal
- Use AbortController for multiple listeners
- Implement proper cleanup in destroy/unmount methods

**Timer Management**:
- Store timer IDs and clear on cleanup
- Use requestAnimationFrame with proper cancellation
- Implement timeout wrappers with automatic cleanup

**Reference Management**:
- Nullify references in cleanup code
- Use WeakRef for optional references
- Implement proper disposal patterns
- Clear caches periodically or use LRU eviction

**Component Lifecycle**:
- Implement componentWillUnmount/cleanup properly
- Remove all subscriptions and listeners
- Cancel pending async operations
- Clear any component-specific caches

### 5. Verification & Testing
- Re-run memory profiling after fixes
- Verify memory stabilizes over time
- Add automated memory leak tests
- Use tools like heapdump for Node.js
- Implement memory budgets and alerts
- Monitor memory metrics in production

### 6. Prevention Strategies
- Establish coding standards for cleanup
- Use linting rules for common leak patterns
- Implement resource management classes
- Create reusable cleanup utilities
- Regular memory audits in CI/CD
- Document memory management patterns

### Output Requirements
- Identify specific objects/references causing leaks
- Provide before/after memory profiles
- Show exact code changes needed
- Include cleanup implementation
- Add tests to prevent regression
- Document memory management best practices for the team`,
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
        text: `# Production Issue Debugging Task

## Issue Description
{{issue_description}}

## Environment Differences
{{environment_differences}}

## Available Logs/Monitoring
{{logs_available}}

## Instructions

Debug this production-specific issue using safe, systematic approaches:

### 1. Environment Comparison Analysis
**Build & Compilation**:
- Production build optimizations (minification, tree-shaking)
- Source map availability and accuracy
- Bundler configuration differences
- Transpilation targets and polyfills
- Dead code elimination effects

**Configuration**:
- Environment variables and secrets
- API endpoints and service URLs
- Feature flags and toggles
- Third-party service configurations
- Database connection strings

**Infrastructure**:
- CDN configuration and caching headers
- Load balancer settings and health checks
- SSL/TLS certificates and HTTPS redirects
- Reverse proxy configurations
- Container orchestration differences

### 2. Diagnostic Strategy
**Safe Logging Implementation**:
- Add structured logging with correlation IDs
- Use sampling to avoid log flooding
- Implement log levels appropriate for production
- Ensure no sensitive data in logs
- Use centralized logging services

**Monitoring Enhancement**:
- Add custom metrics for the issue area
- Implement distributed tracing
- Set up error tracking with context
- Monitor resource utilization
- Track user journey analytics

**Feature Flag Debugging**:
- Create debug feature flags
- Target specific users or percentages
- Add verbose logging behind flags
- Implement A/B testing for fixes
- Use canary deployments

### 3. Common Production-Only Issues
**Security & Network**:
- CORS policies blocking requests
- Content Security Policy restrictions
- Mixed content HTTPS/HTTP issues
- Authentication token expiration
- Rate limiting and throttling
- Firewall or WAF rules

**Performance & Scale**:
- Database connection pool exhaustion
- Memory limits in containers
- CPU throttling under load
- Disk space issues
- Network timeouts
- Queue backlog problems

**External Dependencies**:
- Third-party API failures
- CDN availability issues
- DNS resolution problems
- Certificate expiration
- Service version mismatches

**Client-Side Issues**:
- Browser compatibility problems
- Ad blockers interfering
- Browser extensions conflicts
- Mobile-specific behaviors
- Progressive Web App cache issues

### 4. Investigation Techniques
**Data Collection**:
- Gather error reports from multiple sources
- Correlate with deployment timeline
- Check for patterns (time, geography, user type)
- Review recent changes and deployments
- Analyze traffic patterns

**Reproduction Attempts**:
- Use production-like staging environment
- Simulate production load
- Test with production data (anonymized)
- Use same CDN and services
- Match production configuration exactly

### 5. Safe Fix Implementation
**Testing Strategy**:
- Implement fix in staging first
- Use shadow/dark testing
- Gradual rollout with monitoring
- Have instant rollback ready
- Document the fix thoroughly

**Deployment Safety**:
- Use blue-green deployments
- Implement circuit breakers
- Add health check endpoints
- Monitor error rates during rollout
- Keep stakeholders informed

### 6. Post-Fix Actions
- Add regression tests
- Update monitoring and alerts
- Document the issue and resolution
- Conduct post-mortem analysis
- Improve dev-prod parity
- Update runbooks

### Output Requirements
- Root cause analysis with evidence
- Environment-specific factors identified
- Safe fix implementation plan
- Rollback procedures
- Monitoring additions needed
- Lessons learned and prevention measures`,
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
        text: `# Performance Optimization Task

## Performance Issue
{{performance_issue}}

## Current Metrics
{{metrics}}

## User Impact
{{user_impact}}

## Target Improvement
{{target_improvement}}

## Instructions

Diagnose and fix performance bottlenecks using this comprehensive approach:

### 1. Performance Profiling
**Measurement Tools**:
- Browser DevTools Performance tab
- Lighthouse for web vitals
- Application Performance Monitoring (APM)
- Custom performance marks and measures
- Database query analyzers
- Network waterfall analysis

**Key Metrics to Analyze**:
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Cumulative Layout Shift (CLS)
- Total Blocking Time (TBT)
- Memory usage patterns
- CPU utilization
- Network request count and size

### 2. Bottleneck Identification
**Algorithm Analysis**:
- Identify O(n²) or worse complexity
- Find nested loops over large datasets
- Detect redundant calculations
- Look for recursive functions without memoization
- Check sorting and searching efficiency

**Frontend Performance**:
- Excessive DOM manipulations
- Layout thrashing (repeated style calculations)
- Large JavaScript bundles blocking parsing
- Render-blocking resources
- Unoptimized images and media
- Missing browser caching
- Synchronous XHR requests

**Backend Performance**:
- N+1 database queries
- Missing database indexes
- Inefficient ORM usage
- Synchronous I/O operations
- Missing caching layers
- API response payload size
- Sequential operations that could be parallel

### 3. Optimization Strategies
**Algorithm Optimization**:
- Replace inefficient algorithms with optimal ones
- Implement memoization for expensive calculations
- Use appropriate data structures (Map vs Array)
- Batch operations where possible
- Implement pagination or virtual scrolling

**Code Splitting & Loading**:
- Dynamic imports for route-based splitting
- Lazy load below-the-fold content
- Implement progressive enhancement
- Use resource hints (preconnect, prefetch)
- Optimize critical rendering path

**Caching Implementation**:
- Browser caching with proper headers
- Service Worker for offline caching
- CDN for static assets
- Redis/Memcached for server-side caching
- Database query result caching
- Implement cache invalidation strategies

**Database Optimization**:
- Add appropriate indexes
- Optimize query execution plans
- Denormalize for read performance
- Implement read replicas
- Use database-specific optimizations
- Consider NoSQL for appropriate use cases

**Asset Optimization**:
- Image compression and format selection
- Responsive images with srcset
- Font subsetting and optimization
- Minification and compression
- Tree shaking unused code
- CSS and JavaScript optimization

**Runtime Optimization**:
- Debounce and throttle event handlers
- Use requestAnimationFrame for animations
- Implement virtual scrolling for long lists
- Web Workers for CPU-intensive tasks
- Optimize React re-renders
- Use production builds

### 4. Implementation Plan
1. Establish baseline measurements
2. Implement quick wins first
3. Tackle algorithmic improvements
4. Optimize critical path
5. Add caching layers
6. Implement lazy loading
7. Optimize assets and bundles
8. Fine-tune database queries

### 5. Validation & Monitoring
**Testing Strategy**:
- A/B test performance changes
- Load testing with realistic data
- Synthetic monitoring
- Real User Monitoring (RUM)
- Performance regression tests
- Mobile performance testing

**Success Metrics**:
- Meet target performance goals
- Maintain functionality
- No regression in other areas
- Improved user experience metrics
- Reduced infrastructure costs

### 6. Long-term Maintenance
- Set performance budgets
- Automate performance testing
- Regular performance audits
- Monitor production metrics
- Document optimization decisions
- Train team on performance best practices

### Output Requirements
- Detailed performance analysis report
- Specific bottlenecks identified with data
- Optimization implementation with benchmarks
- Before/after performance comparisons
- Monitoring setup for ongoing tracking
- Documentation of all changes made`,
      },
    },
  ],
};