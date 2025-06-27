/**
 * @file Structured data example tool handler
 * @module handlers/tools/structured-data-example
 * 
 * @remarks
 * This tool demonstrates how MCP tools can return structured data
 * alongside text content. Structured data enables better integration,
 * type safety, and programmatic consumption of tool results.
 * 
 * The structured data pattern:
 * 1. Tool defines an output schema
 * 2. Tool returns both text and structured content
 * 3. Structured content conforms to the output schema
 * 4. Clients can validate and use the structured data
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/server/tools | MCP Tools Specification}
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { MCPToolContext } from '../../types/request-context.js';
import { sendOperationNotification } from '../notifications.js';
import { logger } from '../../utils/logger.js';
// Validation will be done by the framework

/**
 * Arguments for the structured data example tool
 */
interface StructuredDataExampleArgs {
  /** The type of structured data to return */
  dataType: 'user' | 'analytics' | 'weather' | 'product';
  /** Optional ID to fetch specific data */
  id?: string;
  /** Whether to include nested data */
  includeNested?: boolean;
  /** Whether to simulate validation errors */
  simulateError?: boolean;
}

/**
 * Example structured data interfaces
 */
interface UserData {
  id: string;
  username: string;
  email: string;
  created: string;
  profile: {
    displayName: string;
    bio?: string;
    avatarUrl?: string;
    verified: boolean;
  };
  stats: {
    posts: number;
    comments: number;
    karma: number;
  };
}

interface AnalyticsData {
  period: string;
  metrics: {
    views: number;
    uniqueVisitors: number;
    engagementRate: number;
    averageSessionDuration: number;
  };
  topContent: Array<{
    id: string;
    title: string;
    views: number;
    engagement: number;
  }>;
  trends: {
    viewsChange: number;
    engagementChange: number;
  };
}

interface WeatherData {
  location: {
    city: string;
    country: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    conditions: string;
    icon: string;
  };
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    conditions: string;
    precipitation: number;
  }>;
}

interface ProductData {
  id: string;
  name: string;
  description: string;
  price: {
    amount: number;
    currency: string;
    discount?: number;
  };
  inventory: {
    inStock: boolean;
    quantity: number;
    warehouse: string;
  };
  ratings: {
    average: number;
    count: number;
    distribution: Record<string, number>;
  };
}

/**
 * Example tool that demonstrates returning structured data
 * 
 * @remarks
 * This tool shows how to return properly structured data that
 * conforms to defined schemas. It demonstrates validation,
 * nested objects, arrays, and various data types.
 * 
 * The tool returns both human-readable text and machine-readable
 * structured data for maximum compatibility.
 * 
 * @param args - Tool arguments specifying data type to return
 * @param context - MCP context with session information
 * @returns Tool response with structured data
 */
