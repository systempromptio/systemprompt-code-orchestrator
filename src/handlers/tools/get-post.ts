
import { getPostSuccessMessage } from '../../constants/tool/get-post.js';
import { RedditError } from '../../types/reddit.js';

import { formatToolResponse } from './types.js';
import type { ToolHandler, GetPostArgs} from './types.js';


export const handleGetPost: ToolHandler<GetPostArgs> = async (args, { redditService }) => {
  try {
    const { id } = args;

    if (!id) {
      throw new RedditError("id is required for fetching posts", "VALIDATION_ERROR");
    }

    const postWithComments = await redditService.fetchPostById(id);
    const formattedPost = {
      ...postWithComments,
      comments: formatCommentsForDisplay(postWithComments.comments),
    };

    return formatToolResponse({
      message: getPostSuccessMessage,
      result: {
        post: formattedPost,
      },
    });
  } catch (error) {
    return formatToolResponse({
      status: "error",
      message: `Failed to fetch Reddit post: ${error instanceof Error ? error.message : "Unknown error"}`,
      error: {
        type: error instanceof RedditError ? error.type : "API_ERROR",
        details: error,
      },
    });
  }
};

/**
 * Formats comment threads for better display in the tool response
 * @param comments The comment threads to format
 * @param depth The current depth level (for indentation)
 * @returns Formatted comments
 */
function formatCommentsForDisplay(comments: any[], depth = 0): any[] {
  if (!comments || !Array.isArray(comments) || comments.length === 0) {
    return [];
  }

  return comments.map((thread) => {
    const { comment, replies } = thread;

    // Add depth and format the comment
    const formattedComment = {
      ...comment,
      depth,
      // Truncate very long comments for display
      body:
        comment.body.length > 1000
          ? `${comment.body.substring(0, 1000)}... (truncated)`
          : comment.body,
      formattedTime: new Date(comment.createdUtc * 1000).toISOString(),
    };

    // Format replies recursively with increased depth
    const formattedReplies = formatCommentsForDisplay(replies, depth + 1);

    return {
      comment: formattedComment,
      replies: formattedReplies,
    };
  });
}
