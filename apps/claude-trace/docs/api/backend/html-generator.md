# HTML Generator API Reference

The HTML Generator module converts JSONL log files into interactive, self-contained HTML reports for visualizing Claude Code API interactions.

## Classes

### `HTMLGenerator`

The main class responsible for generating HTML reports from logged API traffic.

#### Constructor

```typescript
constructor();
```

Creates a new instance of the HTML generator. Automatically determines paths to template and bundle files.

**Example**:

```typescript
const htmlGenerator = new HTMLGenerator();
```

#### Methods

##### `generateHTML()`

```typescript
public async generateHTML(
  pairs: RawPair[],
  outputFile: string,
  options: {
    title?: string;
    timestamp?: string;
    includeAllRequests?: boolean;
  } = {}
): Promise<void>
```

Generates an HTML report from an array of request/response pairs.

**Parameters**:

- `pairs`: Array of RawPair objects to include in the report
- `outputFile`: Path where the HTML file will be written
- `options`: Optional configuration object
   - `title`: Custom title for the report (default: "{count} API Calls")
   - `timestamp`: Custom timestamp to display (default: current time)
   - `includeAllRequests`: Include all requests or filter to substantial conversations (default: false)

**Filtering behavior**:
When `includeAllRequests` is false, the generator:

1. Filters to only `/v1/messages` endpoints
2. Excludes conversations with 2 or fewer messages

**Example**:

```typescript
await htmlGenerator.generateHTML(pairs, "./report.html", {
	title: "My API Session",
	includeAllRequests: true,
});
```

##### `generateHTMLFromJSONL()`

```typescript
public async generateHTMLFromJSONL(
  jsonlFile: string,
  outputFile?: string,
  includeAllRequests: boolean = false
): Promise<string>
```

Generates an HTML report directly from a JSONL log file.

**Parameters**:

- `jsonlFile`: Path to the JSONL file containing logged pairs
- `outputFile`: Optional custom output path (default: replaces .jsonl with .html)
- `includeAllRequests`: Include all requests or filter to substantial conversations

**Returns**: The path to the generated HTML file

**Throws**:

- Error if input file doesn't exist
- Error if no valid data found in file
- Error if template files are missing

**Example**:

```typescript
// Generate with automatic output naming
const outputPath = await htmlGenerator.generateHTMLFromJSONL("./logs/session.jsonl");

// Generate with custom output path
await htmlGenerator.generateHTMLFromJSONL(
	"./logs/session.jsonl",
	"./reports/session-report.html",
	true, // include all requests
);
```

##### `getTemplatePaths()`

```typescript
public getTemplatePaths(): {
  templatePath: string;
  bundlePath: string;
}
```

Returns the paths to template files used for HTML generation.

**Returns**:

- `templatePath`: Path to the HTML template file
- `bundlePath`: Path to the JavaScript bundle file

**Example**:

```typescript
const { templatePath, bundlePath } = htmlGenerator.getTemplatePaths();
console.log(`Template: ${templatePath}`);
console.log(`Bundle: ${bundlePath}`);
```

## Data Types

### `RawPair`

The structure of a logged request/response pair (imported from types.ts).

```typescript
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
	note?: string; // Optional note (e.g., "ORPHANED_REQUEST")
}
```

### `HTMLGenerationData`

Internal data structure passed to the HTML template.

```typescript
interface HTMLGenerationData {
	rawPairs: RawPair[];
	timestamp: string;
	includeAllRequests: boolean;
}
```

### `ClaudeData`

The data structure embedded in the generated HTML.

```typescript
interface ClaudeData {
	rawPairs: RawPair[];
	timestamp: string;
	metadata: {
		includeAllRequests: boolean;
	};
}
```

## HTML Report Features

The generated HTML reports include:

### View Modes

1. **Simple Conversation View**

   - Reconstructed conversation flow
   - Tool call visualization
   - Syntax highlighting for code blocks
   - Token usage statistics

2. **Raw Pairs View**

   - Chronological list of all API calls
   - Request/response details
   - Headers and timing information

