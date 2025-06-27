import { SUGGEST_ACTION_PROMPT } from './suggest-action.js';
import { CODE_GENERATION_EXAMPLE_PROMPT } from './code-generation-example.js';

export * from './suggest-action.js';
export * from './code-generation-example.js';

export const PROMPTS = [
  SUGGEST_ACTION_PROMPT,
  CODE_GENERATION_EXAMPLE_PROMPT,
];
