/**
 * @file Example tool demonstrating input validation
 * @module handlers/tools/validation-example
 */

import type { JSONSchema7 } from "json-schema";
import { formatToolResponse } from "./types.js";
import type { ToolHandler } from "./types.js";
import Ajv from "ajv";
import addFormats from "ajv-formats";

// Initialize AJV for schema validation
const ajv = new Ajv({ allErrors: true, code: { esm: true } });
// Add format validators including email
addFormats(ajv);

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
      description: "Name (letters and spaces only, 2-50 chars)",
    },
    age: {
      type: "integer",
      minimum: 0,
      maximum: 150,
      description: "Age in years (0-150)",
    },
    email: {
      type: "string",
      format: "email",
      description: "Valid email address",
    },
    role: {
      type: "string",
      enum: ["user", "admin", "moderator"],
      description: "User role",
    },
    preferences: {
      type: "object",
      properties: {
        theme: {
          type: "string",
          enum: ["light", "dark", "auto"],
          default: "auto",
        },
        notifications: {
          type: "boolean",
          default: true,
        },
      },
      additionalProperties: false,
    },
    tags: {
      type: "array",
      items: {
        type: "string",
        minLength: 1,
      },
      minItems: 0,
      maxItems: 10,
      uniqueItems: true,
      description: "List of tags (max 10, unique)",
    },
  },
  required: ["name", "age", "email", "role"],
  additionalProperties: false,
};

interface ValidationExampleArgs {
  name: string;
  age: number;
  email: string;
  role: "user" | "admin" | "moderator";
  preferences?: {
    theme?: "light" | "dark" | "auto";
    notifications?: boolean;
  };
  tags?: string[];
}

/**
 * Tool handler that demonstrates input validation
 * This tool validates input against a JSON schema and returns results
 */
export const handleValidationExample: ToolHandler<ValidationExampleArgs> = async (
  args,
  _context,
) => {
  // Compile the schema
  const validate = ajv.compile(validationExampleSchema);

  // Validate the input
  const valid = validate(args);

  if (!valid) {
    // Validation failed - return detailed error information
    const errors = validate.errors || [];
    const errorDetails = errors.map((err) => ({
      field: err.instancePath || err.schemaPath,
      message: err.message,
      params: err.params,
    }));

    return formatToolResponse({
      status: "error",
      message: "Validation failed",
      error: {
        type: "VALIDATION_ERROR",
        details: errorDetails,
      },
      result: {
        valid: false,
        errors: errorDetails,
        providedData: args,
      },
    });
  }

  // Validation succeeded - process the data
  const processedData = {
    valid: true,
    processed: {
      fullName: args.name.trim(),
      ageGroup: args.age < 18 ? "minor" : args.age < 65 ? "adult" : "senior",
      emailDomain: args.email.split("@")[1],
      roleLevel: args.role === "admin" ? 3 : args.role === "moderator" ? 2 : 1,
      preferences: {
        theme: args.preferences?.theme || "auto",
        notifications: args.preferences?.notifications ?? true,
      },
      tagCount: args.tags?.length || 0,
      tags: args.tags || [],
    },
    metadata: {
      validatedAt: new Date().toISOString(),
      schemaVersion: "1.0.0",
    },
  };

  return formatToolResponse({
    status: "success",
    message: "Validation successful - data processed",
    result: processedData,
  });
};

// Tool definition
export const VALIDATION_EXAMPLE_TOOL = {
  name: "validation_example",
  description:
    "Demonstrates input validation with JSON Schema - validates user data and returns structured results",
  inputSchema: {
    type: "object" as const,
    properties: validationExampleSchema.properties,
    required: validationExampleSchema.required,
    additionalProperties: validationExampleSchema.additionalProperties,
  },
};
