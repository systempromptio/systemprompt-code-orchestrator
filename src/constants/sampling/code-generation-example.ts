/**
 * @file Example sampling prompt for code generation with resource injection
 * @module constants/sampling/code-generation-example
 * 
 * @remarks
 * This module defines an example MCP sampling prompt that demonstrates
 * how resources can be injected into prompts for enhanced code generation.
 */

import type { SamplingPrompt } from '../../types/sampling.js';

/**
 * Example prompt for code generation that uses injected resources.
 * 
 * @remarks
 * This prompt demonstrates how the {{resource_*}} placeholders can be used
 * to inject resource content (like guidelines) into the prompt context.
 * The resource injection happens automatically in the prompt handler.
 */
export const CODE_GENERATION_EXAMPLE_PROMPT: SamplingPrompt = {
  name: "code_generation_example",
  description: "Example prompt that demonstrates resource injection for code generation",
  arguments: [
    {
      name: "task",
      description: "The coding task to complete",
      required: true,
    },
    {
      name: "language",
      description: "Programming language to use",
      required: false,
    },
  ],
  messages: [
    {
      role: "assistant",
      content: {
        type: "text",
        text: "I am an expert software developer ready to help with code generation tasks. {{resource_code_generation}}",
      },
    },
    {
      role: "user",
      content: {
        type: "text",
        text: `Please help me with the following coding task:

Task: {{task}}
Language: {{language}}

Follow the code generation guidelines and best practices that have been provided.`,
      },
    },
  ],
  _meta: {
    callback: "code_generation_callback",
  },
};