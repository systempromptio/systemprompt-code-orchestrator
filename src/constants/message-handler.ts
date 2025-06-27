/**
 * @file Constants for message handling and validation
 * @module constants/message-handler
 * 
 * @remarks
 * This module contains constants used for validating and handling
 * messages in the MCP protocol, particularly for sampling requests.
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#messages | MCP Sampling Messages}
 */

/**
 * Comprehensive error messages for message validation and handling.
 * 
 * @remarks
 * These messages provide clear, specific error feedback for various
 * validation failures in MCP message handling. They are organized
 * by category for easy maintenance and consistent error reporting.
 */
export const ERROR_MESSAGES = {
  INVALID_REQUEST: {
    MISSING_MESSAGES: "Invalid request: missing messages",
    MISSING_PARAMS: "Request must have params",
    EMPTY_MESSAGES: "Request must have at least one message",
  },
  VALIDATION: {
    INVALID_ROLE: 'Message role must be either "user" or "assistant"',
    MISSING_CONTENT: "Message must have a content object",
    INVALID_CONTENT_TYPE: 'Content type must be either "text" or "image"',
    INVALID_TEXT_CONTENT: "Text content must have a string text field",
    INVALID_IMAGE_DATA: "Image content must have a base64 data field",
    INVALID_IMAGE_MIME: "Image content must have a mimeType field",
    INVALID_MAX_TOKENS: "maxTokens must be a positive number",
    INVALID_TEMPERATURE: "temperature must be a number between 0 and 1",
    INVALID_INCLUDE_CONTEXT: 'includeContext must be "none", "thisServer", or "allServers"',
    INVALID_MODEL_PRIORITY: "Model preference priorities must be numbers between 0 and 1",
  },
  SAMPLING: {
    EXPECTED_TEXT: "Expected text response from LLM",
    UNKNOWN_CALLBACK: "Unknown callback type: ",
    REQUEST_FAILED: "Sampling request failed: ",
  },
} as const;

/**
 * Valid message roles in MCP sampling.
 * 
 * @remarks
 * Messages can have either "user" or "assistant" roles, following
 * the conversation pattern used in LLM interactions.
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#prompt-messages | Prompt Messages}
 */
export const VALID_ROLES = ["user", "assistant"] as const;

/**
 * Valid content types for MCP messages.
 * 
 * @remarks
 * - "text": Plain text content
 * - "image": Base64-encoded image data
 * - "resource": Reference to an MCP resource
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#content-types | Content Types}
 */
export const VALID_CONTENT_TYPES = ["text", "image", "resource"] as const;

/**
 * Valid options for including context in sampling requests.
 * 
 * @remarks
 * - "none": No additional context included
 * - "thisServer": Include context from this MCP server only
 * - "allServers": Include context from all connected MCP servers
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#context | Sampling Context}
 */
export const VALID_INCLUDE_CONTEXT = ["none", "thisServer", "allServers"] as const;

/**
 * XML tag templates for formatting sampling requests.
 * 
 * @remarks
 * These templates are used to structure the context information
 * that may be included with sampling requests when includeContext
 * is set to "thisServer" or "allServers".
 */
export const XML_TAGS = {
  /** Closing tag for request parameters section */
  REQUEST_PARAMS_CLOSE: "</requestParams>",
  /** Template for including existing content in the request */
  EXISTING_CONTENT_TEMPLATE: (content: string) => `</requestParams>
  <existingContent>
    ${content}
  </existingContent>`,
} as const;
