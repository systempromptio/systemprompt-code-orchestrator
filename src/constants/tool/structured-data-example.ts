/**
 * @file Structured data example tool definition
 * @module constants/tool/structured-data-example
 */

// We'll define the output schema inline for now to avoid circular dependencies

/**
 * Tool definition for demonstrating structured data returns
 * 
 * @remarks
 * This tool shows how to return both human-readable text
 * and machine-readable structured data that conforms to
 * defined schemas.
 */
export const STRUCTURED_DATA_EXAMPLE_TOOL = {
  name: 'structured_data_example',
  description: 'Demonstrates returning structured data alongside text content. Shows examples with user profiles, analytics, weather data, and product information with proper schema validation.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      dataType: {
        type: 'string',
        enum: ['user', 'analytics', 'weather', 'product'],
        description: 'The type of structured data to return'
      },
      id: {
        type: 'string',
        description: 'Optional ID to fetch specific data'
      },
      includeNested: {
        type: 'boolean',
        description: 'Whether to include nested data structures',
        default: false
      },
      simulateError: {
        type: 'boolean',
        description: 'Whether to simulate validation errors for testing',
        default: false
      }
    },
    required: ['dataType']
  },
  // Output schema showing the structure of returned data
  outputSchema: {
    type: 'object' as const,
    description: 'The structured data output varies based on the dataType parameter',
    properties: {
      // The actual properties depend on dataType
      id: { type: 'string', description: 'Unique identifier' },
      // Additional properties vary by type
    }
  }
};