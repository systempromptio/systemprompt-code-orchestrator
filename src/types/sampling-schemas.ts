/**
 * @file JSON Schema definitions for Reddit MCP sampling responses
 * @module types/sampling-schemas
 * 
 * @remarks
 * This module defines JSON Schema structures used for validating LLM responses
 * in the MCP sampling feature. These schemas ensure that AI-generated content
 * matches the expected format for Reddit operations.
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#structured-output | MCP Structured Output}
 * @see {@link https://json-schema.org/ | JSON Schema Specification}
 */

import type { JSONSchema7 } from "json-schema";

/**
 * JSON Schema for validating Reddit post creation responses from LLM sampling.
 * 
 * @remarks
 * This schema ensures that AI-generated posts have all required fields
 * and follow Reddit's posting requirements. The LLM response will be
 * validated against this schema before attempting to create the post.
 * 
 * @example
 * ```json
 * {
 *   "title": "TIL about MCP servers for Reddit",
 *   "content": "I discovered this amazing way to interact with Reddit...",
 *   "subreddit": "todayilearned",
 *   "flair_text": "Technology",
 *   "sendreplies": true
 * }
 * ```
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#structured-output | MCP Structured Output}
 */
export const REDDIT_POST_RESPONSE_SCHEMA: JSONSchema7 = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Post title (1-300 characters)",
      minLength: 1,
      maxLength: 300,
    },
    content: {
      type: "string",
      description: "Text content for the post",
    },
    subreddit: {
      type: "string",
      description: "Subreddit to post to (without r/ prefix)",
    },
    flair_id: {
      type: "string",
      description: "Flair ID if the subreddit requires it",
    },
    flair_text: {
      type: "string",
      description: "Flair text if the subreddit requires it",
    },
    sendreplies: {
      type: "boolean",
      description: "Whether to send replies to inbox",
      default: true,
    },
    nsfw: {
      type: "boolean",
      description: "Whether to mark as NSFW",
      default: false,
    },
    spoiler: {
      type: "boolean",
      description: "Whether to mark as spoiler",
      default: false,
    },
  },
  required: ["title", "content", "subreddit"],
};

/**
 * JSON Schema for validating Reddit comment creation responses from LLM sampling.
 * 
 * @remarks
 * This schema ensures that AI-generated comments have all required fields
 * for replying to posts or other comments on Reddit.
 * 
 * @example
 * ```json
 * {
 *   "content": "Great point! I'd like to add that TypeScript also provides...",
 *   "id": "t3_abc123",
 *   "subreddit": "typescript"
 * }
 * ```
 */
export const REDDIT_COMMENT_RESPONSE_SCHEMA: JSONSchema7 = {
  type: "object",
  properties: {
    content: {
      type: "string",
      description: "Generated content for the reply",
    },
    id: {
      type: "string",
      description: "ID of parent post/comment being replied to",
    },
    subreddit: {
      type: "string",
      description: "Subreddit where the comment will be posted",
    },
  },
  required: ["content", "id", "subreddit"],
};

/**
 * JSON Schema for validating Reddit private message responses from LLM sampling.
 * 
 * @remarks
 * This schema ensures that AI-generated messages follow Reddit's private
 * message format requirements with proper validation.
 * 
 * @example
 * ```json
 * {
 *   "recipient": "reddit_user",
 *   "subject": "Re: Your TypeScript question",
 *   "content": "Thanks for reaching out! Here's the answer to your question..."
 * }
 * ```
 */
export const REDDIT_MESSAGE_RESPONSE_SCHEMA: JSONSchema7 = {
  type: "object",
  properties: {
    recipient: {
      type: "string",
      description: "Username of the message recipient",
    },
    subject: {
      type: "string",
      description: "Subject line of the message (1-100 chars)",
      minLength: 1,
      maxLength: 100,
    },
    content: {
      type: "string",
      description: "Message content in markdown format (max 10000 chars)",
      maxLength: 10000,
    },
  },
  required: ["recipient", "subject", "content"],
};

/**
 * JSON Schema for validating Reddit action suggestion responses from LLM sampling.
 * 
 * @remarks
 * This schema is used when the AI analyzes Reddit content and suggests
 * appropriate actions to take, providing both the action and reasoning.
 * 
 * @example
 * ```json
 * {
 *   "action": "reply",
 *   "subreddit": "typescript",
 *   "reasoning": "This post asks a question about TypeScript generics that I can answer helpfully",
 *   "content": "Here's how you can use conditional types with generics...",
 *   "id": "t3_xyz789"
 * }
 * ```
 */
export const REDDIT_SUGGEST_ACTION_RESPONSE_SCHEMA: JSONSchema7 = {
  type: "object",
  properties: {
    action: {
      type: "string",
      description: "Suggested action to take (e.g., 'create_post', 'reply', 'wait')",
    },
    subreddit: {
      type: "string",
      description: "Suggested subreddit for the action",
    },
    reasoning: {
      type: "string",
      description: "Explanation for why this action is suggested",
    },
    content: {
      type: "string",
      description: "Suggested content or topic for the action",
    },
    id: {
      type: "string",
      description: "ID of parent post/comment to reply to (if action is 'reply')",
    },
  },
  required: ["action", "reasoning"],
};


