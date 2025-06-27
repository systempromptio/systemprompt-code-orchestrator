/**
 * @file Elicitation example tool definition
 * @module constants/tool/elicitation-example
 */

/**
 * Tool definition for demonstrating MCP elicitation pattern
 * 
 * @remarks
 * This tool shows how servers can request additional information
 * from users through the client during interactions.
 */
export const ELICITATION_EXAMPLE_TOOL = {
  name: 'elicitation_example',
  description: 'Demonstrates the MCP elicitation pattern for requesting user input during tool execution. Shows how to create elicitation requests with schemas for user profiles, preferences, and credentials.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      elicitationType: {
        type: 'string',
        enum: ['user_profile', 'preferences', 'credentials'],
        description: 'The type of information to elicit from the user'
      },
      customMessage: {
        type: 'string',
        description: 'Optional custom message to display to the user when requesting information'
      }
    },
    required: ['elicitationType']
  }
};