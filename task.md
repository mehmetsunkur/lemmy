# Issue #21: getClaudeAbsolutePath finds bash file, not js file
**Status:** Refining
**Agent PID:** 4085

## Original Todo
- Issue #21: getClaudeAbsolutePath finds bash file, not js file
    - claude-trace fails when Claude is installed via /migrate command
    - `which claude` returns bash wrapper at ~/.claude/local/claude
    - This bash wrapper executes ~/.claude/local/node_modules/.bin/claude
    - Node.js spawn fails with code -1 when trying to execute the bash file
    - Need to resolve the actual JS file path that the bash wrapper points to

## Description
[what we're building]

## Implementation Plan
[how we are building it]
- [ ] Code change with location(s) if applicable (src/file.ts:45-93)
- [ ] Automated test: ...
- [ ] User test: ...

## Notes
[Implementation notes]