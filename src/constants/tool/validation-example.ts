/**
 * @file Validation example tool definition
 * @module constants/tool/validation-example
 */

import type { JSONSchema7 } from "json-schema";

/**
 * Input schema for the validation example tool
 * Demonstrates various JSON Schema validation features
 */
export const validationExampleSchema: JSONSchema7 = {
  type: "object",
  properties: {
    name: {
      type: "string",
      minLength: 2,
      maxLength: 50,
      pattern: "^[a-zA-Z ]+$",
      description: "Name (letters and spaces only, 2-50 chars)"
    },
    age: {
      type: "integer",
      minimum: 0,
      maximum: 150,
      description: "Age in years (0-150)"
    },
    email: {
      type: "string",
      format: "email",
      description: "Valid email address"
    },
    role: {
      type: "string",
      enum: ["user", "admin", "moderator"],
      description: "User role"
    },
    preferences: {
      type: "object",
      properties: {
        theme: {
          type: "string",
          enum: ["light", "dark", "auto"],
          default: "auto"
        },
        notifications: {
          type: "boolean",
          default: true
        }
      },
      additionalProperties: false
    },
    tags: {
      type: "array",
      items: {
        type: "string",
        minLength: 1
      },
      minItems: 0,
      maxItems: 10,
      uniqueItems: true,
      description: "List of tags (max 10, unique)"
    }
  },
  required: ["name", "age", "email", "role"],
  additionalProperties: false
};

/**
 * Tool definition for demonstrating input validation
 * 
 * @remarks
 * This tool validates input against a JSON schema and returns
 * either processed data on success or validation errors on failure.
 */
export const VALIDATION_EXAMPLE_TOOL = {
  name: "validation_example",
  description: "Demonstrates input validation with JSON Schema - validates user data and returns structured results",
  inputSchema: {
    type: "object" as const,
    properties: validationExampleSchema.properties,
    required: validationExampleSchema.required,
    additionalProperties: validationExampleSchema.additionalProperties
  }
};