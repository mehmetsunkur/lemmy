# Frontend Components API Reference

The claude-trace frontend is built with Lit Element and provides an interactive interface for viewing and analyzing Claude API traffic. This document covers all frontend components and their APIs.

## Main Application Component

### `ClaudeApp`

The root component that orchestrates the entire frontend application.

#### Properties

```typescript
@state() private data: ClaudeData | null = null;
@state() private conversations: SimpleConversation[] = [];
@state() private processedPairs: ProcessedPair[] = [];
@state() private currentView: string = "conversations";
@state() private selectedModels: Set<string> = new Set();
```

#### Methods

##### `connectedCallback()`

```typescript
connectedCallback(): void
```

Lifecycle method called when component is connected to the DOM. Initializes data processing from `window.claudeData`.

**Process**:

1. Loads data from global `window.claudeData`
2. Processes raw pairs into typed objects
3. Filters orphaned requests
4. Merges conversations using SharedConversationProcessor
5. Initializes model filtering

##### `processData()`

```typescript
private processData(): void
```

Core data processing method that transforms raw API data into displayable format.

**Transforms**:

- Raw pairs → `RawPairData` objects
- Filters orphaned requests (no response)
- Processes pairs through utility functions
- Merges into conversation threads
- Extracts unique models for filtering

##### `switchView()`

```typescript
private switchView(view: string): void
```

Switches between different view modes.

**Parameters**:

- `view`: Target view ("conversations", "raw", "json")

**Example**:

```typescript
app.switchView("conversations");
```

##### `toggleModel()`

```typescript
private toggleModel(model: string): void
```

Toggles model filter for displaying specific AI models.

**Parameters**:

- `model`: Model name to toggle

**Example**:

```typescript
app.toggleModel("claude-3-5-sonnet-20241022");
```

#### Data Flow

```
window.claudeData → processData() → View Components → Rendered HTML
```

## View Components

### `SimpleConversationView`

Displays processed conversations with tool visualization and interactive features.

#### Properties

```typescript
@property({ type: Array }) conversations: SimpleConversation[] = [];
@property({ type: Set }) selectedModels: Set<string> = new Set();
```

#### Features

- **Message Threading**: Groups related messages and tool calls
- **Tool Visualization**: Shows tool usage with input/output display
- **Content Expansion**: Collapsible sections for better navigation
- **Diff Visualization**: Highlights code changes using diff library
- **Token Statistics**: Displays usage metrics per conversation

#### Usage

```typescript
html`
	<simple-conversation-view .conversations="${filteredConversations}" .selectedModels="${selectedModels}">
	</simple-conversation-view>
`;
```

### `RawPairsView`

Shows raw HTTP request/response pairs with full API details.

#### Properties

```typescript
@property({ type: Array }) pairs: ProcessedPair[] = [];
@property({ type: Set }) selectedModels: Set<string> = new Set();
```

#### Features

- **Request/Response Details**: Full HTTP information display
- **JSON Formatting**: Syntax-highlighted JSON content
- **Header Information**: Complete request/response headers
- **Status Codes**: HTTP status and error information
- **Expandable Content**: Collapsible JSON sections

#### Usage

```typescript
html` <raw-pairs-view .pairs="${filteredPairs}" .selectedModels="${selectedModels}"> </raw-pairs-view> `;
```

### `JsonView`

Debug view for processed API data with formatted JSON display.

#### Properties

```typescript
@property({ type: Object }) data: any = null;
```

#### Features

- **Formatted JSON**: Syntax-highlighted JSON output
- **Debug Information**: Raw data inspection
- **Error Troubleshooting**: Useful for development
- **Copy Support**: Easy copying of JSON content

#### Usage

```typescript
html` <json-view .data="${processedData}"></json-view> `;
```

## Data Processing Pipeline

### Core Processing Functions

#### `processRawPairs()`

```typescript
export function processRawPairs(pairs: RawPairData[]): ProcessedPair[];
```

Converts raw mitmproxy data into typed ProcessedPair objects.

**Parameters**:

- `pairs`: Array of raw request/response pairs

**Returns**: Array of processed pairs with typed content

**Features**:

- Handles both streaming and non-streaming responses
- Reconstructs messages from SSE streams
- Maintains type safety with Anthropic SDK types
- Processes JSON accumulation for tool inputs

**Example**:

```typescript
const processedPairs = processRawPairs(rawData.rawPairs);
```

#### `reconstructMessageFromSSE()`

```typescript
export function reconstructMessageFromSSE(sseContent: string, requestBody: any): EnhancedMessageParam | null;
```

