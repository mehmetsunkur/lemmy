# Fix fetch abort signal handling in claude-bridge
**Status:** InProgress
**Agent PID:** 63901

## Original Todo
apps/claude-bridge we "swizzle" global.fetch to intercept calls and proxy to some other provider. i would assume that the caller of fetch passes in an abort signal. we do not evaluate that signal at all, which leads to subtle concurrency bugs.

## Description
We need to fix a concurrency bug in claude-bridge where the global.fetch interception completely ignores AbortSignal from the original request. When Claude Code cancels a request, the underlying provider calls continue running, causing resource leaks and potential race conditions. The fix requires adding abort signal handling to the fetch interceptor in apps/claude-bridge/src/interceptor.ts and extending the lemmy client library to support abort signals throughout the provider call chain.

## Implementation Plan
- [ ] Add abort signal handling to claude-bridge interceptor (apps/claude-bridge/src/interceptor.ts:108-116)
- [ ] Extend lemmy types to support abort signals (packages/lemmy/src/types.ts)
- [ ] Update lemmy client implementations (packages/lemmy/src/clients/*.ts)
- [ ] Add comprehensive abort signal tests (apps/claude-bridge/test/unit.ts)
- [ ] Integration testing: Manual test with request cancellation

## Notes
[Implementation notes]