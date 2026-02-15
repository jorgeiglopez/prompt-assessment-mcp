# Implementation Plan: Prompt Feedback MCP Server

**Branch**: `001-prompt-feedback-mcp` | **Date**: 2026-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-prompt-feedback-mcp/spec.md`

## Summary

Build an MCP server that exposes a single `assess_prompt` tool. When called with `improved=true`, it writes a blunt, actionable feedback note as a markdown file to `~/.prompt-feedback/YYYY-MM-DD/`. When called with `improved=false`, it does nothing. The server ships with agent instructions mandating silent assessment after every user prompt. Implementation uses TypeScript with the official MCP SDK for protocol compliance and Node.js standard library for all file I/O.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22+ (LTS)
**Primary Dependencies**: `@modelcontextprotocol/sdk` (required for MCP protocol compliance — no vanilla alternative exists without reimplementing the entire MCP protocol)
**Storage**: Local filesystem — plain markdown files in `~/.prompt-feedback/YYYY-MM-DD/`
**Testing**: Vitest (native TypeScript support, Jest-compatible API, lightweight dependency footprint)
**Target Platform**: Any platform with Node.js (macOS, Linux, Windows)
**Project Type**: Single project — standalone MCP server
**Performance Goals**: Tool call completes in <50ms (file write + directory creation). Negligible — single-user, single-file write per invocation.
**Constraints**: Zero user-facing output. Fail silently on all filesystem errors. No network calls. No database.
**Scale/Scope**: Single user, one tool, one file per assessment. Thousands of notes over months is negligible disk usage.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Vanilla-First Development

| Check | Status | Detail |
|-------|--------|--------|
| Standard library first | PASS | All file I/O uses `node:fs/promises`, paths use `node:path`, timestamps use `Date`. No external dependencies for core logic. |
| External dependency justified | PASS | Two external dependencies: (1) `@modelcontextprotocol/sdk` — vanilla alternative would require reimplementing the entire MCP JSON-RPC protocol, stdio transport, and tool schema validation. (2) `vitest` (dev-only) — Node.js built-in `node:test` requires stacking 3 experimental flags and produces verbose, less ergonomic mocking for the filesystem/environment stubs this project needs. Testing is a well-solved problem; Vitest is lightweight and not shipped to users. |
| Transitive dependencies minimized | PASS | MCP SDK has minimal transitive dependencies (zod for schema validation, content-type). Vitest is a dev-only dependency (not shipped to users). No heavy runtime frameworks. |

### Principle II: Modular Design & Testability

| Check | Status | Detail |
|-------|--------|--------|
| Single responsibility per module | PASS | 4 modules: server entry (index), tool handler (assess), file writer (writer), config resolution (config). Each has one sentence purpose. |
| Explicit interfaces | PASS | Each module exports typed functions/interfaces. Internal details are not exposed. |
| No circular dependencies | PASS | Dependency flow: index → assess → writer, config. Unidirectional. |
| Test coverage plan | PASS | Unit tests for writer, assess, config. Integration test for end-to-end MCP tool call. Vitest provides native TS support and ergonomic mocking for filesystem and environment stubs. |

### Principle III: Security (NON-NEGOTIABLE)

| Check | Status | Detail |
|-------|--------|--------|
| Input validation | PASS | All `assess_prompt` parameters validated before processing. `improved` must be boolean; `title`, `you_said`, `next_time` must be non-empty strings when `improved=true`. |
| No hardcoded secrets | PASS | LLM identifier comes from environment variable or server config. No secrets in source. |
| Error messages safe | PASS | Errors are swallowed silently (FR-013). No stack traces, internal paths, or sensitive data exposed. |
| External input sanitized | PASS | String parameters are used only in file content (markdown body), never in shell commands, paths, or queries. Filename is generated from system clock, not user input. |

**GATE RESULT: ALL PASS — proceeding to Phase 0.**

### Post-Design Re-check (after Phase 1)

All three principles re-evaluated after research and design artifacts were produced:

- **Principle I**: Confirmed. Research (R1–R8) verified every decision uses standard library first. Two external dependencies: `@modelcontextprotocol/sdk` (runtime, justified) and `vitest` (dev-only, justified — testing is a well-solved problem and `node:test` requires stacking experimental flags for the mocking this project needs).
- **Principle II**: Confirmed. Data model shows clean entity separation (AssessPromptParams → FeedbackNote). Module dependency flow is unidirectional: `index → assess → writer, config`.
- **Principle III**: Confirmed. Contract schema enforces input validation. User-supplied strings flow only into markdown file body, never into filenames, paths, or commands. All errors are swallowed silently per FR-013.

**POST-DESIGN GATE: ALL PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/001-prompt-feedback-mcp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── assess-prompt.schema.json
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── index.ts             # MCP server entry point, tool registration, stdio transport
├── assess.ts            # assess_prompt tool handler (validation, orchestration)
├── writer.ts            # Note formatting & file writing (mkdir, write, filename generation)
└── config.ts            # Runtime config resolution (repo name, LLM model, storage path)

tests/
├── unit/
│   ├── writer.test.ts   # Note formatting, filename generation, directory creation
│   ├── assess.test.ts   # Parameter validation, conditional write/no-write logic
│   └── config.test.ts   # Repo name resolution, env var reading, fallback behavior
└── integration/
    └── server.test.ts   # End-to-end MCP tool call via stdio transport

package.json             # Dependencies, scripts, bin entry
tsconfig.json            # TypeScript configuration
vitest.config.ts         # Vitest configuration
```

**Structure Decision**: Single project layout. This is a standalone MCP server with no frontend, no API, no database. Four source modules under `src/`, mirrored by unit tests under `tests/unit/`, plus one integration test.

## Complexity Tracking

> No constitution violations to justify. All gates passed cleanly.
