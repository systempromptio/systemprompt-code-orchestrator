/**
 * @file Sampling example tool handler
 * @module handlers/tools/sampling-example
 * 
 * @remarks
 * This tool demonstrates the MCP sampling pattern, which allows servers
 * to make LLM calls nested inside other MCP server features. This enables
 * agentic behaviors where the server can leverage AI capabilities during
 * tool execution.
 * 
 * The sampling flow:
 * 1. Tool determines it needs AI assistance
 * 2. Server sends sampling request with messages
 * 3. Client uses its LLM to generate a response
 * 4. Server receives the AI-generated content
 * 5. Tool uses the response to complete its operation
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/client/sampling | MCP Sampling Specification}
 */

import type { CallToolResult, CreateMessageRequest } from '@modelcontextprotocol/sdk/types.js';
import type { MCPToolContext } from '../../types/request-context.js';
import { sendOperationNotification } from '../notifications.js';
import { sendSamplingRequest } from '../sampling.js';
import { logger } from '../../utils/logger.js';

/**
 * Arguments for the sampling example tool
 */
interface SamplingExampleArgs {
  /** The type of sampling task to demonstrate */
  taskType: 'summarize' | 'generate' | 'analyze' | 'translate';
  /** Input content for the sampling task */
  content: string;
  /** Optional target language for translation tasks */
  targetLanguage?: string;
  /** Optional style preferences for generation tasks */
  style?: 'formal' | 'casual' | 'technical' | 'creative';
}

/**
 * Example tool that demonstrates MCP sampling pattern
 * 
 * @remarks
 * This tool shows how to request AI-generated content using the
 * sampling pattern. It demonstrates different types of sampling
 * requests that leverage the client's LLM capabilities.
 * 
 * The tool creates sampling requests that would be sent to the
 * client's LLM for processing. In a real implementation, these
 * would trigger actual AI generation.
 * 
 * @param args - Tool arguments specifying the sampling task
 * @param context - MCP context with session information
 * @returns Tool response with sampling request details
 */
