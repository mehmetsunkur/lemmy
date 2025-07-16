# Fix log file output message
**Status:** InProgress
**Agent PID:** 20146

## Original Todo
"📁 Logs will be written to: .claude-trace/log-YYYY-MM-DD-HH-MM-SS.{jsonl,html}" this is terrible. Just state both files verbatim, so a user can click on them. Also we need to remove all emojis from the logs.

## Description
The claude-trace app currently displays a generic log file message with placeholders ("log-YYYY-MM-DD-HH-MM-SS") instead of the actual filenames. This makes it impossible for users to click on the files directly in their terminal. Additionally, the app uses emojis in console output which should be removed per the todo requirement.

## Implementation Plan
1. Modify the log file output message to show actual filenames instead of placeholders
2. Remove all emojis from console output in the claude-trace app
3. Ensure the actual filenames are clickable in terminals that support file paths

Here's the detailed plan:

- [x] Update interceptor.ts to expose the actual log filenames (apps/claude-trace/src/interceptor.ts:37-40)
- [x] Modify cli.ts to display the actual filenames instead of placeholder pattern (apps/claude-trace/src/cli.ts:226)
- [x] Remove all emojis from console output in cli.ts (multiple locations)
- [x] Remove all emojis from console output in index-generator.ts (multiple locations)
- [ ] Remove emojis from interceptor.ts console output (apps/claude-trace/src/interceptor.ts:443,445)
- [ ] Remove emojis from interceptor-loader.js console output (apps/claude-trace/src/interceptor-loader.js:20,24)
- [ ] Test that log filenames are displayed correctly and are clickable
- [ ] Verify all emojis have been removed from console output

## Notes
[Implementation notes]