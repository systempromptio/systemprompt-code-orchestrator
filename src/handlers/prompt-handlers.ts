/**
 * @file MCP Prompt request handlers
 * @module handlers/prompt-handlers
 */

import type {
  ListPromptsResult,
  GetPromptRequest,
  GetPromptResult,
  PromptMessage,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { CODING_PROMPTS } from './prompts/index.js';

/**
 * Handles MCP prompt listing requests.
 * 
 * @returns Promise resolving to the list of available prompts
 */
export async function handleListPrompts(): Promise<ListPromptsResult> {
  return { prompts: CODING_PROMPTS };
}

/**
 * Handles MCP prompt retrieval requests.
 * 
 * @param request - The prompt retrieval request with name and arguments
 * @returns Promise resolving to the prompt with variables replaced
 * @throws Error if the requested prompt is not found
 */
export async function handleGetPrompt(
  request: GetPromptRequest,
): Promise<GetPromptResult> {
  const prompt = CODING_PROMPTS.find(p => p.name === request.params.name);
  if (!prompt) {
    throw new Error(`Prompt not found: ${request.params.name}`);
  }

  // Type guard for text content
  function isTextContent(content: PromptMessage['content']): content is TextContent {
    return content.type === 'text';
  }

  // Process messages and replace template variables
  const messages = (prompt as any).messages.map((message: PromptMessage) => {
    if (!isTextContent(message.content)) {
      return message;
    }

    let text = String(message.content.text);

    // Replace template variables with provided arguments
    if (request.params.arguments) {
      Object.entries(request.params.arguments).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        text = text.replace(new RegExp(placeholder, 'g'), String(value));
      });
    }
    
    return {
      role: message.role,
      content: {
        type: 'text' as const,
        text: text,
      },
    };
  });

  return {
    description: prompt.description,
    messages: messages,
  };
}
