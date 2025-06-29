/**
 * @file JSON Schema to Zod converter utility
 * @module utils/json-schema-to-zod
 */

import { z } from 'zod';

/**
 * Convert JSON Schema to Zod schema
 * This is a simplified converter that handles the common cases used in MCP tool definitions
 */
export function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (!schema || typeof schema !== 'object') {
    return z.any();
  }

  if (schema.type === 'object' && schema.properties) {
    const shape: Record<string, z.ZodTypeAny> = {};
    
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      let zodType = jsonSchemaToZod(propSchema as any);
      
      // Apply default if specified
      if ((propSchema as any).default !== undefined) {
        zodType = zodType.default((propSchema as any).default);
      }
      
      // Make optional if not in required array
      if (!schema.required?.includes(key)) {
        zodType = zodType.optional();
      }
      
      shape[key] = zodType;
    }
    
    return z.object(shape);
  }
  
  if (schema.type === 'string') {
    if (schema.enum) {
      return z.enum(schema.enum as [string, ...string[]]);
    }
    return z.string();
  }
  
  if (schema.type === 'boolean') {
    return z.boolean();
  }
  
  if (schema.type === 'number') {
    return z.number();
  }
  
  if (schema.type === 'array') {
    return z.array(jsonSchemaToZod(schema.items || {}));
  }
  
  return z.any();
}