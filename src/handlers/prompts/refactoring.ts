/**
 * @file Code refactoring prompts
 * @module handlers/prompts/refactoring
 */

import type { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const REFACTOR_CODE_PROMPT: Prompt = {
  name: 'refactor_code',
  description: 'Refactor code for better maintainability and readability',
  arguments: [
    {
      name: 'file_path',
      description: 'Path to the file to refactor',
      required: true,
    },
    {
      name: 'refactor_goals',
      description: 'Specific refactoring goals (readability, performance, etc)',
      required: false,
    },
    {
      name: 'preserve_api',
      description: 'Whether to preserve the public API',
      required: false,
    },
    {
      name: 'patterns_to_apply',
      description: 'Design patterns to apply (e.g., SOLID, DRY)',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `# Code Refactoring Task

## Refactoring Target
- **File Path**: {{file_path}}
- **Goals**: {{refactor_goals}}
- **Preserve API**: {{preserve_api}}
- **Patterns to Apply**: {{patterns_to_apply}}

## Instructions

Refactor the code following these systematic guidelines:

### 1. Code Analysis Phase
**Code Smell Detection**:
- Long methods (>20 lines)
- Large classes (>200 lines)
- Long parameter lists (>3 parameters)
- Duplicate code blocks
- Complex conditionals
- Feature envy
- Data clumps
- Primitive obsession
- Switch statements
- Divergent change
- Shotgun surgery
- Lazy classes
- Dead code

**Complexity Assessment**:
- Calculate cyclomatic complexity
- Measure cognitive complexity
- Check nesting depth
- Count dependencies
- Review coupling metrics

### 2. Refactoring Techniques
**Method-Level Refactoring**:
- Extract Method: Break long methods into smaller, focused ones
- Inline Method: Remove unnecessary method indirection
- Extract Variable: Name complex expressions
- Inline Variable: Remove unnecessary variables
- Replace Temp with Query: Use methods instead of temporary variables
- Split Temporary Variable: One variable per purpose
- Remove Assignments to Parameters: Use local variables instead

**Class-Level Refactoring**:
- Extract Class: Split classes with multiple responsibilities
- Inline Class: Merge classes that do too little
- Move Method: Place methods where they belong
- Move Field: Relocate data to appropriate classes
- Extract Interface: Define contracts explicitly
- Pull Up Method/Field: Move common features to superclass
- Push Down Method/Field: Move specialized features to subclass

**Code Organization**:
- Replace Conditional with Polymorphism
- Replace Type Code with State/Strategy
- Replace Nested Conditional with Guard Clauses
- Consolidate Duplicate Conditional Fragments
- Remove Control Flag
- Replace Error Code with Exception
- Replace Exception with Test

### 3. Design Pattern Application
**SOLID Principles**:
- **Single Responsibility**: One reason to change per class
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Subtypes must be substitutable
- **Interface Segregation**: Many specific interfaces
- **Dependency Inversion**: Depend on abstractions

**Common Patterns**:
- Factory Pattern: For object creation
- Strategy Pattern: For algorithm selection
- Observer Pattern: For event handling
- Decorator Pattern: For extending functionality
- Repository Pattern: For data access
- Dependency Injection: For loose coupling

### 4. Code Quality Improvements
**Naming Conventions**:
- Use descriptive, intention-revealing names
- Avoid abbreviations and acronyms
- Use consistent naming patterns
- Make distinctions meaningful
- Use searchable names
- Avoid mental mapping

**Function Design**:
- Do one thing well
- One level of abstraction
- Minimize parameters
- No side effects
- Command-query separation
- Prefer exceptions to error codes

**Comment and Documentation**:
- Make code self-documenting
- Remove redundant comments
- Update outdated documentation
- Add why, not what comments
- Document complex algorithms
- Keep comments close to code

### 5. Performance Optimization
**When Refactoring for Performance**:
- Profile first, optimize second
- Focus on algorithmic improvements
- Reduce unnecessary allocations
- Cache expensive computations
- Lazy load when appropriate
- Use appropriate data structures

### 6. Testing Strategy
**Refactoring Safety**:
- Run all existing tests first
- Add characterization tests if missing
- Make small, incremental changes
- Test after each change
- Use automated refactoring tools when possible
- Keep tests green throughout

**Test Improvements**:
- Extract test helpers
- Remove test duplication
- Improve test names
- Add missing edge cases
- Increase coverage

### 7. API Preservation
If preserve_api is true:
- Keep all public method signatures
- Maintain return types
- Preserve exception behavior
- Use adapter pattern if needed
- Add deprecation warnings for changes
- Provide migration path

### 8. Incremental Approach
**Safe Refactoring Steps**:
1. Identify refactoring opportunity
2. Write/verify tests
3. Make small change
4. Run tests
5. Commit if green
6. Repeat until complete

**Rollback Strategy**:
- Use version control effectively
- Commit frequently
- Tag stable points
- Document major changes
- Keep refactoring branches short-lived

### Output Requirements
- Refactored code with improvements
- List of specific refactorings applied
- Before/after complexity metrics
- Any API changes documented
- Test coverage report
- Suggestions for further improvements`,
      },
    },
  ],
};

