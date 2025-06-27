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
        text: `# React Component Creation Task

## Component Requirements
- **Name**: {{component_name}}
- **Purpose**: {{description}}
- **Type**: {{component_type}}
- **Styling**: {{styling_approach}}
- **Tests**: {{include_tests}}

## Instructions

Create a production-ready React component following these specifications:

### 1. Component Architecture
**File Structure**:
- Create the component file with proper naming (PascalCase)
- Organize imports logically (React first, then external, then internal)
- Place component in appropriate directory structure
- Create separate files for types, constants, and utilities if needed

**Type Safety**:
- Define comprehensive TypeScript interfaces for all props
- Use proper type annotations for state and refs
- Export prop types for reusability
- Add JSDoc comments for complex props

**Component Design**:
- Use functional components with hooks (unless class component specified)
- Implement proper component composition
- Follow single responsibility principle
- Make the component reusable and configurable

### 2. Core Implementation
**State Management**:
- Use appropriate React hooks (useState, useReducer, useContext)
- Keep state minimal and derived values computed
- Lift state only when necessary
- Implement controlled/uncontrolled patterns appropriately

**Props Design**:
- Provide sensible defaults using defaultProps or default parameters
- Use prop spreading judiciously
- Implement proper prop validation
- Design for flexibility and extensibility

**Event Handling**:
- Use proper event handler naming (onClick, onChange, etc.)
- Implement event delegation where appropriate
- Prevent default behaviors when needed
- Add proper error boundaries for error handling

### 3. Performance Optimization
- Use React.memo for expensive pure components
- Implement useMemo for expensive computations
- Use useCallback for stable function references
- Avoid inline function definitions in render
- Implement lazy loading if component is heavy
- Use React.Suspense for async components

### 4. Styling Implementation
**Based on the specified approach**:
- CSS Modules: Create .module.css file with scoped styles
- Styled Components: Define styled components with proper theming
- Tailwind: Use utility classes with proper organization
- Inline styles: Use style objects with proper typing
- Ensure responsive design for all screen sizes
- Implement dark mode support if applicable

### 5. Accessibility (a11y)
- Add proper ARIA labels and roles
- Ensure keyboard navigation works correctly
- Implement focus management
- Add screen reader support
- Use semantic HTML elements
- Ensure proper color contrast
- Test with accessibility tools

### 6. Error Handling
- Implement error boundaries if needed
- Add proper loading states
- Handle edge cases gracefully
- Provide user-friendly error messages
- Add fallback UI for error states
- Log errors appropriately

### 7. Testing Requirements
If tests are requested:
- Create comprehensive unit tests using Jest and React Testing Library
- Test all props and their combinations
- Test user interactions and events
- Test edge cases and error states
- Test accessibility features
- Achieve high code coverage
- Add snapshot tests for UI consistency

### 8. Documentation
- Add comprehensive JSDoc comments
- Create usage examples
- Document all props with descriptions
- Add inline comments for complex logic
- Create a README if component is complex
- Include Storybook stories if applicable

### 9. Best Practices
- Follow React naming conventions
- Use proper file organization
- Implement proper separation of concerns
- Avoid anti-patterns (direct state mutation, etc.)
- Use React DevTools friendly names
- Consider bundle size impact
- Follow team coding standards

### Output Requirements
- Complete component implementation
- Proper TypeScript/PropTypes definitions
- Styling files based on chosen approach
- Test files if requested
- Usage examples in comments
- Any necessary utility functions or constants`,
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
        text: `# React Component Update Task

## Update Requirements
- **Component Path**: {{component_path}}
- **Changes Needed**: {{changes_description}}
- **Preserve Behavior**: {{preserve_behavior}}
- **Update Tests**: {{update_tests}}

## Instructions

Update the existing React component with care and precision:

### 1. Component Analysis
**Current State Review**:
- Read and understand the entire component implementation
- Map out current props interface and their usage
- Document existing state management approach
- Identify all component dependencies
- Note integration points with other components
- Review existing tests and coverage

**Impact Assessment**:
- Identify potential breaking changes
- List components that import this one
- Check for prop drilling implications
- Assess performance implications
- Review bundle size impact

### 2. Change Planning
**Backward Compatibility** (if required):
- Maintain existing prop signatures
- Use deprecated warnings for removed features
- Provide migration path for breaking changes
- Support both old and new patterns temporarily
- Document migration strategy

**Implementation Strategy**:
- Break changes into incremental steps
- Preserve existing functionality during updates
- Add feature flags for gradual rollout
- Plan for rollback scenarios

### 3. Implementation Guidelines
**Code Modifications**:
- Add new props with proper TypeScript types
- Implement new features without disrupting existing ones
- Refactor internal logic for clarity
- Optimize performance where possible
- Update error handling as needed

**State Management Updates**:
- Migrate to newer React patterns if beneficial
- Consolidate redundant state
- Implement proper side effect handling
- Update context usage if applicable

**Style Updates**:
- Maintain consistent styling approach
- Add new styles without breaking existing ones
- Ensure responsive design continuity
- Update theme integration if needed

### 4. Quality Assurance
**Testing Strategy**:
- Run all existing tests first
- Update tests for modified behavior
- Add tests for new functionality
- Test backward compatibility thoroughly
- Check edge cases and error scenarios
- Verify accessibility compliance

**Performance Validation**:
- Profile before and after changes
- Check for unnecessary re-renders
- Validate bundle size impact
- Test with production data volumes
- Ensure smooth user experience

### 5. Documentation Updates
**Code Documentation**:
- Update JSDoc comments
- Document new props and methods
- Add migration notes if breaking changes
- Update usage examples
- Note deprecated features

**External Documentation**:
- Update README if exists
- Modify Storybook stories
- Update API documentation
- Add changelog entries

### 6. Refactoring Opportunities
While updating, improve:
- Remove dead code
- Consolidate duplicate logic
- Improve naming consistency
- Optimize import statements
- Update to latest React patterns
- Fix existing ESLint warnings
- Improve TypeScript strictness

### 7. Migration Considerations
**For Breaking Changes**:
- Create codemod scripts if applicable
- Provide clear migration guide
- Use console warnings in development
- Plan deprecation timeline
- Communicate changes to team

### 8. Review Checklist
Before completing:
- All existing tests pass
- New functionality works as expected
- No performance regressions
- TypeScript compilation succeeds
- ESLint rules satisfied
- Documentation updated
- Backward compatibility maintained (if required)
- Bundle size acceptable

### Output Requirements
- Updated component with all changes
- Modified test files if requested
- Updated type definitions
- Migration guide for breaking changes
- Performance impact summary
- List of any technical debt addressed`,
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
        text: `# Class to Hooks Conversion Task

## Conversion Requirements
- **Component Path**: {{component_path}}
- **Preserve Refs**: {{preserve_refs}}
- **Optimize Renders**: {{optimize_renders}}

## Instructions

Convert the class component to a modern functional component with hooks:

### 1. Pre-Conversion Analysis
**Component Assessment**:
- Identify all state variables and their types
- List all lifecycle methods used
- Document all class methods and their purposes
- Note any refs, context usage, or HOCs
- Identify error boundaries if present
- Check for static methods and properties

### 2. State Migration Strategy
**State Conversion Rules**:
- Each state property becomes a separate useState hook
- Group related state that updates together
- Use useReducer for complex state logic with multiple sub-values
- Preserve initial state logic and lazy initialization

**Implementation**:
\`\`\`javascript
// Class component state
this.state = {
  count: 0,
  user: null,
  loading: false
}

// Converts to:
const [count, setCount] = useState(0);
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(false);
\`\`\`

### 3. Lifecycle Method Conversion
**Conversion Mappings**:

**constructor** → Function body + useState initialization

**componentDidMount** → 
\`\`\`javascript
useEffect(() => {
  // Mount logic here
}, []); // Empty dependency array
\`\`\`

**componentDidUpdate** →
\`\`\`javascript
useEffect(() => {
  // Update logic here
}, [dependencies]); // Specific dependencies
\`\`\`

**componentWillUnmount** →
\`\`\`javascript
useEffect(() => {
  return () => {
    // Cleanup logic here
  };
}, []);
\`\`\`

**shouldComponentUpdate** → React.memo with custom comparison

**componentDidCatch** → Error boundary (keep as class or use react-error-boundary)

### 4. Method Conversion
**Instance Methods**:
- Convert to const arrow functions or function declarations
- Remove 'this' references
- Use useCallback for functions passed as props
- Ensure proper closure over state values

**Event Handlers**:
\`\`\`javascript
// Class method
handleClick = () => {
  this.setState({ count: this.state.count + 1 });
}

// Converts to:
const handleClick = useCallback(() => {
  setCount(prevCount => prevCount + 1);
}, []);
\`\`\`

### 5. Ref Handling
If preserve_refs is true:
\`\`\`javascript
// Class ref
this.myRef = React.createRef();

// Converts to:
const myRef = useRef(null);
\`\`\`

**ForwardRef Pattern**:
- Wrap component in React.forwardRef if it receives ref prop
- Use useImperativeHandle for imperative API

### 6. Context and HOCs
**Context Usage**:
\`\`\`javascript
// Class context
static contextType = MyContext;
const value = this.context;

// Converts to:
const value = useContext(MyContext);
\`\`\`

**HOC Replacement**:
- Consider replacing HOCs with custom hooks
- Keep HOCs if they're third-party or widely used

### 7. Performance Optimization
If optimize_renders is true:

**Memoization**:
- Wrap component in React.memo
- Add custom comparison function if needed
- Use useMemo for expensive computations
- Use useCallback for stable function references

**Example**:
\`\`\`javascript
const MyComponent = React.memo(({ prop1, prop2 }) => {
  const expensiveValue = useMemo(() => {
    return computeExpensiveValue(prop1);
  }, [prop1]);
  
  const handleClick = useCallback(() => {
    doSomething(prop2);
  }, [prop2]);
  
  return <div>{/* ... */}</div>;
});
\`\`\`

### 8. TypeScript Considerations
**Type Updates**:
- Convert React.Component<Props, State> to React.FC<Props>
- Define separate interfaces for props
- Use proper hook types
- Update ref types

### 9. Testing Updates
- Update test setup for hooks
- Use @testing-library/react-hooks if needed
- Modify enzyme tests to RTL if applicable
- Ensure all tests still pass

### 10. Common Pitfalls to Avoid
- Don't call hooks conditionally
- Ensure dependency arrays are complete
- Avoid stale closures
- Don't forget cleanup functions
- Preserve component display name

### Output Requirements
- Fully converted functional component
- All functionality preserved
- Proper hook usage and dependencies
- Performance optimizations if requested
- Updated TypeScript types
- Comments explaining significant changes`,
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
        text: `# Custom Hook Creation Task

## Hook Requirements
- **Hook Name**: {{hook_name}}
- **Logic Purpose**: {{logic_description}}
- **Source Component**: {{source_component}}
- **Return Type**: {{return_type}}

## Instructions

Create a reusable custom hook following React best practices:

### 1. Hook Design Principles
**Naming Convention**:
- Must start with "use" (e.g., useCounter, useLocalStorage)
- Use descriptive, action-oriented names
- Follow camelCase convention

**Single Responsibility**:
- Focus on one specific piece of functionality
- Keep the hook focused and composable
- Avoid trying to do too much in one hook

### 2. Hook Structure Template
\`\`\`typescript
import { useState, useEffect, useCallback, useMemo } from 'react';

// TypeScript interfaces
interface {{HookName}}Options {
  // Configuration options
}

interface {{HookName}}Return {
  // Return value structure
}

// Hook implementation
export function {{hook_name}}<T = any>(options?: {{HookName}}Options): {{HookName}}Return {
  // Implementation
}
\`\`\`

### 3. State Management
**Internal State**:
- Use useState for simple state
- Use useReducer for complex state logic
- Initialize state lazily when expensive

**State Updates**:
- Provide setter functions or actions
- Use functional updates to avoid stale closures
- Batch related state updates

### 4. Side Effects Handling
**Effect Management**:
- Use useEffect for side effects
- Always specify dependencies correctly
- Include cleanup functions
- Handle race conditions

**Example Pattern**:
\`\`\`javascript
useEffect(() => {
  let cancelled = false;
  
  async function doWork() {
    const result = await fetchData();
    if (!cancelled) {
      setState(result);
    }
  }
  
  doWork();
  
  return () => {
    cancelled = true;
  };
}, [dependency]);
\`\`\`

### 5. Return Value Design
**Common Patterns**:

**State + Setters**:
\`\`\`javascript
return {
  value,
  setValue,
  reset,
  increment
};
\`\`\`

**Array Pattern** (like useState):
\`\`\`javascript
return [value, setValue];
\`\`\`

**Complex Object**:
\`\`\`javascript
return {
  state: { data, loading, error },
  actions: { fetch, update, delete },
  helpers: { isValid, isEmpty }
};
\`\`\`

### 6. Parameter Design
**Options Object**:
- Use options object for multiple parameters
- Provide sensible defaults
- Allow for future extensibility
- Document all options

**Dependencies**:
- Accept callbacks and values as parameters
- Properly include in effect dependencies
- Use useCallback for stable references

### 7. Performance Optimization
**Memoization**:
- Use useMemo for expensive computations
- Use useCallback for function stability
- Only optimize when necessary
- Profile before optimizing

**Subscription Pattern**:
\`\`\`javascript
const subscribe = useCallback((callback) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}, []);
\`\`\`

### 8. Error Handling
**Robust Error Management**:
- Catch and handle errors gracefully
- Provide error state in return value
- Use error boundaries if needed
- Log errors appropriately

**Example**:
\`\`\`javascript
const [state, setState] = useState({ 
  data: null, 
  error: null, 
  loading: false 
});

try {
  // Operation
} catch (error) {
  setState(prev => ({ ...prev, error, loading: false }));
}
\`\`\`

### 9. TypeScript Implementation
**Generic Types**:
- Use generics for flexibility
- Provide good type inference
- Export types for consumers
- Add JSDoc comments

**Example**:
\`\`\`typescript
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true
): {
  execute: () => Promise<void>;
  status: 'idle' | 'pending' | 'success' | 'error';
  value: T | null;
  error: Error | null;
}
\`\`\`

### 10. Testing Approach
**Test Structure**:
\`\`\`javascript
import { renderHook, act } from '@testing-library/react-hooks';

describe('{{hook_name}}', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => {{hook_name}}());
    expect(result.current.value).toBe(defaultValue);
  });
  
  it('should update value when action is called', () => {
    const { result } = renderHook(() => {{hook_name}}());
    act(() => {
      result.current.setValue(newValue);
    });
    expect(result.current.value).toBe(newValue);
  });
});
\`\`\`

### 11. Documentation
**JSDoc Example**:
\`\`\`javascript
/**
 * Custom hook for {{logic_description}}
 * @param {Object} options - Configuration options
 * @param {number} options.initialValue - Starting value
 * @param {Function} options.onChange - Change handler
 * @returns {Object} Hook state and methods
 * @example
 * const { value, setValue } = {{hook_name}}({ initialValue: 0 });
 */
\`\`\`

### 12. Common Use Cases
Based on the logic description, implement patterns for:
- Data fetching with loading states
- Local storage synchronization  
- Form state management
- WebSocket connections
- Animation/transition states
- Keyboard shortcuts
- Media queries
- Timer/interval management

### Output Requirements
- Complete hook implementation
- TypeScript definitions
- Comprehensive JSDoc
- Usage examples
- Unit tests
- Integration guide`,
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
        text: `# React Performance Optimization Task

## Optimization Requirements
- **Component Path**: {{component_path}}
- **Performance Issues**: {{performance_issues}}
- **Target Metrics**: {{metrics_target}}

## Instructions

Optimize the React component for maximum performance:

### 1. Performance Analysis
**Profiling Steps**:
- Use React DevTools Profiler to identify slow components
- Measure render times and frequencies
- Check component tree for unnecessary renders
- Identify expensive computations
- Look for memory leaks
- Analyze bundle size contribution

**Key Metrics**:
- Render count and duration
- Component mount/unmount frequency
- Memory allocation patterns
- JavaScript execution time
- Time to Interactive (TTI)

### 2. Re-render Optimization
**React.memo Implementation**:
\`\`\`javascript
// Shallow comparison (default)
export default React.memo(MyComponent);

// Custom comparison
export default React.memo(MyComponent, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render)
  return prevProps.id === nextProps.id && 
         prevProps.data === nextProps.data;
});
\`\`\`

**PureComponent Patterns**:
- Identify components that only need shallow prop comparison
- Convert to React.memo or PureComponent
- Ensure props are immutable

### 3. Hook Optimization
**useMemo for Expensive Computations**:
\`\`\`javascript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(props.data);
}, [props.data]); // Only recompute when data changes
\`\`\`

**useCallback for Stable References**:
\`\`\`javascript
const handleClick = useCallback((id) => {
  doSomething(id);
}, []); // Stable reference if no dependencies

// With dependencies
const handleUpdate = useCallback((value) => {
  updateItem(itemId, value);
}, [itemId]); // Recreate only when itemId changes
\`\`\`

### 4. State Management Optimization
**State Splitting**:
\`\`\`javascript
// Instead of one large state object
const [state, setState] = useState({
  user: null,
  posts: [],
  comments: [],
  ui: { loading: false, error: null }
});

// Split into logical pieces
const [user, setUser] = useState(null);
const [posts, setPosts] = useState([]);
const [comments, setComments] = useState([]);
const [ui, setUI] = useState({ loading: false, error: null });
\`\`\`

**Context Optimization**:
- Split contexts by update frequency
- Use multiple contexts instead of one large one
- Implement context selectors pattern

### 5. List Virtualization
**For Long Lists**:
\`\`\`javascript
import { FixedSizeList } from 'react-window';

const VirtualList = ({ items }) => (
  <FixedSizeList
    height={600}
    itemCount={items.length}
    itemSize={50}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        {items[index].name}
      </div>
    )}
  </FixedSizeList>
);
\`\`\`

### 6. Code Splitting
**Component Lazy Loading**:
\`\`\`javascript
// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Use with Suspense
<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
\`\`\`

**Route-Based Splitting**:
\`\`\`javascript
const routes = [
  {
    path: '/dashboard',
    component: lazy(() => import('./pages/Dashboard'))
  },
  {
    path: '/profile',
    component: lazy(() => import('./pages/Profile'))
  }
];
\`\`\`

### 7. Event Handler Optimization
**Debouncing**:
\`\`\`javascript
const debouncedSearch = useMemo(
  () => debounce((value) => {
    performSearch(value);
  }, 300),
  []
);
\`\`\`

**Throttling**:
\`\`\`javascript
const throttledScroll = useMemo(
  () => throttle(() => {
    handleScroll();
  }, 100),
  []
);
\`\`\`

### 8. DOM Optimization
**Batch DOM Updates**:
- Use React.Fragment to avoid extra DOM nodes
- Minimize style recalculations
- Use CSS transforms for animations
- Avoid inline styles in hot paths

**Keys in Lists**:
- Use stable, unique keys
- Avoid using index as key for dynamic lists
- Generate keys outside render method

### 9. Image and Asset Optimization
**Lazy Loading Images**:
\`\`\`javascript
const LazyImage = ({ src, alt }) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const imgRef = useRef();
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setImageSrc(src);
          observer.disconnect();
        }
      }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [src]);
  
  return <img ref={imgRef} src={imageSrc} alt={alt} />;
};
\`\`\`

### 10. Production Build Optimization
**Webpack Configuration**:
- Enable tree shaking
- Use production mode
- Optimize chunk splitting
- Enable compression
- Remove source maps

### 11. Monitoring and Maintenance
**Performance Budget**:
- Set limits for bundle size
- Monitor render times
- Track memory usage
- Automate performance testing

**Tools**:
- React DevTools Profiler
- Chrome DevTools Performance
- Lighthouse CI
- Bundle analyzers

### Output Requirements
- Optimized component code
- Performance comparison (before/after)
- List of optimizations applied
- Recommendations for further improvements
- Updated tests if needed
- Documentation of changes`,
      },
    },
  ],
};