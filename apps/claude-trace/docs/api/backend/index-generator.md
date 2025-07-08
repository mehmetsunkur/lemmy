# Index Generator API Reference

The Index Generator module creates AI-powered conversation summaries and searchable indexes from all logged conversations in the `.claude-trace/` directory.

## Classes

### `IndexGenerator`

The main class responsible for generating conversation indexes with AI-powered summaries.

#### Constructor

```typescript
constructor();
```

Creates a new instance of the index generator. Initializes internal dependencies including HTML generator and conversation processor.

**Example**:

```typescript
const indexGenerator = new IndexGenerator();
```

#### Methods

##### `generateIndex()`

```typescript
async generateIndex(): Promise<void>
```

Generates a comprehensive index of all conversations in the `.claude-trace/` directory. This is the main entry point for the indexing process.

**Process**:

1. Scans for all JSONL log files in `.claude-trace/`
2. Processes each log file to extract conversations
3. Generates AI-powered summaries for substantial conversations
4. Creates a searchable HTML index with all conversations
5. Caches summaries to avoid regeneration

**Requirements**:

- Valid `claude` CLI must be available in PATH
- At least one JSONL file in `.claude-trace/` directory
- Claude CLI must have access to an API key

**Output**:

- Individual summary files: `summary-YYYY-MM-DD-HH-MM-SS.json`
- Master index file: `index.html`

**Example**:

```typescript
await indexGenerator.generateIndex();
```

**Console Output**:

```
🔄 Generating conversation index...
📁 Looking in: .claude-trace/
📋 Found 3 log files
🔄 Processing log-2024-01-15-10-30-45.jsonl...
  💬 Found 2 non-compacted conversations (>2 messages)
    🤖 Summarizing conversation conv_1...
    📞 Calling Claude CLI for summarization...
    💰 This will incur additional token usage
  ✅ Summary saved: summary-2024-01-15-10-30-45.json
✅ Index generated: .claude-trace/index.html
```

## Data Types

### `ConversationSummary`

Represents a summarized conversation with metadata.

```typescript
interface ConversationSummary {
	id: string; // Unique conversation identifier
	title: string; // AI-generated title (max 10 words)
	summary: string; // AI-generated summary (1-3 paragraphs)
	startTime: string; // ISO timestamp of conversation start
	messageCount: number; // Total number of messages
	models: string[]; // List of AI models used
}
```

### `LogSummary`

Represents a complete log file with all its conversation summaries.

```typescript
interface LogSummary {
	logFile: string; // Original JSONL filename
	htmlFile: string; // Corresponding HTML filename
	generated: string; // ISO timestamp of summary generation
	conversations: ConversationSummary[]; // Array of conversation summaries
}
```

## Private Methods

### `findLogFiles()`

```typescript
private findLogFiles(): string[]
```

Scans the `.claude-trace/` directory for log files matching the pattern `log-YYYY-MM-DD-HH-MM-SS.jsonl`.

**Returns**: Array of log filenames sorted by date (newest first)

### `processLogFile()`

```typescript
private async processLogFile(logFile: string): Promise<LogSummary | null>
```

Processes a single log file to extract and summarize conversations.

**Logic**:

1. Checks if summary file exists and is up-to-date
2. If needed, regenerates HTML file from JSONL
3. Extracts conversations using SharedConversationProcessor
4. Filters to non-compacted conversations with >2 messages
5. Generates AI summaries for each conversation
6. Saves summary data to JSON file

**Parameters**:

- `logFile`: Name of the JSONL file to process

**Returns**: LogSummary object or null if processing fails

### `extractConversations()`

```typescript
private async extractConversations(logPath: string): Promise<SimpleConversation[]>
```

Extracts structured conversations from a JSONL log file.

**Process**:

1. Reads and parses JSONL file
2. Processes raw pairs using SharedConversationProcessor
3. Merges related API calls into conversation threads

**Parameters**:

- `logPath`: Full path to the JSONL file

**Returns**: Array of SimpleConversation objects

### `summarizeConversation()`

```typescript
private async summarizeConversation(conversation: SimpleConversation): Promise<ConversationSummary | null>
```

Generates AI-powered summary for a single conversation.

**Process**:

1. Converts conversation to text format
2. Calls Claude CLI with summarization prompt
3. Parses response to extract title and summary
4. Returns structured ConversationSummary object

**Parameters**:

- `conversation`: SimpleConversation object to summarize

**Returns**: ConversationSummary object or null if summarization fails

**AI Prompt Format**:

```
Please analyze this conversation and provide:
1. A concise title (max 10 words)
2. A summary in 1-3 paragraphs describing what was accomplished

Conversation:
[conversation text]

Format your response as:
TITLE: [title]
SUMMARY: [summary]
```

### `conversationToText()`

```typescript
private conversationToText(conversation: SimpleConversation): string
```

Converts a structured conversation to readable text format for AI summarization.

**Features**:

- Includes system prompt (truncated to 500 chars)
- Includes all messages (truncated to 1000 chars each)
- Filters out tool results to focus on main content
- Handles both string and array message content

