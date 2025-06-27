# Coding Prompts

This directory contains specialized prompts for common coding tasks that can be used with the MCP server.

## Available Prompts

### Unit Testing Prompts
- `create_unit_tests` - Create comprehensive unit tests until 100% pass rate
- `add_missing_tests` - Identify and add missing test cases
- `fix_failing_tests` - Debug and fix failing unit tests
- `improve_test_coverage` - Improve test coverage to meet targets

### React Component Prompts
- `create_react_component` - Create a new React component with specified functionality
- `update_react_component` - Update an existing component with new features
- `convert_to_hooks` - Convert class components to functional components with hooks
- `create_custom_hook` - Extract logic into reusable custom hooks
- `optimize_react_performance` - Optimize React components for better performance

### Bug Fixing Prompts
- `fix_bug` - Diagnose and fix bugs in the code
- `debug_async_issue` - Debug asynchronous and timing-related issues
- `fix_memory_leak` - Identify and fix memory leaks
- `debug_production_issue` - Debug issues that only occur in production
- `fix_performance_issue` - Diagnose and fix performance bottlenecks

### Refactoring Prompts
- `refactor_code` - Refactor code for better maintainability
- `extract_common_code` - Extract duplicated code into reusable modules
- `simplify_complex_function` - Break down complex functions into simpler pieces
- `modernize_legacy_code` - Update legacy code to use modern patterns
- `improve_architecture` - Restructure code for better architecture

## Usage

These prompts are automatically available through the MCP server's prompt listing. Clients can:

1. List all available prompts
2. Get a specific prompt with arguments
3. Use the prompt templates for AI-assisted coding tasks

## Example

To use a prompt, provide the required arguments:

```json
{
  "method": "prompts/get",
  "params": {
    "name": "create_unit_tests",
    "arguments": {
      "file_path": "/src/utils/calculator.js",
      "test_framework": "jest",
      "coverage_target": "90"
    }
  }
}
```

The server will return the formatted prompt with placeholders replaced by the provided arguments.