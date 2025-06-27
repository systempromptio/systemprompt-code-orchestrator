import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const getChannel: Tool = {
  name: "get_channel",
  description:
    "Retrieves posts from a specific Reddit subreddit (channel). This tool fetches a list of posts from the specified subreddit, sorted by your choice of hot, new, or controversial. It's useful for browsing current discussions, finding trending topics, or exploring what's happening in a particular community. The tool returns post titles, authors, scores, comment counts, and basic metadata to help you understand the current state of the subreddit.",
  inputSchema: {
    type: "object",
    properties: {
      subreddit: {
        type: "string",
        description:
          "The name of the subreddit to fetch posts from (without the 'r/' prefix). For example: 'AskReddit', 'technology', 'funny'.",
      },
      sort: {
        type: "string",
        enum: ["hot", "new", "controversial"],
        description:
          "How to sort the posts. 'hot' shows trending posts, 'new' shows most recent posts, 'controversial' shows posts with lots of both upvotes and downvotes.",
        default: "hot",
      },
    },
    required: ["subreddit"],
  },
  _meta: {
    hidden: true,
    title: "Get Channel Posts",
    type: "server",
  },
};

export const getChannelSuccessMessage =
  "The user has retrieved posts from a Reddit channel (subreddit). Read and understand the results, present a summary of the most interesting or relevant posts to the user and ask if they would like to explore any specific posts or get posts from another channel.";