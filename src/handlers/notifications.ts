import type { ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getMCPHandlerInstance } from '../server/mcp.js';


type ConfigNotification = {
  method: "server/config/changed";
  params: {
    _meta: Record<string, any>;
    message: string;
    level: "info" | "warning" | "error";
    timestamp: string;
  };
};

type ProgressNotification = {
  method: "notifications/progress";
  params: {
    progressToken: string | number;
    progress: number;
    total?: number;
  };
};

type RootsListChangedNotification = {
  method: "notifications/roots/list_changed";
  params?: Record<string, never>;
};

type ResourcesUpdatedNotification = {
  method: "notifications/resources/updated";
  params: {
    uri: string;
  };
};

type ResourcesListChangedNotification = {
  method: "notifications/resources/list_changed";
  params?: Record<string, never>;
};

export async function sendOperationNotification(operation: string, message: string, sessionId?: string): Promise<void> {
  const notification: ServerNotification = {
    method: "notifications/message",
    params: {
      _meta: {},
      message: `Operation ${operation}: ${message}`,
      level: "info",
      timestamp: new Date().toISOString(),
    },
  };
  await sendNotification(notification, sessionId);
}

export async function sendJsonResultNotification(message: string): Promise<void> {
  const notification: ServerNotification = {
    method: "notifications/message",
    params: {
      _meta: {},
      message: message,
      level: "info",
      timestamp: new Date().toISOString(),
    },
  };
  await sendNotification(notification);
}


export async function sendConfigNotification(message: string): Promise<void> {
  const notification: ConfigNotification = {
    method: "server/config/changed",
    params: {
      _meta: {},
      message: message,
      level: "info",
      timestamp: new Date().toISOString(),
    },
  };
  await sendNotification(notification);
}

export async function sendProgressNotification(
  progressToken: string | number,
  progress: number,
  total?: number,
  sessionId?: string
): Promise<void> {
  const notification: ProgressNotification = {
    method: "notifications/progress",
    params: {
      progressToken,
      progress,
      ...(total !== undefined && { total }),
    },
  };
  await sendNotification(notification, sessionId);
}

export async function sendRootsListChangedNotification(): Promise<void> {
  const notification: RootsListChangedNotification = {
    method: "notifications/roots/list_changed",
    params: {}
  };
  await sendNotification(notification);
}

export async function sendResourcesUpdatedNotification(uri: string, sessionId?: string): Promise<void> {
  const notification: ResourcesUpdatedNotification = {
    method: "notifications/resources/updated",
    params: { uri }
  };
  await sendNotification(notification, sessionId);
}

export async function sendResourcesListChangedNotification(sessionId?: string): Promise<void> {
  const notification: ResourcesListChangedNotification = {
    method: "notifications/resources/list_changed",
    params: {}
  };
  await sendNotification(notification, sessionId);
}

async function sendNotification(
  notification: ServerNotification | ConfigNotification | ProgressNotification | RootsListChangedNotification | ResourcesUpdatedNotification | ResourcesListChangedNotification,
  sessionId?: string
) {
  const handler = getMCPHandlerInstance();
  if (!handler) {
    console.warn("MCP handler not initialized, cannot send notification");
    return;
  }

  // If sessionId is provided, send only to that specific session
  if (sessionId) {
    const server = handler.getServerForSession(sessionId);
    if (!server) {
      console.warn(`No active server found for session: ${sessionId}`);
      return;
    }
    
    try {
      console.log(`[NOTIFICATION DEBUG] Sending ${notification.method} to session ${sessionId}`);
      await server.notification(notification as ServerNotification);
      console.log(`[NOTIFICATION DEBUG] Successfully sent ${notification.method} to session ${sessionId}`);
    } catch (err: any) {
      console.error(`Failed to send notification to session ${sessionId}`, err);
    }
    return;
  }
  
  // Otherwise, broadcast to all active sessions (for global notifications)
  const activeServers = handler.getAllServers();
  if (activeServers.length === 0) {
    console.warn("No active MCP server sessions available for notification");
    return;
  }
  
  console.log(`[NOTIFICATION] Sending ${notification.method} to ${activeServers.length} active sessions`);
  
  const notificationPromises = activeServers.map((server: Server) => 
    server.notification(notification as ServerNotification).catch((err: any) => {
      console.error("Failed to send notification to session", err);
    })
  );
  
  await Promise.all(notificationPromises);
}

