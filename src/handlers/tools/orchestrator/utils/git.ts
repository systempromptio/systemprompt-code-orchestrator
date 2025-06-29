/**
 * @file Git operation utilities for orchestrator tools
 * @module handlers/tools/orchestrator/utils/git
 */

import { HostCommandService } from '../../../../services/host-command-service.js';
import { logger } from '../../../../utils/logger.js';
import { GitOperationError } from './types.js';
import { isValidGitBranch } from './validation.js';

export interface GitStatus {
  isRepository: boolean;
  currentBranch?: string;
  hasUncommittedChanges: boolean;
  hasUntrackedFiles: boolean;
}

export interface BranchSetupResult {
  success: boolean;
  previousBranch?: string;
  newBranch: string;
  wasCreated: boolean;
  stashCreated: boolean;
  message: string;
}

/**
 * Service wrapper for git operations through the host daemon
 */
export class GitOperations {
  private readonly hostCommand: HostCommandService;
  
  constructor(hostCommand?: HostCommandService) {
    this.hostCommand = hostCommand || HostCommandService.getInstance();
  }
  
  /**
   * Gets the current git repository status
   * @param workingDirectory The directory to check
   * @returns Git status information
   */
  async getStatus(workingDirectory: string): Promise<GitStatus> {
    try {
      // Check if it's a git repository
      const repoCheck = await this.hostCommand.executeCommand(
        'git rev-parse --git-dir',
        workingDirectory
      );
      
      if (!repoCheck.success) {
        return {
          isRepository: false,
          hasUncommittedChanges: false,
          hasUntrackedFiles: false
        };
      }
      
      // Get current branch
      const branchResult = await this.hostCommand.executeCommand(
        'git branch --show-current',
        workingDirectory
      );
      const currentBranch = branchResult.output.trim() || 'HEAD';
      
      // Check for uncommitted changes
      const statusResult = await this.hostCommand.executeCommand(
        'git status --porcelain',
        workingDirectory
      );
      
      const statusLines = statusResult.output.trim().split('\n').filter(Boolean);
      const hasUncommittedChanges = statusLines.some(line => 
        !line.startsWith('??') // Not untracked
      );
      const hasUntrackedFiles = statusLines.some(line => 
        line.startsWith('??')
      );
      
      return {
        isRepository: true,
        currentBranch,
        hasUncommittedChanges,
        hasUntrackedFiles
      };
    } catch (error) {
      logger.error('Failed to get git status', { error, workingDirectory });
      throw new GitOperationError('status check', error);
    }
  }
  
