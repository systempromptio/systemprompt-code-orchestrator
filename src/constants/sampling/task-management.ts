/**
 * @file Task management prompts
 * @module constants/sampling/task-management
 */

import type { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const TASK_PLANNING_PROMPT: Prompt = {
  name: 'task_planning',
  description: 'Help plan and structure a complex task with subtasks',
  arguments: [
    {
      name: 'task_description',
      description: 'Description of the main task to plan',
      required: true,
    },
    {
      name: 'constraints',
      description: 'Any constraints or requirements for the task',
      required: false,
    },
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'I need help planning the following task: {{task_description}}\n\nConstraints: {{constraints}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll help you plan this task. Let me break it down into manageable subtasks.

Based on your description, here's a structured plan:

1. **Preparation Phase**
   - Review requirements and constraints
   - Set up necessary environment
   - Gather required resources

2. **Implementation Phase**
   - Break down into specific subtasks
   - Define dependencies between tasks
   - Estimate time for each subtask

3. **Execution Strategy**
   - Determine task priorities
   - Identify which tasks can run in parallel
   - Set up monitoring and progress tracking

Would you like me to create these tasks in the system for you? I can help set up:
- Individual task definitions with commands
- Task dependencies and ordering
- Progress monitoring setup

What specific aspect would you like to start with?`,
      },
    },
  ],
};

export const TASK_AUTOMATION_PROMPT: Prompt = {
  name: 'task_automation',
  description: 'Convert a manual process into an automated task',
  arguments: [
    {
      name: 'process_description',
      description: 'Description of the manual process to automate',
      required: true,
    },
    {
      name: 'target_environment',
      description: 'The environment where this will run (e.g., docker, local, cloud)',
      required: false,
    },
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'I want to automate this process: {{process_description}}\n\nTarget environment: {{target_environment}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll help you automate this process. Let me analyze what needs to be done:

**Process Analysis:**
Based on your description, this process involves several steps that can be automated.

**Automation Approach:**
1. **Script Creation**
   - I'll help create executable scripts for each step
   - Set up proper error handling and logging
   - Add progress reporting

2. **Task Configuration**
   - Define task metadata and descriptions
   - Set up working directories
   - Configure environment variables

3. **Execution Flow**
   - Sequential vs parallel execution
   - Dependency management
   - Failure recovery strategies

**Suggested Implementation:**
\`\`\`bash
#!/bin/bash
# Automated task script
set -e  # Exit on error

echo "Starting automated process..."
# Your automation steps here
\`\`\`

Would you like me to:
1. Create the automation script for you?
2. Set up the task with proper configuration?
3. Add monitoring and alerting?

Which option would you prefer to start with?`,
      },
    },
  ],
};

export const TASK_DEBUG_PROMPT: Prompt = {
  name: 'task_debug',
  description: 'Debug a failed or problematic task',
  arguments: [
    {
      name: 'task_id',
      description: 'The ID of the task to debug',
      required: true,
    },
    {
      name: 'issue_description',
      description: 'Description of the problem',
      required: false,
    },
  ],
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Help me debug task {{task_id}}. Issue: {{issue_description}}',
      },
    },
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `I'll help you debug this task. Let me first check the task details and logs.

**Debugging Steps:**

1. **Task Status Check**
   - Current status and exit code
   - Last known output
   - Error messages

2. **Common Issues to Check:**
   - Permission problems
   - Missing dependencies
   - Environment variables
   - Working directory issues
   - Command syntax errors

3. **Debug Actions:**
   - View full task logs
   - Check process environment
   - Verify file permissions
   - Test command manually

**Immediate Actions:**
- Let me fetch the task details and recent logs
- Review the command and arguments
- Check the execution environment

Would you like me to:
1. Show the complete task logs?
2. Analyze the error patterns?
3. Suggest fixes based on the issue?
4. Create a test task to verify the fix?

What would be most helpful right now?`,
      },
    },
  ],
};