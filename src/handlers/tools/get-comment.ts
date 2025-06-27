
import { getCommentSuccessMessage } from '../../constants/tool/get-comment.js';
import { RedditError } from '../../types/reddit.js';

import { formatToolResponse } from './types.js';
import type { ToolHandler, GetCommentArgs} from './types.js';


export const handleGetComment: ToolHandler<GetCommentArgs> = async (args, { redditService }) => {
  try {
    const { id, includeThread } = args;

    if (!id) {
      throw new RedditError("id is required for fetching comments", "VALIDATION_ERROR");
    }

    // First fetch the single comment to get its permalink
    const comment = await redditService.fetchCommentById(id);

    // If includeThread is true, fetch the entire thread using the post ID from permalink
    if (includeThread) {
      // Extract post ID from permalink (format: /r/subreddit/comments/id/...)
      const idFromPermalink = comment.permalink.split("/")[4];
      if (!idFromPermalink) {
        throw new RedditError("Could not extract post ID from permalink", "VALIDATION_ERROR");
      }

      const parentId = `t3_${idFromPermalink}`;
      const commentThread = await redditService.fetchCommentThread(parentId, id);

      return formatToolResponse({
        message: getCommentSuccessMessage,
        result: {
          commentThread: formatCommentThreadForDisplay(commentThread),
        },
      });
    }

    // Otherwise, just return the single comment
    return formatToolResponse({
      message: getCommentSuccessMessage,
      result: {
        comment: formatCommentForDisplay(comment),
      },
    });
  } catch (error) {
    return formatToolResponse({
      status: "error",
      message: `Failed to fetch comment: ${error instanceof Error ? error.message : "Unknown error"}`,
      error: {
        type: error instanceof RedditError ? error.type : "API_ERROR",
        details: error,
      },
    });
  }
};

function formatCommentForDisplay(comment: any) {
  return {
    ...comment,
    body:
      comment.body.length > 1000
        ? `${comment.body.substring(0, 1000)}... (truncated)`
        : comment.body,
    formattedTime: new Date(comment.createdUtc * 1000).toISOString(),
  };
}

function formatCommentThreadForDisplay(thread: any) {
  const { comment, replies } = thread;
  return {
    comment: formatCommentForDisplay(comment),
    replies: replies.map((reply: any) => formatCommentThreadForDisplay(reply)),
  };
}
