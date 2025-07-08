# Claude-trace API Reference

Complete API documentation for the claude-trace project, covering both backend and frontend components.

## Overview

Claude-trace is a sophisticated Node.js-based logging and debugging tool that intercepts and records all interactions with Claude Code during development sessions. The API documentation is organized into backend and frontend sections, covering all public interfaces and utility functions.

## Backend API

The backend provides core functionality for intercepting HTTP traffic, processing logs, and generating reports.

### Core Components

- **[CLI](./backend/cli.md)** - Command-line interface with multiple operation modes
- **[Interceptor](./backend/interceptor.md)** - Core traffic interception and logging functionality
- **[HTML Generator](./backend/html-generator.md)** - Converts JSONL logs to interactive HTML reports
- **[Index Generator](./backend/index-generator.md)** - AI-powered conversation summarization and indexing

### Quick Start

```bash
# Start Claude with traffic logging
claude-trace

# Generate HTML report from logs
claude-trace --generate-html session.jsonl

# Extract OAuth token
export ANTHROPIC_API_KEY=$(claude-trace --extract-token)

# Generate conversation index
claude-trace --index
```

### Key Features

- **Traffic Interception**: Real-time HTTP request/response capture
- **Multiple Output Modes**: Interactive logging, token extraction, HTML generation
- **Security**: Automatic header redaction and safe data handling
- **Self-contained Reports**: No external dependencies required

## Frontend API

The frontend provides an interactive web interface for viewing and analyzing captured API traffic.

### Core Components

- **[Components](./frontend/components.md)** - Lit Element components for UI rendering
- **[Utilities](./frontend/utilities.md)** - Data processing and markdown utilities

### Architecture

```
Raw API Data → Data Processing → View Components → Interactive HTML
```

### Key Features

- **Multi-view Interface**: Conversation, Raw HTTP, and JSON debug views
- **SSE Reconstruction**: Rebuilds streaming responses into complete messages
- **Tool Visualization**: Interactive display of tool calls and results
- **Model Filtering**: Filter conversations by AI model
- **Responsive Design**: Works on all screen sizes

## Data Flow

### End-to-End Processing

1. **Interception**: HTTP requests captured by interceptor
2. **Logging**: Raw pairs written to JSONL format
3. **Processing**: SSE streams reconstructed, conversations merged
4. **Visualization**: Interactive HTML reports generated
5. **Indexing**: AI-powered summaries created (optional)

### File Formats

- **JSONL Logs**: `log-YYYY-MM-DD-HH-MM-SS.jsonl`
- **HTML Reports**: `log-YYYY-MM-DD-HH-MM-SS.html`
- **Summary Cache**: `summary-YYYY-MM-DD-HH-MM-SS.json`
- **Master Index**: `index.html`

## Common Use Cases

### Development Workflow

```bash
# 1. Start development session with logging
claude-trace --run-with chat

# 2. Work on your project with Claude
# All API traffic is automatically captured

# 3. Generate summary index when done
claude-trace --index
```

### Report Analysis

```bash
# Generate HTML report from specific session
claude-trace --generate-html logs/session.jsonl

# Include all requests, not just conversations
claude-trace --generate-html logs/session.jsonl --include-all-requests

# Generate without opening browser
claude-trace --generate-html logs/session.jsonl --no-open
```

### Token Management

```bash
# Extract token for SDK usage
export ANTHROPIC_API_KEY=$(claude-trace --extract-token)

# Use token with Anthropic SDK
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"messages": [...]}' \
     https://api.anthropic.com/v1/messages
```

## Type Definitions

### Core Types

```typescript
// Raw HTTP pair from interceptor
interface RawPair {
	request: {
		timestamp: number;
		method: string;
		url: string;
		headers: Record<string, string>;
		body: any;
	};
	response: {
		timestamp: number;
		status_code: number;
		headers: Record<string, string>;
		body?: any;
		body_raw?: string;
	};
	logged_at: string;
}

// Processed pair with enhanced metadata
interface ProcessedPair {
	id: string;
	model?: string;
	reconstructed_message?: EnhancedMessageParam;
	timestamp: number;
	status_code: number;
	request: any;
	response: any;
}

// Merged conversation thread
interface SimpleConversation {
	id: string;
	messages: EnhancedMessageParam[];
	system?: string | TextBlockParam[];
	models: Set<string>;
	metadata: {
		startTime: string;
		endTime: string;
		totalTokens: number;
		pairCount: number;
	};
}
```

## Error Handling

### Backend Errors

- **Missing Dependencies**: Claude CLI not found in PATH
- **File System**: Permission errors, missing directories
- **Network**: API timeouts, connection failures
- **Processing**: Invalid JSON, malformed SSE streams

### Frontend Errors

- **Data Validation**: Invalid or missing data structures
- **Rendering**: Component lifecycle errors
- **Processing**: SSE reconstruction failures
- **Browser**: Compatibility and performance issues

### Error Recovery

All components implement graceful error handling:

- Silent failures during runtime to avoid disrupting Claude Code
- Detailed error messages in development mode
- Fallback behavior for invalid data
- Partial results on processing errors

## Performance Considerations

### Backend Optimization

- **Async I/O**: Non-blocking file operations
- **Memory Efficient**: Streaming for large responses
- **Minimal Overhead**: Negligible impact on Claude Code performance
- **Selective Filtering**: Only log substantial conversations by default

### Frontend Optimization

- **Lazy Loading**: Components render on demand
- **Efficient Updates**: Lit's reactive system minimizes DOM changes
- **Memory Management**: Proper cleanup of event listeners
- **Bundle Size**: Optimized TypeScript compilation

## Security

### Data Protection

- **Header Redaction**: Automatic removal of sensitive tokens
- **Local Storage**: All data remains on local machine
- **No External Requests**: Self-contained HTML reports
- **XSS Prevention**: Proper escaping of user content

### Best Practices

- Never commit logs containing sensitive data
- Use `--no-open` flag in CI/CD environments
- Regularly clean up old log files
- Review generated reports before sharing

## Compatibility

### System Requirements

- **Node.js**: Version 16.0.0 or higher
- **Claude CLI**: Any version with API support
- **Operating Systems**: Windows, macOS, Linux
- **Browsers**: Chrome 70+, Firefox 65+, Safari 12+, Edge 79+

### Integration

- **CI/CD**: Automated report generation
- **IDE Extensions**: VS Code integration potential
- **SDK Compatibility**: Works with any HTTP-based Claude integration
- **Docker**: Container support for consistent environments

## Contributing

### Development Setup

```bash
# Install dependencies
npm install

# Build backend
npm run build

# Build frontend
cd frontend && npm install && npm run build

# Run tests
npm test
```

### API Stability

- **Backend APIs**: Stable, following semantic versioning
- **Frontend Components**: Public properties are stable
- **File Formats**: JSONL format is backwards compatible
- **CLI Interface**: Command-line arguments are stable

For detailed information about specific components, see the individual API documentation files in the backend and frontend directories.
