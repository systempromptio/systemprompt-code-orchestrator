import { Resource } from "@modelcontextprotocol/sdk/types.js";
import { TaskStore } from "../../services/task-store.js";
import { ClaudeCodeService } from "../../services/claude-code-service.js";
import { AgentManager } from "../../services/agent-manager.js";
import { logger } from "../../utils/logger.js";

export async function getTaskOutputResource(uri: URL): Promise<Resource> {
  const taskId = uri.pathname.replace("/task-output/", "");
  
  if (!taskId) {
    throw new Error("Task ID is required");
  }
  
  const taskStore = TaskStore.getInstance();
  const claudeService = ClaudeCodeService.getInstance();
  const agentManager = AgentManager.getInstance();
  
  try {
    const task = await taskStore.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Get session information
    const sessions = agentManager.getAllSessions();
    const taskSession = sessions.find(s => s.taskId === taskId);
    
    let streamOutput = "";
    let progressEvents: any[] = [];
    
    if (taskSession && taskSession.type === 'claude') {
      // Get Claude session details
      const claudeSession = claudeService.getSession(taskSession.serviceSessionId);
      if (claudeSession) {
        // Get streaming output
        streamOutput = claudeSession.streamBuffer.join("\n");
        
        // TODO: Get progress events from a proper store
        // For now, we'll just show the stream buffer
      }
    }
    
    const output = {
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        branch: task.branch,
        progress: task.progress || 0,
        created_at: task.created_at,
        updated_at: task.updated_at
      },
      session: taskSession ? {
        id: taskSession.id,
        type: taskSession.type,
        status: taskSession.status,
        created_at: taskSession.created_at,
        last_activity: taskSession.last_activity
      } : null,
      logs: task.logs || [],
      stream_output: streamOutput,
      progress_events: progressEvents,
      files_created: [],  // TODO: Track files created
      commands_executed: [] // TODO: Track commands executed
    };
    
    return {
      uri: uri.toString(),
      name: `Task Output: ${task.title}`,
      description: `Complete output and progress for task ${taskId}`,
      mimeType: "application/json",
      text: JSON.stringify(output, null, 2)
    };
    
  } catch (error) {
    logger.error("Failed to get task output resource", { taskId, error });
    throw error;
  }
}

export async function listTaskOutputResources(): Promise<Resource[]> {
  const taskStore = TaskStore.getInstance();
  const tasks = await taskStore.getTasks();
  
  // Only show active tasks
  const activeTasks = tasks.filter(t => 
    t.status === 'in_progress' || 
    t.status === 'pending' ||
    (t.status === 'completed' && t.updated_at && 
     new Date(t.updated_at).getTime() > Date.now() - 3600000) // Last hour
  );
  
  return activeTasks.map(task => ({
    uri: `task-output://task-output/${task.id}`,
    name: `Task: ${task.title}`,
    description: `Status: ${task.status}, Branch: ${task.branch}`,
    mimeType: "application/json"
  }));
}