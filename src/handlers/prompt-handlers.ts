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
import { PROMPTS } from '../constants/sampling/index.js';
import { handleResourceCall } from './resource-handlers.js';

/**
 * Handles MCP prompt listing requests.
 * 
 * @returns Promise resolving to the list of available prompts
 */
export async function handleListPrompts(): Promise<ListPromptsResult> {
  return { prompts: PROMPTS };
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
  const prompt = PROMPTS.find((p: any) => p.name === request.params.name);
  if (!prompt) {
    throw new Error(`Prompt not found: ${request.params.name}`);
  }

  const resourceData: { [key: string]: string } = {};
  
  const resourceMappings: { [key: string]: string[] } = {
    'reddit_suggest_action': ['guidelines://content-creation', 'guidelines://code-generation'],
  };

  const resourcesToFetch = resourceMappings[request.params.name] || [];
  for (const resourceUri of resourcesToFetch) {
    try {
      const resourceResult = await handleResourceCall(
        { method: "resources/read" as const, params: { uri: resourceUri } }
      );
      if (resourceResult.contents && resourceResult.contents[0]) {
        const resourceKey = resourceUri.split('://')[1].replace('-', '_');
        resourceData[resourceKey] = String(resourceResult.contents[0].text || '');
      }
    } catch (error) {
      // Silent fail - resource injection is optional
    }
  }

  // Type guard for text content
  function isTextContent(content: PromptMessage['content']): content is TextContent {
    return content.type === 'text';
  }

  const messages = await Promise.all(prompt.messages.map(async (message: PromptMessage) => {
    if (!isTextContent(message.content)) {
      return message;
    }

    let text = String(message.content.text);

    Object.entries(resourceData).forEach(([key, content]) => {
      const placeholder = `{{resource_${key}}}`;
      text = text.replace(new RegExp(placeholder, 'g'), content);
    });

    if (message.role === 'assistant' && Object.keys(resourceData).length > 0) {
      const resourceContext = Object.entries(resourceData)
        .map(([key, content]) => `### ${key.replace('_', ' ').toUpperCase()}\n\n${content}`)
        .join('\n\n---\n\n');
      
      text = `I have access to the following guidelines and resources:\n\n${resourceContext}\n\n---\n\n${text}`;
    }

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
  }));

  return {
    description: prompt.description,
    messages: messages,
    _meta: prompt._meta,
  };
}
