import { SUGGEST_ACTION_PROMPT } from './suggest-action.js';
import { CODE_GENERATION_EXAMPLE_PROMPT } from './code-generation-example.js';
import { 
  TASK_PLANNING_PROMPT,
  TASK_AUTOMATION_PROMPT,
  TASK_DEBUG_PROMPT
} from './task-management.js';
import { CODING_PROMPTS } from '../../handlers/prompts/index.js';

export * from './suggest-action.js';
export * from './code-generation-example.js';
export * from './task-management.js';

export const PROMPTS = [
  SUGGEST_ACTION_PROMPT,
  CODE_GENERATION_EXAMPLE_PROMPT,
  TASK_PLANNING_PROMPT,
  TASK_AUTOMATION_PROMPT,
  TASK_DEBUG_PROMPT,
  ...CODING_PROMPTS
];