Rebuilds complete messages from Server-Sent Events streams.

**Parameters**:

- `sseContent`: Raw SSE stream content
- `requestBody`: Original request body for context

**Returns**: Reconstructed message or null if invalid

**Features**:

- Parses SSE events into structured format
- Handles text, tool_use, and thinking block deltas
- Accumulates JSON for tool inputs
- Maintains message structure integrity

#### `parseSSEEvents()`

```typescript
export function parseSSEEvents(sseContent: string): SSEEvent[];
```

Parses SSE streams into individual event objects.

**Parameters**:

- `sseContent`: Raw SSE stream as string

**Returns**: Array of parsed SSE events

**Event Types**:

- `message_start`: Conversation initialization
- `content_block_start`: Content block creation
- `content_block_delta`: Incremental content updates
- `content_block_stop`: Content block completion
- `message_stop`: Message completion

## Utility Functions

### Markdown Processing

#### `markdownToHtml()`

```typescript
export function markdownToHtml(markdown: string): string;
```

Converts markdown content to HTML with XSS protection.

**Parameters**:

- `markdown`: Markdown content string

**Returns**: Safe HTML string

**Features**:

- GitHub Flavored Markdown support
- XSS prevention through HTML escaping
- Graceful fallback to plain text
- Error handling for malformed markdown

**Example**:

```typescript
const html = markdownToHtml("# Hello\n\nThis is **bold** text");
```

## Component Styling

### Theme Integration

The frontend uses VS Code theme variables for consistent styling:

```css
:root {
	--vscode-editor-background: #1e1e1e;
	--vscode-editor-foreground: #d4d4d4;
	--vscode-button-background: #0e639c;
	--vscode-button-foreground: #ffffff;
}
```

### Tailwind CSS

All components use Tailwind CSS classes for styling:

- **Responsive Design**: Mobile-first approach
- **Dark Theme**: VS Code-inspired color scheme
- **Utility Classes**: Efficient styling with minimal CSS
- **Component Classes**: Reusable styling patterns

## Build Configuration

### Development Server

```bash
npm run dev
```

**Features**:

- Live reload via browser-sync
- Concurrent CSS/JS watching
- Hot module replacement
- Auto-refresh on file changes

### Production Build

```bash
npm run build
```

**Output**:

- `dist/styles.css`: Compiled Tailwind CSS
- `dist/index.global.js`: Bundled TypeScript application
- Self-contained HTML reports

## Data Types

### `ClaudeData`

Root data structure passed to the frontend.

```typescript
interface ClaudeData {
	rawPairs: RawPairData[];
	timestamp: string;
	metadata: {
		includeAllRequests: boolean;
	};
}
```

### `RawPairData`

Typed representation of raw API request/response pairs.

```typescript
interface RawPairData {
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
	note?: string;
}
```

### `ProcessedPair`

Enhanced pair with processed content and metadata.

```typescript
interface ProcessedPair {
	id: string;
	request: any;
	response: any;
	reconstructed_message?: EnhancedMessageParam;
	model?: string;
	timestamp: number;
	status_code: number;
	note?: string;
}
```

### `SimpleConversation`

Merged conversation thread with messages and metadata.

```typescript
interface SimpleConversation {
	id: string;
	messages: EnhancedMessageParam[];
	system?: string | TextBlockParam[];
	compacted: boolean;
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

### Component Error Boundaries

All components include error handling:

- Graceful fallbacks for missing data
- Error messages for invalid content
- Console logging for debugging
- Partial rendering on errors

### Data Validation

- Type checking for all inputs
- Null/undefined guards
- Array bounds checking
- JSON parsing error handling

## Performance Optimizations

### Efficient Rendering

- Lit's reactive updates minimize DOM changes
- Conditional rendering based on view state
- Lazy loading of heavy content
- Efficient list rendering with keys

### Memory Management

- Proper cleanup of event listeners
- Efficient data structures
- Minimal DOM manipulation
- Strategic component updates

## Browser Compatibility

### Supported Browsers

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

### Polyfills

- ES6 features via tsup transpilation
- Web Components support
- Promise-based APIs
- Modern JavaScript features

## Testing

### Development Testing

```bash
npm run dev
```

**Manual Testing**:

- Multiple conversation scenarios
- Different API response types
- Model filtering functionality
- View switching behavior

### Production Testing

```bash
npm run build
npm run preview
```

**Validation**:

- Bundle size optimization
- CSS compilation
- Template generation
- Cross-browser compatibility
