/**
 * @file Sampling example tool definition
 * @module constants/tool/sampling-example
 */

/**
 * Tool definition for demonstrating MCP sampling pattern
 * 
 * @remarks
 * This tool shows how servers can make nested LLM calls
 * to enable agentic behaviors during tool execution.
 */
export const SAMPLING_EXAMPLE_TOOL = {
  name: 'sampling_example',
  description: 'Demonstrates the MCP sampling pattern for AI-assisted operations. Shows how to create sampling requests for summarization, content generation, analysis, and translation tasks.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskType: {
        type: 'string',
        enum: ['summarize', 'generate', 'analyze', 'translate'],
        description: 'The type of sampling task to demonstrate'
      },
      content: {
        type: 'string',
        description: 'Input content for the sampling task'
      },
      targetLanguage: {
        type: 'string',
        description: 'Target language for translation tasks (optional)',
        default: 'Spanish'
      },
      style: {
        type: 'string',
        enum: ['formal', 'casual', 'technical', 'creative'],
        description: 'Style preferences for generation tasks (optional)',
        default: 'formal'
      }
    },
    required: ['taskType', 'content']
  }
};