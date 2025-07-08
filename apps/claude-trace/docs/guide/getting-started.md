# Getting Started with claude-trace

This guide will walk you through installing and using claude-trace to capture and analyze your Claude Code sessions.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 16 or higher** - [Download from nodejs.org](https://nodejs.org/)
- **Claude Code CLI** - Install with `npm install -g claude-cli`
- **Active Claude subscription** - Required for API access

## Installation

### Global Installation (Recommended)

```bash
npm install -g @mariozechner/claude-trace
```

### Local Installation

```bash
npm install @mariozechner/claude-trace
```

### Using npx (No Installation)

```bash
npx @mariozechner/claude-trace
```

## Your First Recording Session

### Step 1: Start Logging

Open your terminal and navigate to your project directory:

```bash
cd /path/to/your/project
claude-trace
```

This will:

- Launch Claude Code with HTTP interception enabled
- Create a `.claude-trace/` directory in your current folder
- Begin logging all API interactions

### Step 2: Use Claude Code Normally

Interact with Claude Code as you normally would:

- Ask questions about your code
- Request file modifications
- Run debugging sessions
- Use any Claude Code features

**Example session:**

```
You: Help me refactor this function to be more readable
Claude: I'll help you refactor that function. Let me first examine the code...
```

### Step 3: View Your Logs

When you exit Claude Code, you'll find new files in `.claude-trace/`:

```
.claude-trace/
├── log-2024-01-15-14-30-25.jsonl  # Raw HTTP data
└── log-2024-01-15-14-30-25.html   # Interactive report
```

**Open the HTML file** in any browser to view your session:

- Double-click the `.html` file, or
- Drag it into your browser window

## Understanding the Output

### HTML Report Features

The interactive HTML report includes:

1. **Conversation View** (Default)

   - Formatted conversation with syntax highlighting
   - Collapsible tool calls and outputs
   - Model information and token usage

2. **Raw Pairs View**

   - Complete HTTP request/response pairs
   - Headers and timing information
   - Useful for debugging API issues

3. **JSON Debug View**
   - Processed conversation data
   - Internal data structures
   - Development and troubleshooting

### What You'll See

- **System Prompts**: The hidden instructions Claude receives
- **Tool Definitions**: Available commands and their parameters
- **Tool Outputs**: Raw results from file operations, searches, etc.
- **Thinking Blocks**: Claude's internal reasoning (when available)
- **Token Usage**: Detailed breakdown including cache statistics

### Example Tool Call

```json
{
	"name": "str_replace_editor",
	"input": {
		"command": "view",
		"path": "/path/to/file.js"
	}
}
```

**Output:**

```javascript
function calculateTotal(items) {
	return items.reduce((sum, item) => sum + item.price, 0);
}
```

## Common Usage Patterns

### Include All Requests

By default, claude-trace only logs substantial conversations. To capture everything:

```bash
claude-trace --include-all-requests
```

This captures:

- Single-message requests
- Authentication calls
- All API endpoints

### Run with Specific Claude Options

Pass arguments directly to Claude Code:

```bash
claude-trace --run-with chat --model sonnet-3.5
```

### Generate Reports from Existing Logs

Create HTML reports from previously saved `.jsonl` files:

```bash
claude-trace --generate-html log-2024-01-15-14-30-25.jsonl my-report.html
```

## File Structure

After using claude-trace, your project will have:

```
your-project/
├── .claude-trace/
│   ├── log-2024-01-15-14-30-25.jsonl  # Raw API data
│   ├── log-2024-01-15-14-30-25.html   # Interactive report
│   └── summary-2024-01-15.json        # AI-generated summaries (if using --index)
├── src/
│   └── your-code.js
└── package.json
```

## Tips for Effective Logging

### 1. Use Descriptive Session Names

Start each session with a clear goal:

```
You: I want to add user authentication to my Express app
```

### 2. Keep Sessions Focused

Separate different tasks into different sessions for clearer logs.

### 3. Review Tool Outputs

Pay attention to tool calls and their outputs - they reveal how Claude understands your codebase.

### 4. Use Filtering

For debugging specific issues, use `--include-all-requests` to capture all traffic.

## Next Steps

Now that you have basic logging working:

1. **Explore Advanced Features**: Learn about conversation indexing and batch processing
2. **Customize Reports**: Modify the frontend components for your needs
3. **Integrate with Workflows**: Add claude-trace to your development scripts

## Troubleshooting

### No Logs Generated

1. Verify Claude Code is installed: `claude --version`
2. Check permissions on `.claude-trace/` directory
3. Ensure you're making substantial API requests (>2 messages by default)

### HTML Report Won't Open

1. Try a different browser
2. Check for JavaScript errors in browser console
3. Ensure file isn't corrupted (check `.jsonl` file exists)

### Performance Issues

1. Use default filtering (avoid `--include-all-requests` for normal use)
2. Clear old logs periodically
3. Check available disk space

For more troubleshooting help, see the [main README](../../README.md#troubleshooting) or [open an issue](https://github.com/mariozechner/claude-trace/issues).
