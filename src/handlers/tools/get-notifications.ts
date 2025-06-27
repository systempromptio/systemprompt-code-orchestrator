
import { RedditError } from '../../types/reddit.js';

import { formatToolResponse } from './types.js';
import type { ToolHandler, GetNotificationsArgs} from './types.js';


export const handleGetNotifications: ToolHandler<GetNotificationsArgs> = async (
  args,
  { redditService },
) => {
  try {
    const notifications = await redditService.fetchNotifications(args);

    return formatToolResponse({
      message: `Found ${notifications.length} notifications`,
      result: { notifications },
    });
  } catch (error) {
    return formatToolResponse({
      status: "error",
      message: `Failed to fetch notifications: ${error instanceof Error ? error.message : "Unknown error"}`,
      error: {
        type: error instanceof RedditError ? error.type : "API_ERROR",
        details: error,
      },
    });
  }
};
