/**
 * @file MCP Prompt request handlers
 * @module handlers/prompt-handlers
 */

import type {
  ListPromptsResult,
  GetPromptRequest,
  GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Handles MCP prompt listing requests.
 * 
 * @returns Promise resolving to the list of available prompts
 */
export async function handleListPrompts(): Promise<ListPromptsResult> {
  return { prompts: [] };
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
  // All sampling prompts have been removed
  throw new Error(`Prompt not found: ${request.params.name}`);
}