export const EXTRACT_COMMON_CODE_PROMPT: Prompt = {
  name: 'extract_common_code',
  description: 'Extract duplicated code into reusable functions or modules',
  arguments: [
    {
      name: 'files_to_analyze',
      description: 'Files to analyze for code duplication',
      required: true,
    },
    {
      name: 'min_duplication_lines',
      description: 'Minimum lines to consider as duplication',
      required: false,
    },
    {
      name: 'extraction_strategy',
      description: 'How to extract (utility functions, base classes, modules)',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `# Code Duplication Extraction Task

## Analysis Target
- **Files to Analyze**: {{files_to_analyze}}
- **Minimum Duplication Lines**: {{min_duplication_lines}}
- **Extraction Strategy**: {{extraction_strategy}}

## Instructions

Identify and extract duplicated code systematically:

### 1. Duplication Detection
**Types of Duplication**:
- **Exact Duplication**: Identical code blocks
- **Parameterized Duplication**: Same structure, different values
- **Structural Duplication**: Similar patterns with variations
- **Semantic Duplication**: Different code, same functionality

**Detection Process**:
1. Parse all specified files
2. Build abstract syntax trees
3. Identify similar subtrees
4. Calculate similarity scores
5. Group related duplications
6. Prioritize by impact

### 2. Analysis Criteria
**What to Look For**:
- Repeated code blocks (exact matches)
- Similar functions with minor variations
- Copy-paste with small modifications
- Parallel class hierarchies
- Repeated switch/if statements
- Similar data processing logic
- Duplicate validation rules
- Repeated error handling

**Duplication Metrics**:
- Lines of duplicated code
- Number of duplication instances
- Complexity of duplicated logic
- Maintenance cost estimation
- Test coverage overlap

### 3. Extraction Strategies
**Utility Functions**:
\`\`\`javascript
// Before: Duplicated in multiple files
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// After: Extracted to utils/validation.js
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
\`\`\`

**Base Classes**:
\`\`\`javascript
// Extract common behavior to base class
class BaseRepository {
  constructor(model) {
    this.model = model;
  }
  
  async findById(id) {
    return this.model.findById(id);
  }
  
  async findAll(filter = {}) {
    return this.model.find(filter);
  }
}
\`\`\`

**Shared Modules**:
\`\`\`javascript
// Create dedicated module for shared logic
export const DataProcessor = {
  normalize(data) { /* ... */ },
  validate(data) { /* ... */ },
  transform(data) { /* ... */ }
};
\`\`\`

**Higher-Order Functions**:
\`\`\`javascript
// Extract pattern into HOF
function createValidator(rules) {
  return function validate(data) {
    return rules.every(rule => rule(data));
  };
}
\`\`\`

### 4. Refactoring Process
**Step-by-Step Approach**:
1. **Identify**: Find all instances of duplication
2. **Analyze**: Understand variations and parameters
3. **Design**: Create appropriate abstraction
4. **Extract**: Move code to new location
5. **Parameterize**: Handle variations through parameters
6. **Replace**: Update all usages
7. **Test**: Ensure functionality preserved
8. **Document**: Add documentation for new abstractions

### 5. Extraction Patterns
**Method Extraction**:
- Identify common algorithm
- Extract to named method
- Pass varying data as parameters
- Return computed results

**Class Extraction**:
- Group related methods
- Encapsulate shared state
- Define clear interface
- Use inheritance or composition

**Module Extraction**:
- Create cohesive module
- Export public interface
- Hide implementation details
- Manage dependencies

**Template Method Pattern**:
\`\`\`javascript
class DataImporter {
  import(file) {
    const data = this.readFile(file);
    const validated = this.validate(data);
    const transformed = this.transform(validated);
    return this.save(transformed);
  }
  
  // Subclasses override these
  validate(data) { throw new Error('Must implement'); }
  transform(data) { throw new Error('Must implement'); }
}
\`\`\`

### 6. Quality Criteria
**Good Extraction**:
- Clear, single purpose
- Well-named and documented
- Properly parameterized
- Testable in isolation
- No hidden dependencies
- Follows DRY principle

**Avoid Over-Extraction**:
- Don't extract trivial code
- Keep related logic together
- Consider maintenance cost
- Balance DRY with clarity
- Avoid premature abstraction

### 7. Testing Strategy
**Before Extraction**:
- Ensure tests exist for all duplicated code
- Add characterization tests if missing
- Document current behavior

**During Extraction**:
- Keep tests green
- Test extracted code independently
- Verify all call sites work
- Check edge cases

**After Extraction**:
- Remove redundant tests
- Add tests for new abstractions
- Update integration tests
- Verify performance unchanged

### Output Requirements
- List of all duplications found
- Extracted functions/classes/modules
- Updated code with duplications removed
- Mapping of old code to new abstractions
- Test coverage report
- Recommendations for further consolidation`,
      },
    },
  ],
};

