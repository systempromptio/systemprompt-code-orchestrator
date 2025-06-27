import type { SamplingPrompt } from '../../types/sampling.js';

export const SUGGEST_ACTION_PROMPT: SamplingPrompt = {
  name: "reddit_suggest_action",
  description: "Analyzes recent Reddit activity and suggests the next action",
  arguments: [
    {
      name: "recentPosts",
      description: "JSON string of recent posts from configured subreddits",
      required: true,
    },
  ],
  messages: [
    {
      role: "assistant",
      content: {
        type: "text",
        text: "You are an expert Reddit strategist who analyzes trends and activity to suggest optimal actions. You understand Reddit culture, timing, and engagement patterns to maximize impact.",
      },
    },
    {
      role: "assistant",
      content: {
        type: "text",
        text: "I understand the subreddit rules and posting guidelines:\n{{redditConfig}}",
      },
    },
    {
      role: "assistant",
      content: {
        type: "text",
        text: "I will follow these content creation instructions:\n{{redditInstructions}}",
      },
    },
    {
      role: "user",
      content: {
        type: "text",
        text: `Analyze the following recent Reddit posts and suggest the optimal next action:

Recent Posts:
{{recentPosts}}

Based on this data:
1. Identify trending topics or patterns
2. Determine the best action (create a post, reply to a specific post, or wait)
3. Suggest a specific subreddit if applicable
4. Provide a clear reasoning for your suggestion
5. Suggest content direction if recommending a post or reply`,
      },
    },
  ],
  _meta: {
    callback: "suggest_action",
  },
};