export async function handleStructuredDataExample(
  args: StructuredDataExampleArgs,
  context: MCPToolContext
): Promise<CallToolResult> {

  try {
    // Input validation is handled by MCP framework

    // Send notification about the operation
    await sendOperationNotification(
      'structured_data_example',
      `Demonstrating ${args.dataType} structured data`,
      context.sessionId
    );

    // Simulate validation error if requested
    if (args.simulateError) {
      throw new Error('Simulated validation error: Invalid data format');
    }

    // Generate structured data based on type
    let structuredData: any;
    let textDescription: string;

    switch (args.dataType) {
      case 'user':
        const userData: UserData = {
          id: args.id || 'user_123',
          username: 'example_user',
          email: 'user@example.com',
          created: new Date('2023-01-15').toISOString(),
          profile: {
            displayName: 'Example User',
            bio: args.includeNested ? 'Software developer and Reddit enthusiast' : undefined,
            avatarUrl: args.includeNested ? 'https://example.com/avatar.jpg' : undefined,
            verified: true
          },
          stats: {
            posts: 42,
            comments: 156,
            karma: 1337
          }
        };
        structuredData = userData;
        textDescription = `User ${userData.username} (${userData.profile.displayName}) has ${userData.stats.karma} karma from ${userData.stats.posts} posts and ${userData.stats.comments} comments.`;
        break;

      case 'analytics':
        const analyticsData: AnalyticsData = {
          period: '2024-01',
          metrics: {
            views: 15420,
            uniqueVisitors: 8234,
            engagementRate: 0.42,
            averageSessionDuration: 245
          },
          topContent: args.includeNested ? [
            { id: 'post_1', title: 'Getting Started Guide', views: 3201, engagement: 0.56 },
            { id: 'post_2', title: 'Advanced Techniques', views: 2150, engagement: 0.48 },
            { id: 'post_3', title: 'Common Mistakes', views: 1892, engagement: 0.51 }
          ] : [],
          trends: {
            viewsChange: 0.15,
            engagementChange: 0.08
          }
        };
        structuredData = analyticsData;
        textDescription = `Analytics for ${analyticsData.period}: ${analyticsData.metrics.views} views, ${analyticsData.metrics.uniqueVisitors} unique visitors, ${(analyticsData.metrics.engagementRate * 100).toFixed(1)}% engagement rate.`;
        break;

      case 'weather':
        const weatherData: WeatherData = {
          location: {
            city: 'San Francisco',
            country: 'USA',
            coordinates: {
              latitude: 37.7749,
              longitude: -122.4194
            }
          },
          current: {
            temperature: 18,
            feelsLike: 16,
            humidity: 72,
            windSpeed: 15,
            conditions: 'Partly Cloudy',
            icon: '⛅'
          },
          forecast: args.includeNested ? [
            { date: '2024-01-21', high: 20, low: 14, conditions: 'Sunny', precipitation: 0 },
            { date: '2024-01-22', high: 19, low: 13, conditions: 'Cloudy', precipitation: 10 },
            { date: '2024-01-23', high: 17, low: 12, conditions: 'Rainy', precipitation: 80 }
          ] : []
        };
        structuredData = weatherData;
        textDescription = `Weather in ${weatherData.location.city}: ${weatherData.current.temperature}°C, ${weatherData.current.conditions}, ${weatherData.current.humidity}% humidity.`;
        break;

      case 'product':
        const productData: ProductData = {
          id: args.id || 'prod_789',
          name: 'Premium Widget Pro',
          description: 'High-quality widget with advanced features',
          price: {
            amount: 99.99,
            currency: 'USD',
            discount: args.includeNested ? 15 : undefined
          },
          inventory: {
            inStock: true,
            quantity: 250,
            warehouse: 'Warehouse A'
          },
          ratings: {
            average: 4.5,
            count: 328,
            distribution: args.includeNested ? {
              '5': 198,
              '4': 87,
              '3': 28,
              '2': 10,
              '1': 5
            } : {}
          }
        };
        structuredData = productData;
        const finalPrice = productData.price.discount 
          ? productData.price.amount * (1 - productData.price.discount / 100)
          : productData.price.amount;
        textDescription = `${productData.name}: ${productData.price.currency} ${finalPrice.toFixed(2)}${productData.price.discount ? ` (${productData.price.discount}% off)` : ''}, ${productData.ratings.average}/5 stars (${productData.ratings.count} reviews), ${productData.inventory.inStock ? 'In Stock' : 'Out of Stock'}.`;
        break;
    }


    // Return both text and structured content
    return {
      content: [
        {
          type: 'text',
          text: textDescription
        }
      ],
      // This is the key feature - returning structured data
      structuredContent: structuredData
    };

  } catch (error) {
    logger.error('❌ Structured data example failed', {
      error: error instanceof Error ? error.message : String(error),
      dataType: args.dataType
    });

    await sendOperationNotification(
      'structured_data_example',
      `Structured data example failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      context.sessionId
    );

    throw error;
  }
}

/**
 * Get the output schema for this tool
 * 
 * @remarks
 * This function returns the JSON schema that describes the
 * structured output of this tool. Clients can use this to
 * validate the structured content.
 * 
 * @param dataType - The type of data schema to return
 * @returns JSON schema for the output
 */
export function getStructuredDataOutputSchema(dataType: string): any {
  const schemas: Record<string, any> = {
    user: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        username: { type: 'string' },
        email: { type: 'string' },
        created: { type: 'string', format: 'date-time' },
        profile: {
          type: 'object',
          properties: {
            displayName: { type: 'string' },
            bio: { type: 'string' },
            avatarUrl: { type: 'string', format: 'uri' },
            verified: { type: 'boolean' }
          },
          required: ['displayName', 'verified']
        },
        stats: {
          type: 'object',
          properties: {
            posts: { type: 'number' },
            comments: { type: 'number' },
            karma: { type: 'number' }
          },
          required: ['posts', 'comments', 'karma']
        }
      },
      required: ['id', 'username', 'email', 'created', 'profile', 'stats']
    },
    analytics: {
      type: 'object',
      properties: {
        period: { type: 'string' },
        metrics: {
          type: 'object',
          properties: {
            views: { type: 'number' },
            uniqueVisitors: { type: 'number' },
            engagementRate: { type: 'number', minimum: 0, maximum: 1 },
            averageSessionDuration: { type: 'number' }
          }
        },
        topContent: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              views: { type: 'number' },
              engagement: { type: 'number' }
            }
          }
        },
        trends: {
          type: 'object',
          properties: {
            viewsChange: { type: 'number' },
            engagementChange: { type: 'number' }
          }
        }
      }
    },
    weather: {
      type: 'object',
      properties: {
        location: {
          type: 'object',
          properties: {
            city: { type: 'string' },
            country: { type: 'string' },
            coordinates: {
              type: 'object',
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' }
              }
            }
          }
        },
        current: {
          type: 'object',
          properties: {
            temperature: { type: 'number' },
            feelsLike: { type: 'number' },
            humidity: { type: 'number' },
            windSpeed: { type: 'number' },
            conditions: { type: 'string' },
            icon: { type: 'string' }
          }
        },
        forecast: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              high: { type: 'number' },
              low: { type: 'number' },
              conditions: { type: 'string' },
              precipitation: { type: 'number' }
            }
          }
        }
      }
    },
    product: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        price: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            currency: { type: 'string' },
            discount: { type: 'number' }
          }
        },
        inventory: {
          type: 'object',
          properties: {
            inStock: { type: 'boolean' },
            quantity: { type: 'number' },
            warehouse: { type: 'string' }
          }
        },
        ratings: {
          type: 'object',
          properties: {
            average: { type: 'number' },
            count: { type: 'number' },
            distribution: {
              type: 'object',
              additionalProperties: { type: 'number' }
            }
          }
        }
      }
    }
  };

  return schemas[dataType] || {};
}