export const SIMPLIFY_COMPLEX_FUNCTION_PROMPT: Prompt = {
  name: 'simplify_complex_function',
  description: 'Break down complex functions into simpler, more manageable pieces',
  arguments: [
    {
      name: 'function_location',
      description: 'File and function name to simplify',
      required: true,
    },
    {
      name: 'complexity_metrics',
      description: 'Current complexity metrics if known',
      required: false,
    },
    {
      name: 'target_complexity',
      description: 'Target cyclomatic complexity',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `# Function Simplification Task

## Target Function
- **Location**: {{function_location}}
- **Current Complexity**: {{complexity_metrics}}
- **Target Complexity**: {{target_complexity}}

## Instructions

Simplify the complex function using these techniques:

### 1. Complexity Analysis
**Metrics to Calculate**:
- **Cyclomatic Complexity**: Number of independent paths
- **Cognitive Complexity**: Mental effort to understand
- **Nesting Depth**: Maximum nested levels
- **Parameter Count**: Number of parameters
- **Line Count**: Total lines in function
- **Variable Count**: Number of local variables

**Complexity Indicators**:
- Multiple nested loops
- Deep conditional nesting
- Long switch statements
- Many exit points
- Complex boolean expressions
- High coupling
- Multiple responsibilities

### 2. Decomposition Strategies
**Extract Till You Drop**:
\`\`\`javascript
// Before: Complex validation
function validateOrder(order) {
  if (!order) return false;
  if (!order.items || order.items.length === 0) return false;
  
  let total = 0;
  for (let item of order.items) {
    if (!item.product || !item.quantity) return false;
    if (item.quantity <= 0) return false;
    if (!item.product.price || item.product.price < 0) return false;
    total += item.product.price * item.quantity;
  }
  
  if (order.discount) {
    if (order.discount.type === 'percentage') {
      if (order.discount.value > 100) return false;
      total *= (1 - order.discount.value / 100);
    } else {
      total -= order.discount.value;
    }
  }
  
  return total > 0;
}

// After: Simplified with extracted methods
function validateOrder(order) {
  if (!isOrderStructureValid(order)) return false;
  if (!areAllItemsValid(order.items)) return false;
  
  const total = calculateOrderTotal(order);
  return total > 0;
}

function isOrderStructureValid(order) {
  return order && order.items && order.items.length > 0;
}

function areAllItemsValid(items) {
  return items.every(isItemValid);
}

function isItemValid(item) {
  return item.product && 
         item.quantity > 0 && 
         item.product.price >= 0;
}

function calculateOrderTotal(order) {
  const subtotal = calculateSubtotal(order.items);
  return applyDiscount(subtotal, order.discount);
}
\`\`\`

### 3. Simplification Patterns
**Replace Nested Conditionals with Guard Clauses**:
\`\`\`javascript
// Before
function processPayment(payment) {
  if (payment) {
    if (payment.amount > 0) {
      if (payment.currency) {
        if (isValidCurrency(payment.currency)) {
          // Process payment
        }
      }
    }
  }
}

// After
function processPayment(payment) {
  if (!payment) return;
  if (payment.amount <= 0) return;
  if (!payment.currency) return;
  if (!isValidCurrency(payment.currency)) return;
  
  // Process payment
}
\`\`\`

**Replace Conditional with Polymorphism**:
\`\`\`javascript
// Before: Complex switch
function calculateShipping(type, weight, distance) {
  switch(type) {
    case 'standard':
      return weight * 0.5 + distance * 0.1;
    case 'express':
      return weight * 1.0 + distance * 0.2 + 10;
    case 'overnight':
      return weight * 2.0 + distance * 0.5 + 25;
  }
}

// After: Strategy pattern
const shippingStrategies = {
  standard: (w, d) => w * 0.5 + d * 0.1,
  express: (w, d) => w * 1.0 + d * 0.2 + 10,
  overnight: (w, d) => w * 2.0 + d * 0.5 + 25
};

function calculateShipping(type, weight, distance) {
  return shippingStrategies[type](weight, distance);
}
\`\`\`

### 4. Functional Decomposition
**Command-Query Separation**:
- Commands: Change state, return void
- Queries: Return values, no side effects
- Don't mix both in one function

**Single Level of Abstraction**:
\`\`\`javascript
// All statements at same abstraction level
function processOrder(order) {
  validateOrder(order);
  calculatePricing(order);
  applyDiscounts(order);
  calculateTaxes(order);
  saveOrder(order);
  sendConfirmation(order);
}
\`\`\`

**Compose Small Functions**:
\`\`\`javascript
const processData = pipe(
  validateInput,
  normalizeData,
  enrichData,
  transformFormat,
  saveToDatabase
);
\`\`\`

### 5. Refactoring Techniques
**Extract Method**:
- Identify cohesive code blocks
- Extract to named functions
- Pass necessary parameters
- Return computed values

**Replace Method with Method Object**:
- For very complex methods
- Create class for the algorithm
- Move locals to fields
- Extract methods freely

**Introduce Parameter Object**:
\`\`\`javascript
// Before: Many parameters
function createUser(name, email, age, address, phone) {}

// After: Parameter object
function createUser(userDetails) {}
\`\`\`

### 6. Code Organization
**Arrange-Act-Assert Pattern**:
\`\`\`javascript
function processTransaction(transaction) {
  // Arrange - Setup and validation
  const validatedData = validate(transaction);
  const account = getAccount(transaction.accountId);
  
  // Act - Core logic
  const result = executeTransaction(validatedData, account);
  
  // Assert - Verify and return
  verifyResult(result);
  return result;
}
\`\`\`

### 7. Testing Considerations
**Test Each Extracted Function**:
- Unit test in isolation
- Mock dependencies
- Test edge cases
- Verify error handling

**Integration Testing**:
- Test the simplified function
- Ensure behavior preserved
- Check performance impact
- Verify error propagation

### Output Requirements
- Simplified function implementation
- All extracted helper functions
- Complexity metrics (before/after)
- Test cases for new functions
- Documentation updates
- Recommendations for further improvements`,
      },
    },
  ],
};