3. **JSON View**
   - Debug view showing processed API data
   - Useful for troubleshooting

### Interactive Features

- **Model Filtering**: Filter conversations by AI model
- **Search**: Search within conversations (browser find)
- **Collapsible Sections**: Expand/collapse tool calls and responses
- **Copy Support**: Copy code blocks and responses
- **Mobile Responsive**: Works on all screen sizes

### Self-Contained Design

- No external dependencies required
- All JavaScript and CSS embedded
- Works offline once generated
- Can be shared as a single file

## File Structure

### Template Files

The generator requires two files in the `frontend/` directory:

1. **`template.html`**: HTML template with placeholder markers

   - `__CLAUDE_LOGGER_BUNDLE_REPLACEMENT_UNIQUE_9487__`: JavaScript bundle insertion point
   - `__CLAUDE_LOGGER_DATA_REPLACEMENT_UNIQUE_9487__`: Base64 encoded data
   - `__CLAUDE_LOGGER_TITLE_REPLACEMENT_UNIQUE_9487__`: Page title

2. **`dist/index.global.js`**: Compiled frontend JavaScript bundle

### Output Format

The generated HTML file contains:

- Complete HTML5 document
- Embedded Tailwind CSS
- Embedded JavaScript application
- Base64 encoded conversation data
- No external resource dependencies

## Usage Examples

### Basic HTML Generation

```typescript
import { HTMLGenerator } from "./html-generator";
import { RawPair } from "./types";

const generator = new HTMLGenerator();
const pairs: RawPair[] = [
	/* your logged pairs */
];

await generator.generateHTML(pairs, "./output/report.html");
```

### Batch Processing JSONL Files

```typescript
import { HTMLGenerator } from "./html-generator";
import fs from "fs";
import path from "path";

const generator = new HTMLGenerator();
const logsDir = "./.claude-trace";

// Process all JSONL files
const files = fs.readdirSync(logsDir).filter((f) => f.endsWith(".jsonl"));

for (const file of files) {
	const inputPath = path.join(logsDir, file);
	const outputPath = path.join(logsDir, file.replace(".jsonl", ".html"));

	try {
		await generator.generateHTMLFromJSONL(inputPath, outputPath);
		console.log(`Generated: ${outputPath}`);
	} catch (error) {
		console.error(`Failed to process ${file}:`, error);
	}
}
```

### Custom Report Generation

```typescript
import { HTMLGenerator } from "./html-generator";

const generator = new HTMLGenerator();

// Generate report with custom options
await generator.generateHTMLFromJSONL(
	"./session.jsonl",
	"./reports/detailed-session.html",
	true, // Include all requests, not just substantial conversations
);
```

## Error Handling

The generator throws errors for:

- Missing input files
- Invalid JSONL format
- Missing template files
- File system errors

All errors include descriptive messages for debugging:

```typescript
try {
	await generator.generateHTMLFromJSONL("missing.jsonl");
} catch (error) {
	// Error: File 'missing.jsonl' not found.
}
```

## Performance Considerations

- **Memory Usage**: Loads entire JSONL file into memory
- **Large Files**: May require increased Node.js memory for very large sessions
- **Filtering**: Filtering happens in memory before HTML generation
- **Base64 Encoding**: Data is base64 encoded to avoid escaping issues

## Build Requirements

Before using the HTML generator, ensure the frontend is built:

```bash
cd frontend
npm install
npm run build
```

This creates the required `dist/index.global.js` bundle.

## Security Considerations

- **Header Redaction**: Sensitive headers are already redacted in the input data
- **XSS Prevention**: All user data is properly escaped or base64 encoded
- **No External Resources**: Self-contained design prevents external data leakage
- **Local File Access**: Generated HTML files have no special permissions

## Compatibility

- **Node.js**: Version 16.0.0 or higher
- **Browsers**: Modern browsers with ES6+ support
- **File Size**: No practical limit, but very large reports may be slow to load
- **Operating Systems**: Cross-platform (Windows, macOS, Linux)
