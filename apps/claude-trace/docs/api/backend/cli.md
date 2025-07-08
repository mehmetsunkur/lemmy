# CLI API Reference

The `claude-trace` command-line interface provides multiple modes of operation for capturing, analyzing, and visualizing Claude Code interactions.

## Synopsis

```bash
claude-trace [OPTIONS] [--run-with CLAUDE_ARG...]
```

## Options

### `--extract-token`

Extract OAuth token from Claude Code and exit. This replaces the functionality of the Python-based `claude-token.py` script.

**Output**: Prints the OAuth token to stdout  
**Exit codes**:

- `0`: Token successfully extracted
- `1`: Error or token not found

**Example**:

```bash
export ANTHROPIC_API_KEY=$(claude-trace --extract-token)
```

### `--generate-html`

Generate an HTML report from a JSONL log file.

**Arguments**:

- `input.jsonl` (required): Path to the JSONL log file
- `output.html` (optional): Custom output filename. If not specified, generates a timestamped filename

**Flags**:

- `--no-open`: Don't automatically open the generated HTML file in browser (default: opens automatically)
- `--include-all-requests`: Include all captured requests in the report (default: only substantial conversations)

**Examples**:

```bash
# Generate HTML and open in browser
claude-trace --generate-html logs/traffic.jsonl

# Generate with custom output name
claude-trace --generate-html logs/traffic.jsonl report.html

# Generate without opening browser
claude-trace --generate-html logs/traffic.jsonl --no-open
```

### `--index`

Generate AI-powered conversation summaries and an index for all logs in the `.claude-trace/` directory.

**Output**: Creates an `index.html` file in `.claude-trace/` with searchable summaries of all conversations

**Example**:

```bash
claude-trace --index
```

### `--run-with`

Pass all following arguments to the Claude process. Everything after `--run-with` is forwarded to Claude Code.

**Examples**:

```bash
# Run Claude chat mode
claude-trace --run-with chat

# Run Claude with specific model
claude-trace --run-with chat --model sonnet-3.5

# Pass multiple arguments
claude-trace --run-with --model gpt-4o --temperature 0.7
```

### `--include-all-requests`

Include all HTTP requests in the captured logs, not just substantial conversations. By default, only requests to `/v1/messages` with more than 2 messages in the context are logged.

**Example**:

```bash
claude-trace --include-all-requests
```

### `--no-open`

When used with `--generate-html`, prevents automatically opening the generated HTML file in the default browser.

**Example**:

```bash
claude-trace --generate-html file.jsonl --no-open
```

### `--help`, `-h`

Display help information and exit.

## Modes of Operation

### 1. Interactive Logging Mode (Default)

When run without special flags, claude-trace starts Claude Code with traffic interception enabled.

**Behavior**:

- Launches Claude Code with injected interceptor
- Logs all API traffic to `.claude-trace/log-YYYY-MM-DD-HH-MM-SS.jsonl`
- Automatically generates HTML report on exit
- Opens HTML report in browser (unless `--no-open` is specified)

**Environment Variables Set**:

- `NODE_OPTIONS="--no-deprecation"`
- `CLAUDE_TRACE_INCLUDE_ALL_REQUESTS`: Set based on `--include-all-requests` flag
- `CLAUDE_TRACE_OPEN_BROWSER`: Set based on `--no-open` flag

**Example**:

```bash
# Start Claude with logging
claude-trace

# Start Claude with specific command
claude-trace --run-with chat
```

### 2. Token Extraction Mode

Extracts the OAuth token used by Claude Code for API authentication.

**Process**:

1. Launches Claude Code with token interceptor
2. Captures the first authorization header
3. Writes token to `.claude-trace/token.txt`
4. Outputs token to stdout and exits
5. Timeout after 30 seconds if no token found

**Example**:

```bash
# Extract token for use with Anthropic SDK
export ANTHROPIC_API_KEY=$(claude-trace --extract-token)
```

### 3. HTML Generation Mode

Converts JSONL log files into interactive HTML reports.

**Features**:

- Self-contained HTML (no external dependencies)
- Three view modes: Conversation, Raw Pairs, JSON Debug
- Syntax highlighting for code blocks
- Tool call visualization
- Token usage statistics

**Output Location**:

- If output file specified: Uses provided path
- If not specified: Generates `.claude-trace/log-YYYY-MM-DD-HH-MM-SS.html`

**Example**:

```bash
# Generate report with automatic naming
claude-trace --generate-html logs/traffic.jsonl

# Generate with custom name
claude-trace --generate-html logs/traffic.jsonl my-report.html
```

### 4. Index Generation Mode

Creates an AI-powered index of all conversations in the `.claude-trace/` directory.

**Process**:

1. Scans all `.jsonl` files in `.claude-trace/`
2. Generates summaries using Claude API
3. Creates searchable `index.html` with all conversations
4. Groups conversations by date

**Requirements**:

- Valid `ANTHROPIC_API_KEY` environment variable
- At least one `.jsonl` file in `.claude-trace/`

**Example**:

```bash
claude-trace --index
```

## Output Files

All output files are saved to the `.claude-trace/` directory in the current working directory.

### JSONL Log Files

**Format**: `log-YYYY-MM-DD-HH-MM-SS.jsonl`  
**Content**: Line-delimited JSON with request/response pairs and metadata

### HTML Reports

**Format**: `log-YYYY-MM-DD-HH-MM-SS.html`  
**Content**: Self-contained HTML report with embedded JavaScript and CSS

### Index File

**Format**: `index.html`  
**Content**: Searchable index of all conversations with AI-generated summaries

## Exit Codes

- `0`: Successful execution
- `1`: Error occurred (see error message for details)

## Signal Handling

The CLI properly handles SIGINT (Ctrl+C) and SIGTERM signals:

- Gracefully shuts down the Claude process
- Ensures log files are properly closed
- Generates HTML report before exiting (in interactive mode)

## Error Handling

Common errors and their solutions:

### Claude CLI not found

**Error**: `❌ Claude CLI not found in PATH`  
**Solution**: Install Claude Code CLI first using official installation instructions

### Interceptor loader not found

**Error**: `❌ Interceptor loader not found at: [path]`  
**Solution**: Ensure claude-trace is properly installed via npm

### Missing input file

**Error**: `❌ Missing input file for --generate-html`  
**Solution**: Provide path to JSONL file as argument

### Token extraction timeout

**Error**: `❌ Timeout: No token found within 30 seconds`  
**Solution**: Ensure Claude Code can start properly and check for any authentication issues

## Migration from Python Scripts

This CLI replaces the Python-based `claude-logger` and `claude-token.py` scripts with a pure Node.js implementation. All output formats remain compatible, ensuring smooth migration.
