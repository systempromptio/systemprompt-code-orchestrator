#!/usr/bin/env node
/**
 * Debug test for resource templates handler
 */

import { ListResourceTemplatesRequestSchema } from "@modelcontextprotocol/sdk/types.js";

console.log('🔍 Debugging Resource Templates Handler\n');

// Check the schema details
console.log('Schema details:');
console.log('- Method:', ListResourceTemplatesRequestSchema.method);
console.log('- Params:', ListResourceTemplatesRequestSchema.params);
console.log('- Full schema:', JSON.stringify(ListResourceTemplatesRequestSchema, null, 2));

// Check if it matches what we expect
const expectedMethod = 'resources/templates/list';
console.log(`\n✅ Method matches expected? ${ListResourceTemplatesRequestSchema.method === expectedMethod}`);
console.log(`   Expected: "${expectedMethod}"`);
console.log(`   Actual: "${ListResourceTemplatesRequestSchema.method}"`);