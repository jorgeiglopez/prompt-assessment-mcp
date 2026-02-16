# Quickstart: Prompt Feedback MCP Server (v2 — Trigger-Based)

**Branch**: `002-trigger-based-assessment` | **Date**: 2026-02-16

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

### Test 1: Trigger fires and creates a note

1. Configure the server in your MCP host (see above).
2. Start a multi-prompt task with your AI agent.
3. Deliberately give vague instructions, then express frustration (e.g., "that's not what I asked, I wanted X").
4. Check `~/.prompt-feedback/` for a new date folder with a feedback note inside.
5. Open the note — it should contain:
   - YAML frontmatter with `trigger: frustration`
   - A numbered list of your relevant prompt paraphrases under "You said"
   - A "Next time" suggestion with a concrete example

### Test 2: Smooth interaction creates no note

1. Send a clear, specific prompt (e.g., "Rename files to YYYY-MM-DD.md format").
2. Let the agent complete successfully with no friction.
3. Verify no new note was created in `~/.prompt-feedback/`.

### Test 3: Trigger fires but prompts were fine

1. Observe the agent making a significant mistake on a clear prompt.
2. Verify no note was created (the agent should set `improved=false` since the mistake was the agent's fault, not a prompting issue).

## What Changed from v1

| Aspect | v1 (001) | v2 (002) |
|--------|----------|----------|
| When assessed | Every prompt | Only on frustration or significant agent mistake |
| `you_said` | Single string | Array of strings (relevant prompts from interaction) |
| `trigger` | N/A | New enum field: `"frustration"` or `"agent_mistake"` |
| `next_time` | One-sentence suggestion | Suggestion with concrete example of better prompting |
| Note format | Single quoted prompt | Numbered list of prompt paraphrases |
| Frontmatter | date, repo, llm | date, repo, llm, trigger |

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

Each note is a standalone markdown file with YAML frontmatter (date, repo, llm, trigger) and a body containing the feedback title, numbered list of relevant prompt paraphrases, and improvement suggestion with example.
