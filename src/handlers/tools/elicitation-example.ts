/**
 * @file Elicitation example tool handler
 * @module handlers/tools/elicitation-example
 * 
 * @remarks
 * This tool demonstrates the MCP elicitation pattern, which allows servers
 * to request additional information from users through the client during
 * interactions. This is useful when a tool needs user input to complete
 * its operation.
 * 
 * The elicitation flow:
 * 1. Tool recognizes it needs additional information
 * 2. Server sends elicitation request with schema
 * 3. Client prompts user for input
 * 4. User provides information (or rejects/cancels)
 * 5. Tool continues with the provided information
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation | MCP Elicitation Specification}
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { MCPToolContext } from '../../types/request-context.js';
import { sendOperationNotification } from '../notifications.js';
import { logger } from '../../utils/logger.js';

/**
 * Arguments for the elicitation example tool
 */
interface ElicitationExampleArgs {
  /** The type of information to elicit from the user */
  elicitationType: 'user_profile' | 'preferences' | 'credentials';
  /** Optional custom message to display to the user */
  customMessage?: string;
}

/**
 * Example tool that demonstrates MCP elicitation pattern
 * 
 * @remarks
 * This tool shows how to request additional information from users
 * using the elicitation pattern. It demonstrates different types of
 * elicitation requests with appropriate schemas.
 * 
 * The tool simulates the server-side of elicitation - in a real
 * implementation, the server would send an elicitation request to
 * the client, which would then prompt the user.
 * 
 * @param args - Tool arguments specifying elicitation type
 * @param context - MCP context with session information
 * @returns Tool response with elicitation request details
 */
export async function handleElicitationExample(
  args: ElicitationExampleArgs,
  context: MCPToolContext
): Promise<CallToolResult> {

  try {
    // Send notification about the operation
    await sendOperationNotification(
      'elicitation_example',
      `Demonstrating ${args.elicitationType} elicitation`,
      context.sessionId
    );

    // Create elicitation request based on type
    let elicitationRequest: any;

    switch (args.elicitationType) {
      case 'user_profile':
        elicitationRequest = {
          method: 'elicitation/create',
          params: {
            message: args.customMessage || 'Please provide your profile information to personalize the experience',
            requestedSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Your display name'
                },
                email: {
                  type: 'string',
                  description: 'Your email address'
                },
                preferences: {
                  type: 'object',
                  properties: {
                    notifications: {
                      type: 'boolean',
                      description: 'Enable notifications'
                    },
                    theme: {
                      type: 'string',
                      enum: ['light', 'dark', 'auto'],
                      description: 'Preferred theme'
                    }
                  }
                }
              },
              required: ['name']
            }
          }
        };
        break;

      case 'preferences':
        elicitationRequest = {
          method: 'elicitation/create',
          params: {
            message: args.customMessage || 'Please select your content preferences',
            requestedSchema: {
              type: 'object',
              properties: {
                contentTypes: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['posts', 'comments', 'messages', 'all']
                  },
                  description: 'Types of content to include'
                },
                sortOrder: {
                  type: 'string',
                  enum: ['hot', 'new', 'top', 'controversial'],
                  description: 'Default sort order'
                },
                includeNSFW: {
                  type: 'boolean',
                  description: 'Include NSFW content'
                }
              },
              required: ['contentTypes', 'sortOrder']
            }
          }
        };
        break;

      case 'credentials':
        elicitationRequest = {
          method: 'elicitation/create',
          params: {
            message: args.customMessage || 'Please provide your API credentials',
            requestedSchema: {
              type: 'object',
              properties: {
                apiKey: {
                  type: 'string',
                  description: 'Your API key'
                },
                apiSecret: {
                  type: 'string',
                  description: 'Your API secret (will be stored securely)'
                },
                environment: {
                  type: 'string',
                  enum: ['production', 'staging', 'development'],
                  description: 'API environment'
                }
              },
              required: ['apiKey', 'apiSecret']
            }
          }
        };
        break;
    }

    // Example of possible responses (in real implementation, this would come from the client)
    const exampleResponses = {
      accepted: {
        action: 'accept',
        content: {
          name: 'John Doe',
          email: 'john@example.com',
          preferences: {
            notifications: true,
            theme: 'dark'
          }
        }
      },
      rejected: {
        action: 'reject'
      },
      cancelled: {
        action: 'cancel'
      }
    };


    // Return the elicitation request details
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            description: 'This tool demonstrates the MCP elicitation pattern',
            elicitationRequest,
            exampleResponses,
            note: 'In a real implementation, this would trigger an actual elicitation request to the client'
          }, null, 2)
        }
      ]
    };

  } catch (error) {
    logger.error('❌ Elicitation example failed', {
      error: error instanceof Error ? error.message : String(error),
      elicitationType: args.elicitationType
    });

    await sendOperationNotification(
      'elicitation_example',
      `Elicitation example failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      context.sessionId
    );

    throw error;
  }
}