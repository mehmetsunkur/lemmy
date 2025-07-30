- apps/claude-bridge it would be nice to emulate the SSE Anthropic's SDK returns including token counts, so we get token counts displayed by Claude Code
- apps/claude-bridge we need a way to set max_completion_tokens as a cli flag and override the completion tokens Claude Code specifies in its request.

   ```bash
   ➜  claude-bridge git:(main) ✗ npx tsx src/cli.ts openai moonshotai/kimi-k2-instruct --baseURL https://api.groq.com/openai/v1 --apiKey $GROQ_API_KEY
   ⚠️  Unknown model for openai: moonshotai/kimi-k2-instruct
   This model is not in our registry but will be attempted.
   Known openai models:
       gpt-4-turbo
       gpt-4-turbo-2024-04-09
       gpt-4-turbo-preview
       ... and 24 more
   Run 'claude-bridge openai' to see all known models

   ⚠️  Model capabilities unknown for: moonshotai/kimi-k2-instruct
   Tool and image support cannot be validated.

   🌉 Claude Bridge starting:
   Provider: openai
   Model: moonshotai/kimi-k2-instruct
   🚀 Launching: node --import /Users/badlogic/workspaces/lemmy/apps/claude-bridge/src/interceptor-loader.js /Users/badlogic/.claude/local/node_modules/@anthropic-ai/claude-code/cli.js
   ╭─────────────────────────────────────────────────────────────╮
   │ ✻ Welcome to Claude Code!                                   │
   │                                                             │
   │   /help for help, /status for your current setup            │
   │                                                             │
   │   cwd: /Users/badlogic/workspaces/lemmy/apps/claude-bridge  │
   ╰─────────────────────────────────────────────────────────────╯

   ※ Tip: Send messages to Claude while it works to steer Claude in real-time

   > how you going?
   ⎿  API Error (Connection error.) · Retrying in 1 seconds… (attempt 1/10)
       ⎿  Error (400 `max_completion_tokens` must be less than or equal to `16384`, the maximum value for `max_completion_tokens` is less than the `context_window` for this model)
   ⎿  API Error (Connection error.) · Retrying in 1 seconds… (attempt 2/10)
       ⎿  Error (400 `max_completion_tokens` must be less than or equal to `16384`, the maximum value for `max_completion_tokens` is less than the `context_window` for this model)
   ⎿  API Error (Connection error.) · Retrying in 2 seconds… (attempt 3/10)
       ⎿  Error (400 `max_completion_tokens` must be less than or equal to `16384`, the maximum value for `max_completion_tokens` is less than the `context_window` for this model)
   ```

- apps/claude-trace This does not produce any logs in the .html, but the .jsonl has the data. See .claude-trace/log-2025-07-16-20-08-23.jsonl and .claude-trace/log-2025-07-16-20-08-23.html
