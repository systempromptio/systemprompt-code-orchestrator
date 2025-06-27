
import { DEFAULT_POST_LIMIT } from '../../constants.js';
import { searchRedditSuccessMessage } from '../../constants/tool/search-reddit.js';
import { RedditError } from '../../types/reddit.js';

import { formatToolResponse } from './types.js';
import type { ToolHandler, SearchRedditArgs} from './types.js';


export const handleSearchReddit: ToolHandler<SearchRedditArgs> = async (
  args,
  { redditService },
) => {
  try {
    const { query, subreddit, sort = "relevance", time = "all", limit = DEFAULT_POST_LIMIT } = args;

    if (!query.trim()) {
      throw new RedditError("Search query cannot be empty", "VALIDATION_ERROR");
    }

    const searchResults = await redditService.searchReddit({
      query,
      subreddit,
      sort,
      time,
      limit,
    });

    return formatToolResponse({
      message: searchRedditSuccessMessage,
      result: {
        results: searchResults.map((post) => ({
          title: post.title,
          subreddit: post.subreddit,
          url: post.url,
          score: post.score,
          numComments: post.numComments,
          createdUtc: post.createdUtc,
          summary: post.selftext?.substring(0, 200),
          id: post.id,
        })),
      },
    });
  } catch (error) {
    return formatToolResponse({
      status: "error",
      message: `Failed to search Reddit: ${error instanceof Error ? error.message : "Unknown error"}`,
      error: {
        type: error instanceof RedditError ? error.type : "API_ERROR",
        details: error,
      },
    });
  }
};
