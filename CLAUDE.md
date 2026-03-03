# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
npm run build          # Compile TypeScript → dist/
npm test               # Run all tests (vitest run)
npm run test:watch     # Watch mode
npm start              # Start MCP server (node dist/index.js)
```

Run a single test file: `npx vitest run tests/unit/writer.test.ts`
Run tests matching a name: `npx vitest run -t "should format note"`

## Architecture

This is an MCP (Model Context Protocol) server that silently assesses prompt quality and writes feedback notes to `~/.prompt-feedback/`. It uses trigger-based assessment — only evaluating when user frustration or significant agent mistakes are detected.

**Four source modules in `src/`:**

- **index.ts** — MCP server setup. Registers the `assess_prompt` tool with a Zod schema, connects via `StdioServerTransport` (JSON-RPC over stdin/stdout).
- **assess.ts** — Tool handler. When `improved=false`, returns immediately with no side effects. When `improved=true`, validates required fields (`trigger`, `title`, `you_said`, `next_time`) and calls `writeNote()`. All filesystem errors are silently swallowed (FR-013).
- **writer.ts** — Formats notes as YAML frontmatter + markdown body. Writes to `~/.prompt-feedback/YYYY-MM-DD/` with millisecond-precision filenames. Handles collisions by appending a 3-char random suffix.
- **config.ts** — Resolves `storagePath` (`$HOME/.prompt-feedback/`), `llmModel` (from `PROMPT_FEEDBACK_LLM` env var), and `repoName` (from `basename(cwd())`). Never throws — returns `"unknown"` as fallback.

**Data flow:** MCP host → `index.ts` (tool dispatch) → `assess.ts` (validation) → `writer.ts` (format + persist) → `config.ts` (paths/metadata)

## Key Design Constraints

- **Silent operation**: No user-facing output, no acknowledgments, no exceptions surfaced. The agent must never mention it is assessing prompts.
- **Trigger-only**: Only assess on frustration or significant agent mistakes — never on smooth interactions.
- **`you_said` is `string[]`**: Captures multiple relevant prompts from the interaction sequence, rendered as a numbered list.
- **Conditional validation**: Fields `trigger`, `title`, `you_said`, `next_time` are only required when `improved=true`.
- **Error silencing (FR-013)**: `handleAssessPrompt` catches and swallows all filesystem errors so the agent continues unaffected.

## Test Structure

Tests use Vitest. Four suites (33 tests total):
- `tests/unit/assess.test.ts` — Parameter validation, error silencing, `improved=false` no-op behavior
- `tests/unit/writer.test.ts` — Note formatting, filename generation, collision fallback, directory organization
- `tests/unit/config.test.ts` — Config resolution, env var handling, fallback values
- `tests/integration/server.test.ts` — MCP server startup, tool registration, schema validation, tool invocation

## Tech Stack

- TypeScript (strict mode, ES2023 target, Node16 modules)
- Node.js >= 22
- `@modelcontextprotocol/sdk` as the sole production dependency
- Vitest for testing
