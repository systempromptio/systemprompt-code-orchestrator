/**
 * @file Test Report Generator
 * @module test-reporter
 * 
 * @remarks
 * Generates comprehensive reports for E2E tests including instructions, logs, and file changes
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface TestReportData {
  testName: string;
  startTime: Date;
  endTime?: Date;
  taskId: string;
  sessionId?: string;
  tool: string;
  branch: string;
  instructions: string;
  logs: Array<{
    timestamp: string;
    message: string;
    type?: string;
  }>;
  filesChanged: Array<{
    path: string;
    status: 'added' | 'modified' | 'deleted';
    additions: number;
    deletions: number;
    diff?: string;
  }>;
  result: {
    success: boolean;
    error?: string;
    output?: string;
    duration?: number;
  };
  notifications: Array<{
    timestamp: string;
    type: string;
    data: any;
  }>;
}

export class TestReporter {
  private reports: Map<string, TestReportData> = new Map();
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  /**
   * Starts tracking a new test
   */
  startTest(testName: string, taskId: string, options: {
    tool: string;
    branch: string;
    instructions: string;
    sessionId?: string;
  }): void {
    this.reports.set(taskId, {
      testName,
      startTime: new Date(),
      taskId,
      sessionId: options.sessionId,
      tool: options.tool,
      branch: options.branch,
      instructions: options.instructions,
      logs: [],
      filesChanged: [],
      result: { success: false },
      notifications: []
    });
  }

  /**
   * Adds a log entry
   */
  addLog(taskId: string, message: string, type?: string): void {
    const report = this.reports.get(taskId);
    if (report) {
      report.logs.push({
        timestamp: new Date().toISOString(),
        message,
        type
      });
    }
  }

  /**
   * Adds a notification
   */
  addNotification(taskId: string, type: string, data: any): void {
    const report = this.reports.get(taskId);
    if (report) {
      report.notifications.push({
        timestamp: new Date().toISOString(),
        type,
        data
      });
    }
  }

  /**
   * Captures file changes using git diff
   */
  async captureFileChanges(taskId: string): Promise<void> {
    const report = this.reports.get(taskId);
    if (!report) return;

    try {
      // Get list of changed files
      const statusOutput = execSync(`git status --porcelain`, { 
        cwd: this.projectRoot,
        encoding: 'utf8'
      });

      const changedFiles = statusOutput.split('\n').filter(line => line.trim());
      
      for (const line of changedFiles) {
        const status = line.substring(0, 2).trim();
        const filePath = line.substring(3).trim();
        
        let fileStatus: 'added' | 'modified' | 'deleted' = 'modified';
        if (status === 'A' || status === '??') fileStatus = 'added';
        else if (status === 'D') fileStatus = 'deleted';
        
        // Get diff for the file
        let diff = '';
        let additions = 0;
        let deletions = 0;
        
        try {
          if (fileStatus !== 'added') {
            diff = execSync(`git diff HEAD -- "${filePath}"`, {
              cwd: this.projectRoot,
              encoding: 'utf8'
            });
          } else {
            // For new files, show the content
            const fullPath = path.join(this.projectRoot, filePath);
            if (await this.fileExists(fullPath)) {
              const content = await fs.readFile(fullPath, 'utf8');
              diff = `+++ ${filePath}\n${content.split('\n').map(line => `+ ${line}`).join('\n')}`;
              additions = content.split('\n').length;
            }
          }
          
          // Count additions/deletions
          if (diff) {
            additions = (diff.match(/^\+[^+]/gm) || []).length;
            deletions = (diff.match(/^-[^-]/gm) || []).length;
          }
        } catch (e) {
          // Ignore diff errors
        }
        
        report.filesChanged.push({
          path: filePath,
          status: fileStatus,
          additions,
          deletions,
          diff: diff.substring(0, 1000) // Limit diff size
        });
      }
    } catch (error) {
      console.warn('Failed to capture file changes:', error);
    }
  }

  /**
   * Completes a test
   */
  async completeTest(taskId: string, result: {
    success: boolean;
    error?: string;
    output?: string;
  }): Promise<void> {
    const report = this.reports.get(taskId);
    if (!report) return;

    report.endTime = new Date();
    report.result = {
      ...result,
      duration: report.endTime.getTime() - report.startTime.getTime()
    };

    // Capture final file changes
    await this.captureFileChanges(taskId);
  }

  /**
   * Generates HTML report
   */
  async generateHTMLReport(): Promise<string> {
    const reports = Array.from(this.reports.values());
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>E2E Test Report - ${new Date().toISOString()}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      background: #2c3e50;
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .test-report {
      background: white;
      border-radius: 8px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .test-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 2px solid #ecf0f1;
    }
    .test-title {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
    }
    .test-status {
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-success {
      background: #27ae60;
      color: white;
    }
    .status-failed {
      background: #e74c3c;
      color: white;
    }
    .section {
      margin: 20px 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #34495e;
      margin-bottom: 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .info-item {
      background: #ecf0f1;
      padding: 15px;
      border-radius: 4px;
    }
    .info-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 16px;
      font-weight: bold;
      color: #2c3e50;
    }
    .instructions {
      background: #f8f9fa;
      border-left: 4px solid #3498db;
      padding: 15px;
      margin: 15px 0;
      font-family: monospace;
      white-space: pre-wrap;
    }
    .logs {
      max-height: 400px;
      overflow-y: auto;
      background: #2c3e50;
      color: #ecf0f1;
      padding: 15px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .log-entry {
      margin-bottom: 5px;
      padding: 2px 0;
    }
    .log-timestamp {
      color: #95a5a6;
      margin-right: 10px;
    }
    .files-changed {
      margin-top: 20px;
    }
    .file-item {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 10px;
    }
    .file-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .file-path {
      font-family: monospace;
      font-weight: bold;
      color: #2c3e50;
    }
    .file-stats {
      display: flex;
      gap: 10px;
      font-size: 14px;
    }
    .additions {
      color: #27ae60;
    }
    .deletions {
      color: #e74c3c;
    }
    .file-diff {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      overflow-x: auto;
      max-height: 200px;
      overflow-y: auto;
    }
    .summary {
      background: #34495e;
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-top: 30px;
      text-align: center;
    }
    .summary-stats {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-top: 20px;
    }
    .stat-item {
      text-align: center;
    }
    .stat-value {
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .stat-label {
      font-size: 14px;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>E2E Test Execution Report</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    ${reports.map(report => `
      <div class="test-report">
        <div class="test-header">
          <div class="test-title">${report.testName}</div>
          <div class="test-status ${report.result.success ? 'status-success' : 'status-failed'}">
            ${report.result.success ? 'SUCCESS' : 'FAILED'}
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Task ID</div>
            <div class="info-value">${report.taskId}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Tool</div>
            <div class="info-value">${report.tool}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Branch</div>
            <div class="info-value">${report.branch}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Duration</div>
            <div class="info-value">${report.result.duration ? (report.result.duration / 1000).toFixed(2) + 's' : 'N/A'}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Instructions to LLM</div>
          <div class="instructions">${this.escapeHtml(report.instructions)}</div>
        </div>

        <div class="section">
          <div class="section-title">Execution Logs (${report.logs.length} entries)</div>
          <div class="logs">
            ${report.logs.map(log => `
              <div class="log-entry">
                <span class="log-timestamp">${log.timestamp}</span>
                <span>${this.escapeHtml(log.message)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="section files-changed">
          <div class="section-title">Files Changed (${report.filesChanged.length} files)</div>
          ${report.filesChanged.map(file => `
            <div class="file-item">
              <div class="file-header">
                <div class="file-path">${file.path}</div>
                <div class="file-stats">
                  <span class="additions">+${file.additions}</span>
                  <span class="deletions">-${file.deletions}</span>
                </div>
              </div>
              ${file.diff ? `<div class="file-diff">${this.escapeHtml(file.diff)}</div>` : ''}
            </div>
          `).join('')}
        </div>

        ${report.result.error ? `
          <div class="section">
            <div class="section-title">Error</div>
            <div class="instructions" style="border-color: #e74c3c;">
              ${this.escapeHtml(report.result.error)}
            </div>
          </div>
        ` : ''}
      </div>
    `).join('')}

    <div class="summary">
      <h2>Test Summary</h2>
      <div class="summary-stats">
        <div class="stat-item">
          <div class="stat-value">${reports.length}</div>
          <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${reports.filter(r => r.result.success).length}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${reports.filter(r => !r.result.success).length}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${reports.reduce((sum, r) => sum + r.filesChanged.length, 0)}</div>
          <div class="stat-label">Files Changed</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generates Markdown report
   */
  async generateMarkdownReport(): Promise<string> {
    const reports = Array.from(this.reports.values());
    
    let markdown = `# E2E Test Execution Report\n\n`;
    markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    for (const report of reports) {
      markdown += `## ${report.testName}\n\n`;
      markdown += `**Status:** ${report.result.success ? '✅ SUCCESS' : '❌ FAILED'}\n\n`;
      
      markdown += `### Test Information\n\n`;
      markdown += `- **Task ID:** ${report.taskId}\n`;
      markdown += `- **Tool:** ${report.tool}\n`;
      markdown += `- **Branch:** ${report.branch}\n`;
      markdown += `- **Duration:** ${report.result.duration ? (report.result.duration / 1000).toFixed(2) + 's' : 'N/A'}\n\n`;
      
      markdown += `### Instructions to LLM\n\n`;
      markdown += `\`\`\`\n${report.instructions}\n\`\`\`\n\n`;
      
      markdown += `### Execution Logs (${report.logs.length} entries)\n\n`;
      markdown += `<details>\n<summary>Click to expand logs</summary>\n\n`;
      markdown += `\`\`\`\n`;
      for (const log of report.logs) {
        markdown += `[${log.timestamp}] ${log.message}\n`;
      }
      markdown += `\`\`\`\n\n</details>\n\n`;
      
      markdown += `### Files Changed (${report.filesChanged.length} files)\n\n`;
      for (const file of report.filesChanged) {
        markdown += `#### ${file.path}\n\n`;
        markdown += `- Status: ${file.status}\n`;
        markdown += `- Changes: +${file.additions} / -${file.deletions}\n\n`;
        
        if (file.diff) {
          markdown += `<details>\n<summary>View diff</summary>\n\n`;
          markdown += `\`\`\`diff\n${file.diff}\n\`\`\`\n\n</details>\n\n`;
        }
      }
      
      if (report.result.error) {
        markdown += `### Error\n\n`;
        markdown += `\`\`\`\n${report.result.error}\n\`\`\`\n\n`;
      }
      
      markdown += `---\n\n`;
    }
    
    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests:** ${reports.length}\n`;
    markdown += `- **Passed:** ${reports.filter(r => r.result.success).length}\n`;
    markdown += `- **Failed:** ${reports.filter(r => !r.result.success).length}\n`;
    markdown += `- **Total Files Changed:** ${reports.reduce((sum, r) => sum + r.filesChanged.length, 0)}\n`;
    
    return markdown;
  }

  /**
   * Saves reports to disk
   */
  async saveReports(outputDir: string): Promise<{ html: string; markdown: string }> {
    await fs.mkdir(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0];
    const htmlPath = path.join(outputDir, `report-${timestamp}.html`);
    const markdownPath = path.join(outputDir, `report-${timestamp}.md`);
    
    const htmlReport = await this.generateHTMLReport();
    const markdownReport = await this.generateMarkdownReport();
    
    await fs.writeFile(htmlPath, htmlReport, 'utf8');
    await fs.writeFile(markdownPath, markdownReport, 'utf8');
    
    return { html: htmlPath, markdown: markdownPath };
  }

  /**
   * Prints summary to console
   */
  printSummary(): void {
    const reports = Array.from(this.reports.values());
    
    console.log('\n' + '='.repeat(80));
    console.log('TEST EXECUTION SUMMARY');
    console.log('='.repeat(80));
    
    for (const report of reports) {
      console.log(`\n${report.testName}`);
      console.log('-'.repeat(report.testName.length));
      console.log(`Status: ${report.result.success ? '\x1b[32m✅ SUCCESS\x1b[0m' : '\x1b[31m❌ FAILED\x1b[0m'}`);
      console.log(`Tool: ${report.tool}`);
      console.log(`Branch: ${report.branch}`);
      console.log(`Duration: ${report.result.duration ? (report.result.duration / 1000).toFixed(2) + 's' : 'N/A'}`);
      console.log(`Files Changed: ${report.filesChanged.length}`);
      
      if (report.filesChanged.length > 0) {
        console.log('\nFiles Modified:');
        for (const file of report.filesChanged) {
          console.log(`  - ${file.path} (+${file.additions}/-${file.deletions})`);
        }
      }
      
      if (report.result.error) {
        console.log(`\n\x1b[31mError: ${report.result.error}\x1b[0m`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`Total Tests: ${reports.length}`);
    console.log(`Passed: ${reports.filter(r => r.result.success).length}`);
    console.log(`Failed: ${reports.filter(r => !r.result.success).length}`);
    console.log('='.repeat(80) + '\n');
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}