**Parameters**:

- `conversation`: SimpleConversation to convert

**Returns**: Plain text representation of the conversation

### `callClaude()`

```typescript
private async callClaude(prompt: string): Promise<string>
```

Calls the Claude CLI to generate AI summaries.

**Process**:

1. Spawns `claude` process with prompt
2. Captures stdout and stderr
3. Returns response text on success
4. Throws error on failure

**Parameters**:

- `prompt`: Text prompt to send to Claude

**Returns**: Claude's response text

**Error Handling**:

- Throws if Claude CLI is not found
- Throws if Claude CLI exits with non-zero code
- Includes stderr output in error messages

### `generateIndexHTML()`

```typescript
private async generateIndexHTML(summaries: LogSummary[]): Promise<void>
```

Generates the final HTML index file with all conversation summaries.

**Features**:

- Responsive design with embedded CSS
- Chronological organization by log file
- Clickable links to individual HTML reports
- Model tags for each conversation
- Conversation metadata display

**Parameters**:

- `summaries`: Array of LogSummary objects to include

**Output**: Creates `index.html` in `.claude-trace/` directory

## Usage Examples

### Basic Index Generation

```typescript
import { IndexGenerator } from "./index-generator";

const indexGenerator = new IndexGenerator();
await indexGenerator.generateIndex();
```

### Programmatic Usage

```typescript
import { IndexGenerator } from "./index-generator";

const indexGenerator = new IndexGenerator();

try {
	await indexGenerator.generateIndex();
	console.log("Index generated successfully");
} catch (error) {
	console.error("Failed to generate index:", error);
}
```

### Custom Directory (Future Enhancement)

```typescript
// Note: Currently hardcoded to .claude-trace
// Future enhancement could accept custom directory
const indexGenerator = new IndexGenerator();
// indexGenerator.setTraceDirectory('./custom-logs');
await indexGenerator.generateIndex();
```

## File Structure

### Input Files

- **JSONL logs**: `log-YYYY-MM-DD-HH-MM-SS.jsonl`
- **HTML reports**: `log-YYYY-MM-DD-HH-MM-SS.html` (generated if missing)

### Output Files

- **Summary cache**: `summary-YYYY-MM-DD-HH-MM-SS.json`
- **Master index**: `index.html`

### Summary Cache Format

```json
{
	"logFile": "log-2024-01-15-10-30-45.jsonl",
	"htmlFile": "log-2024-01-15-10-30-45.html",
	"generated": "2024-01-15T10:35:12.345Z",
	"conversations": [
		{
			"id": "conv_1",
			"title": "React Component Debugging Session",
			"summary": "User encountered rendering issues with a React component...",
			"startTime": "2024-01-15T10:30:45.123Z",
			"messageCount": 15,
			"models": ["claude-3-5-sonnet-20241022"]
		}
	]
}
```

## Performance Considerations

### Caching Strategy

- **Summary files**: Cached to avoid regenerating expensive AI summaries
- **Timestamp comparison**: Only regenerates if JSONL is newer than summary
- **HTML generation**: Only generates if HTML file is missing

### AI Usage Optimization

- **Filtering**: Only summarizes conversations with >2 messages
- **Content truncation**: Limits conversation text to reduce token usage
- **Batch processing**: Processes multiple conversations in sequence

### Memory Usage

- **Streaming**: Processes files individually to minimize memory footprint
- **Cleanup**: Releases conversation data after processing each file

## Error Handling

### Common Errors

1. **Missing Claude CLI**:

   ```
   Failed to spawn claude CLI: spawn claude ENOENT
   ```

   **Solution**: Install Claude CLI and ensure it's in PATH

2. **API Key Issues**:

   ```
   Claude CLI exited with code 1: Authentication failed
   ```

   **Solution**: Set up valid API key for Claude CLI

3. **No Log Files**:
   ```
   ❌ No log files found
   ```
   **Solution**: Run claude-trace sessions to generate logs first

### Resilient Design

- **Partial failures**: Continues processing if individual conversations fail
- **Graceful degradation**: Skips problematic conversations rather than failing entirely
- **Detailed logging**: Provides specific error messages for debugging

## Cost Considerations

### AI Usage Warning

The index generator makes API calls to Claude for summarization:

- Each conversation generates ~1-2 API calls
- Token usage depends on conversation length
- Large log files can result in significant API costs

### Optimization Tips

1. **Filter conversations**: Only substantial conversations (>2 messages) are summarized
2. **Content truncation**: Conversation text is limited to reduce token usage
3. **Caching**: Summaries are cached to avoid regeneration
4. **Batch processing**: Consider processing in smaller batches for cost control

## Future Enhancements

### Planned Features

1. **Custom directories**: Support for non-default log directories
2. **Batch size control**: Limit number of conversations processed at once
3. **Cost estimation**: Preview token usage before processing
4. **Enhanced filtering**: More sophisticated conversation filtering options
5. **Search functionality**: Full-text search in the generated index
