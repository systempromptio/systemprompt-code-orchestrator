/**
 * @file MCP Sampling request handler
 * @module handlers/sampling
 * 
 * @remarks
 * This module implements the MCP sampling feature, which allows the server
 * to request LLM completions from the client. This is used to generate
 * Reddit content (posts, comments, messages) with AI assistance.
 * 
 * Complete MCP Sampling Flow (8 steps):
 * @see https://modelcontextprotocol.io/specification/2025-06-18/client/sampling
 * 
 * 1. Server initiates sampling request (sendSamplingRequest)
 * 2. Client presents request to user for approval
 * 3. User reviews and can modify the request
 * 4. Client sends approved request to LLM
 * 5. LLM generates response content
 * 6. Client presents response to user for review
 * 7. User approves or modifies the response
 * 8. Client returns final response to server (handleCallback)
 * 
 * Key features:
 * - Human-in-the-loop approval at every step
 * - Support for model preferences and generation parameters
 * - Callback-based response handling for different content types
 * - Integration with Reddit API for posting generated content
 */

import type { CreateMessageRequest, CreateMessageResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getMCPHandlerInstance } from '../server/mcp.js';
import { logger } from '../utils/logger.js';

import {
  handleSuggestActionCallback,
} from './callbacks.js';
import { sendOperationNotification } from './notifications.js';

/**
 * Context information for sampling requests.
 * 
 * @remarks
 * Contains session-specific information needed to route
 * sampling requests to the correct MCP server instance.
 */
interface SamplingContext {
  /** Unique session identifier for the current connection */
  sessionId: string;
}

/**
 * Sends a sampling request to the MCP client for content generation.
 * 
 * @remarks
 * MCP Sampling Step 1: Server Initiates Sampling Request
 * @see https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#request-format
 * 
 * This function is the entry point for all sampling operations. It:
 * 1. Validates the request has a valid session
 * 2. Finds the server instance for the session
 * 3. Sends the sampling request to the client (Step 1)
 * 4. Waits for human-in-the-loop approval (Steps 2-7 happen on client)
 * 5. Receives the approved/modified response (Step 8)
 * 6. Dispatches to the appropriate callback based on metadata
 * 
 * The sampling flow:
 * - Step 1: Server sends request (this function)
 * - Step 2: Client presents to user for approval
 * - Step 3: User reviews and modifies request
 * - Step 4: Client sends to LLM
 * - Step 5: LLM generates response  
 * - Step 6: Client presents response for review
 * - Step 7: User approves/modifies response
 * - Step 8: Client returns final response (received here)
 * 
 * @param request - The sampling request with messages and parameters
 * @param context - Context containing the session ID
 * @returns Promise resolving to the generated message result
 * @throws Error if session is not found or sampling fails
 */
export async function sendSamplingRequest(
  request: CreateMessageRequest,
  context: SamplingContext,
): Promise<CreateMessageResult> {
  const startTime = Date.now();

  try {
    // validateRequest(request);

    // Get the session-specific server instance
    const { sessionId } = context;

    if (!sessionId) {
      logger.error('❌ No session ID provided for sampling request');
      throw new Error('Session ID is required for sampling requests');
    }

    const handler = getMCPHandlerInstance();
    if (!handler) {
      logger.error('❌ MCP handler not initialized');
      throw new Error('MCP handler not initialized');
    }

    const activeServer = handler.getServerForSession(sessionId);
    if (!activeServer) {
      logger.error('❌ No server found for session', { sessionId });
      throw new Error(`Session not found: ${sessionId}`);
    }


    /**
     * MCP Sampling Step 1: Construct sampling request
     * @see https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#request-parameters
     * 
     * The request includes:
     * - messages: Conversation context for the LLM
     * - maxTokens: Maximum tokens for response (default 8192)
     * - system: Optional system prompt
     * - temperature/topP/topK: Generation parameters
     * - modelPreferences: Hints for model selection
     * - _meta: Callback information for response handling
     */
    const samplingRequest = {
      messages: request.params.messages,
      maxTokens: request.params.maxTokens || 8192,
      system: request.params.system,
      temperature: request.params.temperature,
      topP: request.params.topP,
      topK: request.params.topK,
      stopSequences: request.params.stopSequences,
      modelPreferences: request.params.modelPreferences,
      _meta: request.params._meta,
    };


    /**
     * MCP Sampling Steps 1-8: Send request and await response
     * @see https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#flow
     * 
     * This call triggers the full sampling flow:
     * 1. Server sends request to client
     * 2-7. Client handles user approval, LLM generation, and review
     * 8. Client returns the final approved response
     * 
     * The response will contain the user-approved content
     * ready for the server to process.
     */
    const result = await activeServer.createMessage(samplingRequest);

    // Schema for validating callback names
    const CallbackSchema = z.enum(['suggest_action']);
    
    const callback = request.params._meta?.callback;
    if (callback) {
      try {
        const validatedCallback = CallbackSchema.parse(callback);
        await handleCallback(validatedCallback, result, sessionId);
      } catch (error) {
        logger.error('Invalid callback type', { 
          callback, 
          error: error instanceof z.ZodError ? error.errors : error 
        });
      }
    }

    return result;
  } catch (error) {
    logger.error('💥 SAMPLING REQUEST FAILED', {
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      requestMethod: request.method,
      hasParams: !!request.params,
    });

    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to process sampling request: ${error || 'Unknown error'}`);
  }
}

/**
 * Dispatches sampling results to the appropriate callback handler.
 * 
 * @remarks
 * MCP Sampling Step 8 (continued): Process the approved response
 * @see https://modelcontextprotocol.io/specification/2025-06-18/client/sampling#handling-responses
 * 
 * After receiving the user-approved content from the client,
 * this function routes the result to the appropriate handler
 * based on the callback type specified in the request metadata.
 * 
 * This represents the server-side handling after the full
 * human-in-the-loop sampling flow is complete.
 * 
 * Supported callbacks:
 * - `create_post_callback`: Posts content to Reddit
 * - `create_comment_callback`: Creates a Reddit comment
 * - `suggest_action`: Analyzes and suggests Reddit actions
 * - `create_message_callback`: Sends a Reddit private message
 * 
 * Each callback handler will:
 * 1. Parse the generated content
 * 2. Perform the Reddit API operation
 * 3. Send a notification with the result
 * 
 * @param callback - The callback type identifier
 * @param result - The user-approved LLM-generated content
 * @param sessionId - The session ID for authentication context
 * @param progressToken - Optional token for progress tracking
 * @returns Promise that resolves when the callback is complete
 * @throws Error if the callback type is unknown
 */
async function handleCallback(
  callback: string,
  result: CreateMessageResult,
  sessionId: string,
  _progressToken?: string | number,
): Promise<void> {

  try {
    await sendOperationNotification(callback, `Callback started: ${callback}`, sessionId);

    switch (callback) {
      case 'suggest_action':
        await handleSuggestActionCallback(result, sessionId);
        break;
      default:
        logger.error('❌ Unknown callback type', { callback });
        throw new Error(`Unknown callback type: ${callback}`);
    }

  } catch (error) {
    logger.error('💥 CALLBACK HANDLER FAILED', {
      callback,
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    await sendOperationNotification(
      callback,
      `Callback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sessionId,
    );
    throw error;
  }
}
