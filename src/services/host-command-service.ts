import * as net from 'net';

export interface HostCommandResult {
  success: boolean;
  output: string;
  error?: string;
  code?: number;
}

/**
 * Service to execute commands on the host through the daemon
 */
export class HostCommandService {
  private static instance: HostCommandService;
  
  private constructor() {}
  
  static getInstance(): HostCommandService {
    if (!HostCommandService.instance) {
      HostCommandService.instance = new HostCommandService();
    }
    return HostCommandService.instance;
  }
  
  /**
   * Execute a shell command on the host through the daemon
   */
  async executeCommand(command: string, workingDirectory: string): Promise<HostCommandResult> {
    return new Promise((resolve, reject) => {
      console.log('[HostCommandService] Executing command on host:', command);
      
      // Map Docker paths to host paths
      let hostWorkingDirectory = workingDirectory;
      if (workingDirectory.startsWith('/workspace')) {
        const hostRoot = process.env.HOST_FILE_ROOT || '/var/www/html/systemprompt-coding-agent';
        hostWorkingDirectory = workingDirectory.replace('/workspace', hostRoot);
        console.log(`[HostCommandService] Mapped Docker path ${workingDirectory} to host path ${hostWorkingDirectory}`);
      }
      
      const proxyHost = process.env.CLAUDE_PROXY_HOST || 'host.docker.internal';
      const proxyPort = parseInt(process.env.CLAUDE_PROXY_PORT || '9876', 10);
      
      const client = net.createConnection({ port: proxyPort, host: proxyHost }, () => {
        console.log('[HostCommandService] Connected to host proxy');
        
        const message = JSON.stringify({
          tool: 'bash',  // Use 'bash' as the tool to execute shell commands
          command: command,
          workingDirectory: hostWorkingDirectory
        });
        
        client.write(message);
      });
      
      let buffer = '';
      const outputChunks: string[] = [];
      const errorChunks: string[] = [];
      let exitCode: number | undefined;
      
      client.on('data', (data) => {
        buffer += data.toString();
        
        // Process line-delimited JSON
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              
              switch (response.type) {
                case 'stream':
                  if (response.data) {
                    outputChunks.push(response.data);
                  }
                  break;
                  
                case 'error':
                  if (response.data) {
                    errorChunks.push(response.data);
                  }
                  break;
                  
                case 'complete':
                  exitCode = response.code || 0;
                  client.end();
                  
                  const result: HostCommandResult = {
                    success: exitCode === 0,
                    output: outputChunks.join(''),
                    error: errorChunks.length > 0 ? errorChunks.join('') : undefined,
                    code: exitCode
                  };
                  
                  console.log('[HostCommandService] Command completed:', {
                    command,
                    exitCode,
                    outputLength: result.output.length,
                    hasError: !!result.error
                  });
                  
                  resolve(result);
                  break;
              }
            } catch (e) {
              console.error('[HostCommandService] Failed to parse response:', e, 'Line:', line);
            }
          }
        }
      });
      
      client.on('error', (err) => {
        reject(new Error(`Host command failed: ${err.message}`));
      });
      
      client.on('close', () => {
        if (exitCode === undefined) {
          reject(new Error('Host proxy connection closed unexpectedly'));
        }
      });
      
      // No timeout - let the command run until completion
    });
  }
  
  /**
   * Execute git commands to create/switch branches
   */
  async setupGitBranch(workingDirectory: string, branch: string): Promise<HostCommandResult> {
    console.log(`[HostCommandService] Setting up git branch: ${branch}`);
    
    // First check current branch
    const currentBranchResult = await this.executeCommand('git branch --show-current', workingDirectory);
    const currentBranch = currentBranchResult.output.trim();
    
    console.log(`[HostCommandService] Current branch: ${currentBranch}`);
    
    if (currentBranch === branch) {
      console.log(`[HostCommandService] Already on branch ${branch}`);
      return { success: true, output: `Already on branch ${branch}` };
    }
    
    // Check if branch exists
    const branchExistsResult = await this.executeCommand(`git branch --list ${branch}`, workingDirectory);
    const branchExists = branchExistsResult.output.trim().length > 0;
    
    // Stash any uncommitted changes
    const stashResult = await this.executeCommand('git stash', workingDirectory);
    console.log(`[HostCommandService] Stash result: ${stashResult.output}`);
    
    // Create or checkout branch
    let checkoutCommand: string;
    if (branchExists) {
      console.log(`[HostCommandService] Branch ${branch} exists, checking out`);
      checkoutCommand = `git checkout ${branch}`;
    } else {
      console.log(`[HostCommandService] Creating new branch ${branch}`);
      checkoutCommand = `git checkout -b ${branch}`;
    }
    
    const checkoutResult = await this.executeCommand(checkoutCommand, workingDirectory);
    
    if (!checkoutResult.success) {
      console.error(`[HostCommandService] Failed to checkout branch: ${checkoutResult.error}`);
      // Try to restore stash if checkout failed
      await this.executeCommand('git stash pop', workingDirectory).catch(() => {});
    }
    
    return checkoutResult;
  }
}