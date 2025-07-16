# Fix fetch abort signal handling in claude-bridge
**Status:** Refining
**Agent PID:** 63901

## Original Todo
apps/claude-bridge we "swizzle" global.fetch to intercept calls and proxy to some other provider. i would assume that the caller of fetch passes in an abort signal. we do not evaluate that signal at all, which leads to subtle concurrency bugs.

## Description
[what we're building]

## Implementation Plan
[how we are building it]
- [ ] Code change with location(s) if applicable (src/file.ts:45-93)
- [ ] Automated test: ...
- [ ] User test: ...

## Notes
[Implementation notes]