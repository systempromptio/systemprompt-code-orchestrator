/**
 * @file React component prompts
 * @module handlers/prompts/react-components
 */

import type { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const CREATE_REACT_COMPONENT_PROMPT: Prompt = {
  name: 'create_react_component',
  description: 'Create a new React component with specified functionality',
  arguments: [
    {
      name: 'component_name',
      description: 'Name of the component to create',
      required: true,
    },
    {
      name: 'description',
      description: 'Description of what the component should do',
      required: true,
    },
    {
      name: 'component_type',
      description: 'Type of component (functional, class, hooks-based)',
      required: false,
    },
    {
      name: 'styling_approach',
      description: 'CSS approach (css-modules, styled-components, tailwind, etc)',
      required: false,
    },
    {
      name: 'include_tests',
      description: 'Whether to create tests alongside the component',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Create a React component named {{component_name}} that {{description}}. Type: {{component_type}}, Styling: {{styling_approach}}, Tests: {{include_tests}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll create a React component that meets your requirements. Let me design and implement this component with best practices.

**Component Development Plan:**

1. **Component Structure**
   - Define props interface/types
   - Implement component logic
   - Add proper state management
   - Handle edge cases

2. **Features Implementation**
   - Core functionality
   - Event handlers
   - Data flow
   - Error boundaries if needed

3. **Styling & UX**
   - Responsive design
   - Accessibility (ARIA labels, keyboard navigation)
   - Loading and error states
   - Smooth animations/transitions

4. **Code Quality**
   - PropTypes or TypeScript types
   - JSDoc comments
   - Memoization where appropriate
   - Clean, maintainable code

I'll create a well-structured, reusable component following React best practices.`,
      },
    },
  ],
};

export const UPDATE_REACT_COMPONENT_PROMPT: Prompt = {
  name: 'update_react_component',
  description: 'Update an existing React component with new functionality',
  arguments: [
    {
      name: 'component_path',
      description: 'Path to the component file to update',
      required: true,
    },
    {
      name: 'changes_description',
      description: 'Description of changes to make',
      required: true,
    },
    {
      name: 'preserve_behavior',
      description: 'Whether to maintain backward compatibility',
      required: false,
    },
    {
      name: 'update_tests',
      description: 'Whether to update associated tests',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Update the React component at {{component_path}} to {{changes_description}}. Preserve behavior: {{preserve_behavior}}, Update tests: {{update_tests}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll carefully update your React component while maintaining code quality and functionality.

**Update Strategy:**

1. **Component Analysis**
   - Review current implementation
   - Understand existing props and state
   - Identify integration points
   - Check for breaking changes

2. **Implementation Approach**
   - Add new functionality incrementally
   - Maintain existing API if required
   - Refactor for better performance
   - Update documentation

3. **Quality Assurance**
   - Test all existing functionality
   - Verify new features work correctly
   - Update prop types/interfaces
   - Ensure no regressions

4. **Code Optimization**
   - Remove unnecessary re-renders
   - Optimize hooks usage
   - Improve component composition
   - Clean up any tech debt

I'll make the changes while ensuring the component remains stable and performant.`,
      },
    },
  ],
};

export const CONVERT_TO_HOOKS_PROMPT: Prompt = {
  name: 'convert_to_hooks',
  description: 'Convert a class component to functional component with hooks',
  arguments: [
    {
      name: 'component_path',
      description: 'Path to the class component to convert',
      required: true,
    },
    {
      name: 'preserve_refs',
      description: 'Whether to preserve ref functionality',
      required: false,
    },
    {
      name: 'optimize_renders',
      description: 'Whether to add render optimization (memo, callbacks)',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Convert the class component at {{component_path}} to use React hooks. Preserve refs: {{preserve_refs}}, Optimize: {{optimize_renders}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll convert your class component to a modern functional component with hooks.

**Conversion Process:**

1. **State Migration**
   - Convert state to useState hooks
   - Group related state logically
   - Consider useReducer for complex state

2. **Lifecycle Migration**
   - componentDidMount → useEffect(() => {}, [])
   - componentDidUpdate → useEffect with dependencies
   - componentWillUnmount → cleanup functions
   - shouldComponentUpdate → React.memo

3. **Method Conversion**
   - Convert methods to const functions
   - Use useCallback for stable references
   - Handle 'this' binding properly

4. **Advanced Patterns**
   - Convert refs to useRef
   - Replace HOCs with custom hooks
   - Optimize with useMemo
   - Add proper TypeScript types

I'll ensure the converted component maintains all functionality while leveraging modern React patterns.`,
      },
    },
  ],
};

export const CREATE_CUSTOM_HOOK_PROMPT: Prompt = {
  name: 'create_custom_hook',
  description: 'Extract component logic into a reusable custom hook',
  arguments: [
    {
      name: 'hook_name',
      description: 'Name for the custom hook (should start with "use")',
      required: true,
    },
    {
      name: 'logic_description',
      description: 'Description of the logic to encapsulate',
      required: true,
    },
    {
      name: 'source_component',
      description: 'Component to extract logic from (optional)',
      required: false,
    },
    {
      name: 'return_type',
      description: 'What the hook should return (state, handlers, both)',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Create a custom hook named {{hook_name}} that {{logic_description}}. Extract from: {{source_component}}, Returns: {{return_type}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll create a reusable custom hook that encapsulates your logic effectively.

**Custom Hook Design:**

1. **Hook Structure**
   - Clear input parameters
   - Well-defined return values
   - Proper TypeScript types
   - Error handling

2. **Implementation Features**
   - State management
   - Side effect handling
   - Cleanup functions
   - Memoization where needed

3. **Best Practices**
   - Follow hooks rules
   - Minimize dependencies
   - Provide stable references
   - Document usage examples

4. **Testing Strategy**
   - Unit tests with @testing-library/react-hooks
   - Integration tests
   - Edge case coverage

I'll create a clean, reusable hook that follows React conventions and is easy to integrate.`,
      },
    },
  ],
};

export const OPTIMIZE_REACT_PERFORMANCE_PROMPT: Prompt = {
  name: 'optimize_react_performance',
  description: 'Optimize React component for better performance',
  arguments: [
    {
      name: 'component_path',
      description: 'Path to the component to optimize',
      required: true,
    },
    {
      name: 'performance_issues',
      description: 'Specific performance issues observed',
      required: false,
    },
    {
      name: 'metrics_target',
      description: 'Performance metrics to improve (render time, re-renders, etc)',
      required: false,
    }
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Optimize the React component at {{component_path}} for better performance. Issues: {{performance_issues}}, Target: {{metrics_target}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll analyze and optimize your React component for better performance.

**Optimization Strategy:**

1. **Performance Analysis**
   - Identify unnecessary re-renders
   - Find expensive computations
   - Detect memory leaks
   - Check bundle size impact

2. **Optimization Techniques**
   - Add React.memo for pure components
   - Implement useMemo for expensive calculations
   - Use useCallback for stable function references
   - Lazy load heavy dependencies
   - Virtualize long lists

3. **State Optimization**
   - Split state to minimize updates
   - Lift state only when necessary
   - Use context wisely
   - Consider state management libraries

4. **Code Splitting**
   - Dynamic imports
   - Route-based splitting
   - Component lazy loading
   - Suspense boundaries

I'll apply targeted optimizations to improve your component's performance significantly.`,
      },
    },
  ],
};