export const MODERNIZE_LEGACY_CODE_PROMPT: Prompt = {
  name: 'modernize_legacy_code',
  description: 'Update legacy code to use modern patterns and syntax',
  arguments: [
    {
      name: 'legacy_files',
      description: 'Legacy files to modernize',
      required: true,
    },
    {
      name: 'target_version',
      description: 'Target language/framework version',
      required: true,
    },
    {
      name: 'modernization_goals',
      description: 'Specific modernization goals',
      required: false,
    },
    {
      name: 'backward_compatibility',
      description: 'Whether to maintain backward compatibility',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `# Legacy Code Modernization Task

## Modernization Target
- **Legacy Files**: {{legacy_files}}
- **Target Version**: {{target_version}}
- **Goals**: {{modernization_goals}}
- **Backward Compatibility**: {{backward_compatibility}}

## Instructions

Modernize legacy code following these guidelines:

### 1. Legacy Pattern Assessment
**Common Legacy Patterns to Find**:
- Callback hell / Pyramid of doom
- Global variables and functions
- Prototype-based inheritance
- var declarations
- String concatenation for templates
- XMLHttpRequest for AJAX
- jQuery dependencies
- Synchronous operations
- Manual type checking
- Old module patterns (IIFE, AMD, CommonJS)

**Code Quality Issues**:
- No error handling
- Missing input validation
- Security vulnerabilities
- Performance bottlenecks
- Memory leaks
- Browser compatibility hacks
- Deprecated APIs

### 2. Modern JavaScript/TypeScript Features
**ES6+ Syntax Updates**:
\`\`\`javascript
// Arrow functions
const add = (a, b) => a + b;

// Destructuring
const { name, age } = user;
const [first, ...rest] = array;

// Template literals
const message = \`Hello, \${name}!\`;

// Default parameters
function greet(name = 'World') {}

// Spread operator
const combined = [...array1, ...array2];
const cloned = { ...original };

// Classes
class User extends BaseUser {
  constructor(name) {
    super();
    this.name = name;
  }
}
\`\`\`

**Async/Await Pattern**:
\`\`\`javascript
// Before: Callbacks
function loadData(callback) {
  fetchUser((err, user) => {
    if (err) return callback(err);
    fetchPosts(user.id, (err, posts) => {
      if (err) return callback(err);
      callback(null, { user, posts });
    });
  });
}

// After: Async/await
async function loadData() {
  try {
    const user = await fetchUser();
    const posts = await fetchPosts(user.id);
    return { user, posts };
  } catch (error) {
    throw new Error(\`Failed to load data: \${error.message}\`);
  }
}
\`\`\`

### 3. Framework Migration
**jQuery to Vanilla JS**:
\`\`\`javascript
// jQuery
$('#button').click(function() {
  $('.result').html('Clicked');
});

// Modern
document.getElementById('button').addEventListener('click', () => {
  document.querySelector('.result').textContent = 'Clicked';
});
\`\`\`

**Module System Migration**:
\`\`\`javascript
// CommonJS
const utils = require('./utils');
module.exports = { myFunction };

// ES Modules
import utils from './utils.js';
export { myFunction };
\`\`\`

### 4. TypeScript Migration
**Add Type Definitions**:
\`\`\`typescript
// Before
function processUser(user) {
  return user.name.toUpperCase();
}

// After
interface User {
  name: string;
  email: string;
  age: number;
}

function processUser(user: User): string {
  return user.name.toUpperCase();
}
\`\`\`

**Strict Type Checking**:
- Enable strict mode
- Fix any types
- Add return types
- Define interfaces
- Use enums for constants
- Implement generics

### 5. API Modernization
**Fetch API**:
\`\`\`javascript
// Before: XMLHttpRequest
const xhr = new XMLHttpRequest();
xhr.open('GET', '/api/data');
xhr.onload = function() {
  if (xhr.status === 200) {
    const data = JSON.parse(xhr.responseText);
  }
};
xhr.send();

// After: Fetch
const response = await fetch('/api/data');
const data = await response.json();
\`\`\`

**Modern DOM APIs**:
- querySelector/querySelectorAll
- classList API
- dataset properties
- Web Components
- Intersection Observer
- Modern event handling

### 6. Security Updates
**Input Sanitization**:
\`\`\`javascript
// Use DOMPurify or similar
const clean = DOMPurify.sanitize(userInput);

// Escape HTML entities
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
\`\`\`

**Content Security Policy**:
- Remove inline scripts
- Use nonce or hash
- Configure CSP headers
- Avoid eval()

### 7. Performance Optimization
**Lazy Loading**:
\`\`\`javascript
// Dynamic imports
const module = await import('./heavy-module.js');

// Intersection Observer for images
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.src = entry.target.dataset.src;
    }
  });
});
\`\`\`

**Web Workers**:
\`\`\`javascript
// Offload heavy computation
const worker = new Worker('processor.js');
worker.postMessage({ cmd: 'process', data });
worker.onmessage = (e) => {
  console.log('Result:', e.data);
};
\`\`\`

### 8. Testing Migration
**Modern Testing Framework**:
\`\`\`javascript
// Jest/Vitest example
describe('User Service', () => {
  it('should create user', async () => {
    const user = await createUser({ name: 'John' });
    expect(user).toHaveProperty('id');
    expect(user.name).toBe('John');
  });
});
\`\`\`

### 9. Build Tool Updates
**Modern Build Configuration**:
- Webpack/Vite/Rollup
- ES modules support
- Tree shaking
- Code splitting
- Hot module replacement
- TypeScript compilation

### 10. Backward Compatibility
If maintaining compatibility:
- Use polyfills for new features
- Progressive enhancement
- Feature detection
- Transpilation targets
- Graceful degradation
- Version documentation

### Output Requirements
- Modernized code files
- Migration report with changes
- Breaking changes documentation
- Performance improvements
- Security fixes applied
- Test coverage report
- Deployment guide`,
      },
    },
  ],
};

