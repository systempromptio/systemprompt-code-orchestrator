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
        text: 'Refactor the code at {{file_path}} focusing on: {{refactor_goals}}. Preserve API: {{preserve_api}}, Apply patterns: {{patterns_to_apply}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll refactor your code to improve its quality while maintaining functionality.

**Refactoring Strategy:**

1. **Code Analysis**
   - Identify code smells
   - Find duplicated logic
   - Assess complexity metrics
   - Review naming conventions

2. **Refactoring Techniques**
   - Extract methods/functions
   - Rename for clarity
   - Remove dead code
   - Simplify conditionals
   - Extract constants

3. **Design Improvements**
   - Apply SOLID principles
   - Improve modularity
   - Enhance testability
   - Reduce coupling
   - Increase cohesion

4. **Quality Assurance**
   - Maintain all functionality
   - Improve code coverage
   - Update documentation
   - Ensure backward compatibility

I'll systematically improve the code structure while preserving behavior.`,
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
        text: 'Find and extract duplicated code from: {{files_to_analyze}}. Min lines: {{min_duplication_lines}}, Strategy: {{extraction_strategy}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll identify and extract duplicated code into reusable components.

**Duplication Analysis:**

1. **Detection Process**
   - Scan for similar code patterns
   - Identify exact duplicates
   - Find structural similarities
   - Detect copy-paste variations

2. **Extraction Strategy**
   - Create utility functions
   - Build shared modules
   - Design base classes
   - Implement mixins/traits
   - Use composition patterns

3. **Refactoring Steps**
   - Extract common functionality
   - Parameterize differences
   - Create clean interfaces
   - Update all usages
   - Remove duplication

4. **Best Practices**
   - Keep functions focused
   - Use descriptive names
   - Add proper documentation
   - Maintain testability
   - Consider future reuse

I'll eliminate duplication while creating clean, reusable abstractions.`,
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
        text: 'Simplify the complex function at {{function_location}}. Current complexity: {{complexity_metrics}}, Target: {{target_complexity}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll break down this complex function into simpler, more maintainable pieces.

**Simplification Approach:**

1. **Complexity Analysis**
   - Measure cyclomatic complexity
   - Count nested levels
   - Identify long methods
   - Find multiple responsibilities

2. **Decomposition Techniques**
   - Extract helper functions
   - Use early returns
   - Replace conditionals with polymorphism
   - Implement guard clauses
   - Apply functional composition

3. **Refactoring Steps**
   - Identify logical sections
   - Extract each responsibility
   - Reduce nesting levels
   - Simplify control flow
   - Remove redundant code

4. **Quality Improvements**
   - Better naming
   - Single responsibility
   - Easier testing
   - Improved readability
   - Lower cognitive load

I'll transform the complex function into clean, simple, focused functions.`,
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
        text: 'Modernize legacy code in {{legacy_files}} to {{target_version}}. Goals: {{modernization_goals}}, Compatibility: {{backward_compatibility}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll modernize your legacy code to use current best practices and features.

**Modernization Plan:**

1. **Legacy Pattern Analysis**
   - Identify outdated patterns
   - Find deprecated APIs
   - Assess framework versions
   - Check security issues

2. **Modern Replacements**
   - Update syntax (arrow functions, destructuring)
   - Use modern APIs
   - Apply current design patterns
   - Implement type safety
   - Add async/await

3. **Migration Steps**
   - Update dependencies
   - Replace deprecated code
   - Improve error handling
   - Enhance performance
   - Add modern tooling

4. **Quality Assurance**
   - Maintain functionality
   - Add missing tests
   - Update documentation
   - Ensure compatibility
   - Fix security vulnerabilities

I'll carefully modernize the code while ensuring stability and compatibility.`,
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
        text: 'Improve architecture of {{project_structure}} to achieve: {{architecture_goals}}. Constraints: {{constraints}}, Patterns: {{patterns_to_implement}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll restructure your code architecture for better organization and scalability.

**Architectural Analysis:**

1. **Current State Assessment**
   - Review module dependencies
   - Identify architectural debt
   - Find coupling issues
   - Assess scalability limits

2. **Architectural Improvements**
   - Implement separation of concerns
   - Create clear boundaries
   - Design clean interfaces
   - Apply dependency injection
   - Use appropriate patterns

3. **Restructuring Plan**
   - Reorganize folder structure
   - Extract domain logic
   - Separate infrastructure
   - Implement service layers
   - Create clear APIs

4. **Implementation Strategy**
   - Incremental refactoring
   - Maintain working system
   - Add integration tests
   - Document architecture
   - Plan migration path

I'll create a clean, scalable architecture that supports your project's growth.`,
      },
    },
  ],
};