export async function handleSamplingExample(
  args: SamplingExampleArgs,
  context: MCPToolContext
): Promise<CallToolResult> {

  try {
    // Send notification about the operation
    await sendOperationNotification(
      'sampling_example',
      `Demonstrating ${args.taskType} sampling task`,
      context.sessionId
    );

    // Create sampling request based on task type
    let samplingRequest: any;
    let systemPrompt: string;

    switch (args.taskType) {
      case 'summarize':
        systemPrompt = 'You are a helpful assistant that creates concise, accurate summaries. Focus on the main points and key information.';
        samplingRequest = {
          method: 'sampling/createMessage',
          params: {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Please summarize the following content:\n\n${args.content}`
                }
              }
            ],
            systemPrompt,
            modelPreferences: {
              hints: [{ name: 'claude-3-haiku' }],
              intelligencePriority: 0.6,
              speedPriority: 0.8
            },
            maxTokens: 500
          }
        };
        break;

      case 'generate':
        const styleGuide = {
          formal: 'Use professional, formal language with proper structure',
          casual: 'Use conversational, friendly tone',
          technical: 'Use precise technical terminology and detailed explanations',
          creative: 'Use imaginative, engaging language with creative flair'
        };
        systemPrompt = `You are a content generator. ${styleGuide[args.style || 'formal']}.`;
        
        samplingRequest = {
          method: 'sampling/createMessage',
          params: {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Generate content based on this prompt: ${args.content}`
                }
              }
            ],
            systemPrompt,
            modelPreferences: {
              hints: [{ name: 'claude-3-sonnet' }],
              intelligencePriority: 0.8,
              speedPriority: 0.5
            },
            maxTokens: 1000
          }
        };
        break;

      case 'analyze':
        systemPrompt = 'You are an analytical assistant. Provide detailed analysis with insights, patterns, and recommendations.';
        samplingRequest = {
          method: 'sampling/createMessage',
          params: {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Please analyze the following content and provide insights:\n\n${args.content}`
                }
              }
            ],
            systemPrompt,
            modelPreferences: {
              hints: [{ name: 'claude-3-opus' }],
              intelligencePriority: 0.9,
              speedPriority: 0.3
            },
            maxTokens: 1500
          }
        };
        break;

      case 'translate':
        const targetLang = args.targetLanguage || 'Spanish';
        systemPrompt = `You are a professional translator. Translate accurately while preserving meaning and tone.`;
        samplingRequest = {
          method: 'sampling/createMessage',
          params: {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Translate the following text to ${targetLang}:\n\n${args.content}`
                }
              }
            ],
            systemPrompt,
            modelPreferences: {
              hints: [{ name: 'claude-3-haiku' }],
              intelligencePriority: 0.7,
              speedPriority: 0.7
            },
            maxTokens: args.content.length * 2 // Allow for expansion
          }
        };
        break;
    }

    // Actually send the sampling request to trigger the full flow
    logger.info('🚀 Triggering actual sampling request', {
      taskType: args.taskType,
      sessionId: context.sessionId
    });

    // Create the actual sampling request that will be sent to the client
    const createMessageRequest: CreateMessageRequest = {
      method: 'sampling/createMessage',
      params: {
        ...samplingRequest.params,
        _meta: {
          // This callback will be resolved on the server after client responds
          callback: 'suggest_action'
        }
      }
    };

    try {
      // This triggers the full flow:
      // 1. Server sends sampling request to client
      // 2. Client presents to user for approval
      // 3. User approves/modifies
      // 4. Client sends to LLM
      // 5. LLM generates response
      // 6. Client presents response for review
      // 7. User approves final response
      // 8. Client returns response to server
      // 9. Server executes the callback (suggest_action)
      const samplingResult = await sendSamplingRequest(createMessageRequest, {
        sessionId: context.sessionId
      });

      logger.info('✅ Sampling request completed', {
        taskType: args.taskType,
        hasContent: !!samplingResult.content,
        contentType: samplingResult.content.type
      });

      // Return both the sampling details and the actual result
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              description: 'MCP sampling pattern successfully executed',
              taskType: args.taskType,
              samplingRequestSent: {
                method: createMessageRequest.method,
                hasMessages: createMessageRequest.params.messages.length,
                callback: createMessageRequest.params._meta?.callback,
                maxTokens: createMessageRequest.params.maxTokens
              },
              samplingResult: {
                role: samplingResult.role,
                content: samplingResult.content,
                model: samplingResult.model,
                stopReason: samplingResult.stopReason
              },
              flow: [
                '1. Tool created sampling request',
                '2. Server sent request to client',
                '3. Client handled user approval',
                '4. Client sent to LLM',
                '5. LLM generated response',
                '6. Client got user approval',
                '7. Client returned response',
                '8. Server executed callback',
                '9. Tool returned final result'
              ]
            }, null, 2)
          }
        ]
      };

    } catch (samplingError) {
      logger.error('❌ Sampling request failed', {
        error: samplingError instanceof Error ? samplingError.message : String(samplingError),
        taskType: args.taskType
      });

      // Return error details but don't throw - show what happened
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              description: 'MCP sampling pattern demonstration (with error)',
              taskType: args.taskType,
              samplingRequestAttempted: samplingRequest,
              error: samplingError instanceof Error ? samplingError.message : String(samplingError),
              note: 'The sampling request was sent but encountered an error. This could be due to client rejection or other issues.'
            }, null, 2)
          }
        ]
      };
    }

  } catch (error) {
    logger.error('❌ Sampling example failed', {
      error: error instanceof Error ? error.message : String(error),
      taskType: args.taskType
    });

    await sendOperationNotification(
      'sampling_example',
      `Sampling example failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      context.sessionId
    );

    throw error;
  }
}