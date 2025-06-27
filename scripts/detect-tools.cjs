#!/usr/bin/env node

/**
 * Detect available tools and their paths
 */

const { execSync } = require('child_process');
const fs = require('fs');

function detectTool(command) {
  try {
    // First try to find in standard locations (prefer global installations)
    const standardPaths = [
      `/usr/local/bin/${command}`,
      `/usr/bin/${command}`,
      `/opt/homebrew/bin/${command}`
    ];
    
    for (const stdPath of standardPaths) {
      if (fs.existsSync(stdPath)) {
        try {
          fs.accessSync(stdPath, fs.constants.X_OK);
          return stdPath;
        } catch {
          // Not executable
        }
      }
    }
    
    // Fall back to which command
    const path = execSync(`which ${command}`, { encoding: 'utf8' }).trim();
    if (path && fs.existsSync(path)) {
      // Check if it's executable
      try {
        fs.accessSync(path, fs.constants.X_OK);
        return path;
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function detectShell() {
  // Try to find a working shell
  const shells = ['/bin/bash', '/usr/bin/bash', '/bin/sh', '/usr/bin/sh'];
  for (const shell of shells) {
    if (fs.existsSync(shell)) {
      try {
        execSync(`${shell} -c "exit 0"`, { timeout: 1000 });
        return shell;
      } catch {
        // Shell didn't work
      }
    }
  }
  return '/bin/sh'; // Fallback
}

function main() {
  const tools = {
    CLAUDE_PATH: detectTool('claude'),
    GEMINI_PATH: detectTool('gemini'),
    SHELL_PATH: detectShell(),
    CLAUDE_AVAILABLE: false,
    GEMINI_AVAILABLE: false
  };

  // Test if tools actually work
  if (tools.CLAUDE_PATH) {
    try {
      execSync(`${tools.CLAUDE_PATH} --version`, { 
        timeout: 5000,
        stdio: 'pipe'
      });
      tools.CLAUDE_AVAILABLE = true;
      console.log(`✓ Claude detected at: ${tools.CLAUDE_PATH}`);
    } catch {
      console.log(`✗ Claude found but not working at: ${tools.CLAUDE_PATH}`);
    }
  } else {
    console.log('✗ Claude not found');
  }

  if (tools.GEMINI_PATH) {
    try {
      execSync(`${tools.GEMINI_PATH} --version`, { 
        timeout: 5000,
        stdio: 'pipe'
      });
      tools.GEMINI_AVAILABLE = true;
      console.log(`✓ Gemini detected at: ${tools.GEMINI_PATH}`);
    } catch {
      console.log(`✗ Gemini found but not working at: ${tools.GEMINI_PATH}`);
    }
  } else {
    console.log('✗ Gemini not found');
  }

  console.log(`✓ Shell detected at: ${tools.SHELL_PATH}`);

  return tools;
}

// Export for use in other scripts
if (require.main === module) {
  const tools = main();
  console.log('\nDetected configuration:');
  console.log(JSON.stringify(tools, null, 2));
} else {
  module.exports = { detectTools: main };
}