  /**
   * Sets up a git branch for task execution
   * @param workingDirectory The working directory
   * @param branchName The branch name to setup
   * @param options Setup options
   * @returns Setup result details
   */
  async setupBranch(
    workingDirectory: string,
    branchName: string,
    options: {
      createIfNotExists?: boolean;
      stashChanges?: boolean;
      baseBranch?: string;
    } = {}
  ): Promise<BranchSetupResult> {
    const {
      createIfNotExists = true,
      stashChanges = true,
      baseBranch
    } = options;
    
    // Validate branch name
    if (!isValidGitBranch(branchName)) {
      throw new GitOperationError('branch setup', {
        reason: 'Invalid branch name',
        branchName
      });
    }
    
    try {
      // Get current status
      const status = await this.getStatus(workingDirectory);
      
      if (!status.isRepository) {
        logger.warn('Not a git repository, skipping branch setup', { workingDirectory });
        return {
          success: true,
          newBranch: branchName,
          wasCreated: false,
          stashCreated: false,
          message: 'Not a git repository, proceeding without branch'
        };
      }
      
      const previousBranch = status.currentBranch;
      let stashCreated = false;
      
      // Already on the target branch
      if (previousBranch === branchName) {
        return {
          success: true,
          previousBranch,
          newBranch: branchName,
          wasCreated: false,
          stashCreated: false,
          message: `Already on branch ${branchName}`
        };
      }
      
      // Stash changes if needed
      if (stashChanges && status.hasUncommittedChanges) {
        const stashMessage = `Auto-stash before switching to ${branchName}`;
        const stashResult = await this.hostCommand.executeCommand(
          `git stash push -m "${stashMessage}"`,
          workingDirectory
        );
        
        if (stashResult.success) {
          stashCreated = true;
          logger.info('Created git stash', { branchName, message: stashMessage });
        }
      }
      
      // Check if branch exists
      const branchListResult = await this.hostCommand.executeCommand(
        `git branch --list ${branchName}`,
        workingDirectory
      );
      const branchExists = branchListResult.output.trim().length > 0;
      
      // Handle branch creation/checkout
      if (!branchExists) {
        if (!createIfNotExists) {
          throw new GitOperationError('branch setup', {
            reason: 'Branch does not exist and createIfNotExists is false',
            branchName
          });
        }
        
        // Create new branch
        const createCommand = baseBranch
          ? `git checkout -b ${branchName} ${baseBranch}`
          : `git checkout -b ${branchName}`;
          
        const createResult = await this.hostCommand.executeCommand(
          createCommand,
          workingDirectory
        );
        
        if (!createResult.success) {
          // Try to restore stash if branch creation failed
          if (stashCreated) {
            await this.hostCommand.executeCommand('git stash pop', workingDirectory).catch(() => {});
          }
          throw new GitOperationError('branch creation', createResult.error);
        }
        
        return {
          success: true,
          previousBranch,
          newBranch: branchName,
          wasCreated: true,
          stashCreated,
          message: `Created and switched to new branch ${branchName}`
        };
      } else {
        // Checkout existing branch
        const checkoutResult = await this.hostCommand.executeCommand(
          `git checkout ${branchName}`,
          workingDirectory
        );
        
        if (!checkoutResult.success) {
          // Try to restore stash if checkout failed
          if (stashCreated) {
            await this.hostCommand.executeCommand('git stash pop', workingDirectory).catch(() => {});
          }
          throw new GitOperationError('branch checkout', checkoutResult.error);
        }
        
        return {
          success: true,
          previousBranch,
          newBranch: branchName,
          wasCreated: false,
          stashCreated,
          message: `Switched to existing branch ${branchName}`
        };
      }
    } catch (error) {
      if (error instanceof GitOperationError) {
        throw error;
      }
      throw new GitOperationError('branch setup', error);
    }
  }
  
  /**
   * Gets the list of recent commits
   * @param workingDirectory The working directory
   * @param options Options for listing commits
   * @returns Array of commit information
   */
  async getRecentCommits(
    workingDirectory: string,
    options: {
      count?: number;
      branch?: string;
      format?: string;
    } = {}
  ): Promise<Array<{
    hash: string;
    subject: string;
    author: string;
    date: string;
  }>> {
    const {
      count = 10,
      branch,
      format = '%H|%s|%an|%ad'
    } = options;
    
    try {
      const command = branch
        ? `git log ${branch} --format="${format}" --date=iso -n ${count}`
        : `git log --format="${format}" --date=iso -n ${count}`;
        
      const result = await this.hostCommand.executeCommand(command, workingDirectory);
      
      if (!result.success) {
        return [];
      }
      
      return result.output
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const [hash, subject, author, date] = line.split('|');
          return { hash, subject, author, date };
        });
    } catch (error) {
      logger.error('Failed to get commits', { error, workingDirectory });
      return [];
    }
  }
  
  /**
   * Creates a git stash with a descriptive message
   * @param workingDirectory The working directory
   * @param message The stash message
   * @returns True if stash was created, false if nothing to stash
   */
  async createStash(workingDirectory: string, message: string): Promise<boolean> {
    try {
      const status = await this.getStatus(workingDirectory);
      
      if (!status.hasUncommittedChanges && !status.hasUntrackedFiles) {
        return false;
      }
      
      const result = await this.hostCommand.executeCommand(
        `git stash push -u -m "${message}"`,
        workingDirectory
      );
      
      return result.success;
    } catch (error) {
      logger.error('Failed to create stash', { error, workingDirectory });
      return false;
    }
  }
  
  /**
   * Restores the most recent stash
   * @param workingDirectory The working directory
   * @param options Restore options
   * @returns True if successful
   */
  async restoreStash(
    workingDirectory: string,
    options: { pop?: boolean } = {}
  ): Promise<boolean> {
    const { pop = true } = options;
    
    try {
      const command = pop ? 'git stash pop' : 'git stash apply';
      const result = await this.hostCommand.executeCommand(command, workingDirectory);
      return result.success;
    } catch (error) {
      logger.error('Failed to restore stash', { error, workingDirectory });
      return false;
    }
  }
}

// Export singleton instance
export const gitOperations = new GitOperations();