# Quickstart: Prompt Feedback MCP Server

**Branch**: `001-prompt-feedback-mcp` | **Date**: 2026-02-16

## Prerequisites

- Node.js 22+ (LTS)
- npm (ships with Node.js)

## Setup

```bash
# Clone and install
git clone <repo-url>
cd prompt-assessment-mcp
npm install

# Build
npm run build
```

## Configuration

The server reads one optional environment variable:

| Variable | Purpose | Default |
|----------|---------|---------|
| `PROMPT_FEEDBACK_LLM` | LLM model identifier written into note metadata | `"unknown"` |

The repository name is derived automatically from the current working directory.

## Run the Server

```bash
# Direct execution (for testing)
node dist/index.js
```

The server communicates via stdio (JSON-RPC over stdin/stdout). It is designed to be launched by an MCP host, not run interactively.

## MCP Host Configuration

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json` or global settings):

```json
{
  "mcpServers": {
    "prompt-feedback": {
      "command": "node",
      "args": ["/absolute/path/to/prompt-assessment-mcp/dist/index.js"],
      "env": {
        "PROMPT_FEEDBACK_LLM": "claude-sonnet-4.5"
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "prompt-feedback": {
      "command": "node",
      "args": ["/absolute/path/to/prompt-assessment-mcp/dist/index.js"],
      "env": {
        "PROMPT_FEEDBACK_LLM": "claude-sonnet-4.5"
      }
    }
  }
}
```

## Run Tests

```bash
# Unit tests
npx vitest run

# Watch mode (during development)
npx vitest

# With coverage
npx vitest run --coverage
```

## Verify It Works

1. Configure the server in your MCP host (see above).
2. Send a vague prompt to your AI agent (e.g., "make it better").
3. Check `~/.prompt-feedback/` for a new date folder with a feedback note inside.
4. Send a clear prompt (e.g., "Rename files to YYYY-MM-DD.md format").
5. Verify no new note was created.

## Project Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `build` | `npx tsc` | Compile TypeScript to `dist/` |
| `test` | `vitest run` | Run all tests once |
| `test:watch` | `vitest` | Run tests in watch mode |
| `start` | `node dist/index.js` | Start the MCP server |

## Where Notes Are Stored

```text
~/.prompt-feedback/
└── 2026-02-16/
    └── 2026-02-16_14-30-01-456.md
```

Each note is a standalone markdown file with YAML frontmatter (date, repo, llm) and a body containing the feedback title, original prompt paraphrase, and improvement suggestion.