export const IMPROVE_CODE_ARCHITECTURE_PROMPT: Prompt = {
  name: 'improve_architecture',
  description: 'Restructure code for better architecture and organization',
  arguments: [
    {
      name: 'project_structure',
      description: 'Current project structure description',
      required: true,
    },
    {
      name: 'architecture_goals',
      description: 'Architectural improvements needed',
      required: true,
    },
    {
      name: 'constraints',
      description: 'Constraints to consider (time, resources, compatibility)',
      required: false,
    },
    {
      name: 'patterns_to_implement',
      description: 'Architectural patterns to implement (MVC, microservices, etc)',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `# Architecture Improvement Task

## Current State
- **Project Structure**: {{project_structure}}
- **Architecture Goals**: {{architecture_goals}}
- **Constraints**: {{constraints}}
- **Target Patterns**: {{patterns_to_implement}}

## Instructions

Improve the code architecture following these principles:

### 1. Architecture Assessment
**Current State Analysis**:
- Module dependencies and coupling
- Layer violations
- Circular dependencies
- God objects/modules
- Anemic domain model
- Missing abstractions
- Tight coupling points
- Scalability bottlenecks

**Dependency Analysis**:
\`\`\`
- Identify inbound/outbound dependencies
- Calculate coupling metrics
- Find circular references
- Detect layer violations
- Map integration points
\`\`\`

### 2. Architectural Patterns
**Layered Architecture**:
\`\`\`
presentation/
├── controllers/
├── views/
└── validators/

business/
├── services/
├── domain/
└── rules/

data/
├── repositories/
├── entities/
└── migrations/

infrastructure/
├── config/
├── logging/
└── external/
\`\`\`

**Hexagonal Architecture**:
\`\`\`
core/
├── domain/
├── ports/
└── usecases/

adapters/
├── inbound/
│   ├── web/
│   └── cli/
└── outbound/
    ├── persistence/
    └── external/
\`\`\`

**Clean Architecture**:
\`\`\`
entities/          # Business objects
usecases/         # Application business rules
interfaces/       # Interface adapters
frameworks/       # External frameworks
\`\`\`

### 3. Design Principles
**SOLID Implementation**:

**Single Responsibility**:
\`\`\`javascript
// Before: Multiple responsibilities
class UserService {
  createUser() {}
  sendEmail() {}
  logActivity() {}
  validateInput() {}
}

// After: Separated concerns
class UserService {
  createUser() {}
}
class EmailService {
  sendEmail() {}
}
class ActivityLogger {
  logActivity() {}
}
\`\`\`

**Dependency Inversion**:
\`\`\`javascript
// Define interfaces
interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User>;
}

// Implement abstraction
class UserService {
  constructor(private repo: UserRepository) {}
  
  async createUser(data: UserData) {
    const user = new User(data);
    await this.repo.save(user);
    return user;
  }
}
\`\`\`

### 4. Module Organization
**Feature-Based Structure**:
\`\`\`
features/
├── auth/
│   ├── components/
│   ├── services/
│   ├── models/
│   └── tests/
├── users/
│   ├── components/
│   ├── services/
│   ├── models/
│   └── tests/
└── products/
    ├── components/
    ├── services/
    ├── models/
    └── tests/
\`\`\`

**Domain-Driven Design**:
\`\`\`
bounded-contexts/
├── identity/
│   ├── domain/
│   ├── application/
│   └── infrastructure/
├── catalog/
│   ├── domain/
│   ├── application/
│   └── infrastructure/
└── ordering/
    ├── domain/
    ├── application/
    └── infrastructure/
\`\`\`

### 5. Dependency Management
**Dependency Injection**:
\`\`\`javascript
// Container setup
const container = new Container();
container.register('UserRepository', PostgresUserRepository);
container.register('EmailService', SMTPEmailService);
container.register('UserService', UserService);

// Usage
const userService = container.resolve('UserService');
\`\`\`

**Interface Segregation**:
\`\`\`javascript
// Instead of one large interface
interface Repository {
  create(), read(), update(), delete(), 
  search(), count(), exists(), bulk()
}

// Multiple focused interfaces
interface Reader<T> {
  findById(id: string): Promise<T>;
  findAll(): Promise<T[]>;
}

interface Writer<T> {
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}
\`\`\`

### 6. Communication Patterns
**Event-Driven Architecture**:
\`\`\`javascript
class EventBus {
  private handlers = new Map();
  
  subscribe(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);
  }
  
  publish(event, data) {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
}
\`\`\`

**Message Queue Pattern**:
\`\`\`javascript
interface MessageQueue {
  publish(topic: string, message: any): Promise<void>;
  subscribe(topic: string, handler: Handler): void;
}
\`\`\`

### 7. Scalability Patterns
**Microservices Boundaries**:
- Identify service boundaries
- Define API contracts
- Implement service discovery
- Handle distributed transactions
- Implement circuit breakers

**Caching Strategy**:
\`\`\`javascript
class CachedRepository implements UserRepository {
  constructor(
    private repository: UserRepository,
    private cache: Cache
  ) {}
  
  async findById(id: string) {
    const cached = await this.cache.get(id);
    if (cached) return cached;
    
    const user = await this.repository.findById(id);
    await this.cache.set(id, user);
    return user;
  }
}
\`\`\`

### 8. Testing Architecture
**Test Organization**:
\`\`\`
tests/
├── unit/
├── integration/
├── e2e/
└── fixtures/
\`\`\`

**Test Patterns**:
- Repository pattern for test data
- Builder pattern for test objects
- Mock factories
- Test containers

### 9. Migration Strategy
**Incremental Refactoring**:
1. Create new structure alongside old
2. Implement adapters/facades
3. Migrate module by module
4. Update imports gradually
5. Remove old structure

**Strangler Fig Pattern**:
- Wrap legacy code
- Redirect to new implementation
- Gradually replace functionality
- Remove legacy when complete

### 10. Documentation
**Architecture Decision Records**:
\`\`\`markdown
# ADR-001: Adopt Hexagonal Architecture

## Status
Accepted

## Context
Need better separation of concerns...

## Decision
Implement hexagonal architecture...

## Consequences
- Better testability
- Clear boundaries
- Initial complexity
\`\`\`

### Output Requirements
- New architecture implementation
- Migration plan with phases
- Dependency graphs (before/after)
- API documentation
- Performance impact analysis
- Risk assessment
- Rollback procedures`,
      },
    },
  ],
};