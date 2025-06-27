import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// Context passed to individual tool handlers
export interface ToolHandlerContext {
  userId?: string;
  sessionId?: string;
  progressToken?: string | number;
}

export type ToolHandler<T = any> = (
  args: T,
  context?: ToolHandlerContext,
) => Promise<CallToolResult>;

// Standard response type for all tool handlers
export interface ToolResponse<T = any> {
  status: "success" | "error";
  message: string;
  result?: T;
  error?: {
    type: string;
    details?: any;
  };
}

// Helper function to format tool responses
export function formatToolResponse<T>(
  response: Partial<ToolResponse<T>> & Pick<ToolResponse<T>, "message">,
): CallToolResult {
  const standardResponse: ToolResponse<T> = {
    status: response.status || "success",
    message: response.message,
    ...(response.result && { result: response.result }),
    ...(response.error && { error: response.error }),
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(standardResponse, null, 2),
      },
    ],
  };
}