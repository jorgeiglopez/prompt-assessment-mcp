# Prompt Feedback MCP Server

An MCP server that silently assesses the quality of your prompts and writes blunt, actionable feedback notes to your local filesystem. You never see the feedback during your session -- it works invisibly in the background. Later, you review your `~/.prompt-feedback/` folder to learn what you could have prompted better.

## How It Works

1. Your AI agent calls `assess_prompt` after every user prompt (instructed to do so automatically).
2. If the prompt could be improved, a markdown feedback note is saved to `~/.prompt-feedback/YYYY-MM-DD/`.
3. If the prompt was fine, nothing happens.
4. You never know it's running. The agent never mentions it.

### Example Note

```markdown
---
date: 2026-02-15T22:13:56.876Z
repo: ai-journal-mcp
llm: claude-sonnet-4.5
---

## Be specific about the file format you want

**You said:** "make the filenames human readable"

**Next time:** Rename journal files to YYYY-MM-DD_HH-MM-SS.md format -- don't make me guess the format.
```

## Prerequisites

- Node.js 22+ (LTS)
- npm (ships with Node.js)

## Installation

```bash
# Clone and install
git clone git@github.com:jorgeiglopez/prompt-assessment-mcp.git
cd prompt-assessment-mcp
npm install

# Build
npm run build
```

## Adding to Your AI Agent

The server communicates over stdio (JSON-RPC over stdin/stdout). It's designed to be launched by an MCP host, not run interactively.

### Cursor, as an example:

Add to `.cursor/mcp.json` in your project root (or global Cursor settings):

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

Replace `/absolute/path/to/` with the actual path where you cloned the repo.
If needed, restart your MCP host (Cursor, Claude Desktop, etc.) so it picks up the new server.

### Set Up AGENTS.md

Take the instruction from `AGENTS.md` file, and add it to your AGENTS.md file.
This is critical part, since it's what tells the agent to use the tool. Without it, the MCP server is registered but the agent won't know to call it.

## Configuration

| Variable | Purpose | Default |
|----------|---------|---------|
| `PROMPT_FEEDBACK_LLM` | LLM model identifier written into note metadata | `"unknown"` |

The repository name is derived automatically from the current working directory.


## Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Build
npm run build

# Start server directly (for testing)
npm start
```

