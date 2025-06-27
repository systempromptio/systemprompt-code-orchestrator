import type { CreateMessageResult, TextContent } from '@modelcontextprotocol/sdk/types.js';

import { formatToolResponse } from '../tools/types.js';


// Interface for suggested action response
export interface GeneratedSuggestAction {
  action: string;
  reasoning: string;
  content?: string;
  id?: string;
  [key: string]: any;
}


function isTextContent(content: unknown): content is TextContent {
  return (
    typeof content === "object" &&
    content !== null &&
    'type' in content &&
    (content as any).type === "text" &&
    'text' in content &&
    typeof (content as any).text === "string"
  );
}

export async function handleSuggestActionCallback(result: CreateMessageResult, _sessionId: string): Promise<string> {
  try {
    if (!isTextContent(result.content)) {
      throw new Error("Invalid content format received from LLM");
    }

    const actionData = JSON.parse(result.content.text) as GeneratedSuggestAction;

    if (!actionData.action || !actionData.reasoning) {
      throw new Error("Invalid action data: missing required fields (action or reasoning)");
    }

    const message = `Action suggestion generated: ${actionData.action}`;


    return JSON.stringify(
      formatToolResponse({
        message: message,
        result: actionData,
      }),
    );
  } catch (error) {
    throw error;
  }
}
