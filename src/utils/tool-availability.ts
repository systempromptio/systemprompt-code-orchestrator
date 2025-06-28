/**
 * Utility to check if AI tools are available based on environment variables
 */

export interface ToolAvailability {
  claude: boolean;
  gemini: boolean;
}

/**
 * Get the availability status of AI tools from environment variables
 */
export function getToolAvailability(): ToolAvailability {
  return {
    claude: process.env.CLAUDE_AVAILABLE === 'true',
    gemini: process.env.GEMINI_AVAILABLE === 'true'
  };
}

/**
 * Check if a specific tool is available
 */
export function isToolAvailable(tool: 'CLAUDECODE' | 'GEMINICLI'): boolean {
  const availability = getToolAvailability();
  
  switch (tool) {
    case 'CLAUDECODE':
      return availability.claude;
    case 'GEMINICLI':
      return availability.gemini;
    default:
      return false;
  }
}

/**
 * Get available tools as an array
 */
export function getAvailableTools(): Array<'CLAUDECODE' | 'GEMINICLI'> {
  const tools: Array<'CLAUDECODE' | 'GEMINICLI'> = [];
  const availability = getToolAvailability();
  
  if (availability.claude) {
    tools.push('CLAUDECODE');
  }
  if (availability.gemini) {
    tools.push('GEMINICLI');
  }
  
  return tools;
}

/**
 * Validate that at least one tool is available
 */
export function validateToolsAvailable(): void {
  const availability = getToolAvailability();
  
  if (!availability.claude && !availability.gemini) {
    throw new Error('No AI tools are available. At least one of Claude or Gemini must be configured.');
  }
}