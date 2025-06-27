import { getChannelSuccessMessage } from '../../constants/tool/get-channel.js';
import { RedditError } from '../../types/reddit.js';

import { formatToolResponse } from './types.js';
import type { ToolHandler, GetChannelArgs} from './types.js';


export const handleGetChannel: ToolHandler<GetChannelArgs> = async (args, { redditService }) => {
  try {
    const { sort = "hot", subreddit } = args;

    if (!subreddit) {
      throw new RedditError("Subreddit is required", "VALIDATION_ERROR");
    }

    const posts = await redditService.fetchPosts({
      sort,
      subreddit,
      limit: 25
    });

    return formatToolResponse({
      message: getChannelSuccessMessage,
      result: {
        posts,
        subreddit,
        sort,
      },
    });
  } catch (error) {
    return formatToolResponse({
      status: "error",
      message: `Failed to fetch channel posts: ${error instanceof Error ? error.message : "Unknown error"}`,
      error: {
        type: error instanceof RedditError ? error.type : "API_ERROR",
        details: error,
      },
    });
  }
};