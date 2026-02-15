# Research: Prompt Feedback MCP Server

**Branch**: `001-prompt-feedback-mcp` | **Date**: 2026-02-16

## R1: MCP SDK Selection

**Decision**: Use `@modelcontextprotocol/sdk` (TypeScript)

**Rationale**: The Model Context Protocol defines a JSON-RPC-based protocol with specific message framing, capability negotiation, tool schema registration, and stdio/SSE transport layers. Reimplementing this from scratch would mean rebuilding a protocol parser, transport layer, and schema validator — squarely in the "re-invents well-solved problems" category per Constitution Principle I. The official TypeScript SDK is the canonical implementation maintained by Anthropic, with minimal transitive dependencies (zod for schema validation).

**Alternatives considered**:
- **Vanilla JSON-RPC over stdio**: Would require manual message framing, capability negotiation, and tool schema validation. Fragile and error-prone for no benefit.
- **Python MCP SDK**: Viable but TypeScript SDK is more mature, has broader ecosystem adoption for MCP servers, and aligns with the npm-based distribution model for MCP tools.
- **mcp-framework (community)**: Higher-level abstraction over the official SDK. Adds unnecessary dependency layer. Rejected per Principle I (the official SDK is already sufficient).

## R2: File I/O Strategy

**Decision**: Use `node:fs/promises` with `{ recursive: true }` for directory creation

**Rationale**: Node.js standard library provides everything needed. `fs.mkdir` with `recursive: true` handles the full path creation for `~/.prompt-feedback/YYYY-MM-DD/` in a single call. `fs.writeFile` handles atomic-enough writes for single-user, small-file scenarios. No external file library needed.

**Alternatives considered**:
- **fs-extra**: Adds convenience methods but we only need mkdir + writeFile. Rejected per Principle I.
- **Synchronous fs**: Would block the event loop. Not necessary since MCP tool calls are async by nature.

## R3: Timestamp & Filename Uniqueness

**Decision**: Use `Date.now()` for millisecond timestamp. For same-millisecond collision, append a random 3-character alphanumeric suffix.

**Rationale**: Millisecond precision handles 99.9% of cases (a single user rarely generates two assessments within 1ms). For the remaining edge case (parallel agent sessions), appending a short random suffix (e.g., `-a3f`) ensures uniqueness without overcomplicating the filename pattern. The filename format becomes `YYYY-MM-DD_HH-MM-SS-mmm.md` normally, with `YYYY-MM-DD_HH-MM-SS-mmm-xyz.md` as a fallback on collision.

**Alternatives considered**:
- **UUID in filename**: Guaranteed unique but makes filenames unreadable and breaks chronological sorting by name. Rejected.
- **Incrementing counter**: Requires state tracking across invocations. Overengineered for the collision frequency.
- **Microsecond precision**: `process.hrtime.bigint()` provides nanosecond precision but doesn't map to wall-clock time cleanly. Rejected for readability.

**Implementation**: On write, if the target file already exists, retry once with a random 3-char suffix appended before the `.md` extension.

## R4: Repository Name Resolution

**Decision**: Derive from current working directory basename, with git remote name as an enhancement

**Rationale**: The MCP server's `cwd` is set by the host application (e.g., Cursor, VS Code). The directory basename (e.g., `prompt-assessment-mcp`) is the simplest and most reliable repo identifier. Attempting to parse `.git/config` for the remote name adds complexity for marginal benefit. If cwd is not determinable, fall back to `"unknown"`.

**Alternatives considered**:
- **Parse git remote URL**: More accurate for repos with non-descriptive folder names, but adds shell exec or git config parsing. Overengineered for a metadata field.
- **Accept as parameter**: Would require every agent to pass it. Spec says it's auto-captured.

## R5: LLM Model Identifier

**Decision**: Read from environment variable `PROMPT_FEEDBACK_LLM` at server startup. Fall back to `"unknown"` if not set.

**Rationale**: MCP servers receive configuration through environment variables or command-line arguments. An env var is the simplest mechanism that works across all MCP hosts. The variable name is namespaced to avoid collisions. The spec states this comes from "server configuration or environment" — env var satisfies both (MCP hosts set env vars as part of server config).

**Alternatives considered**:
- **MCP server config argument**: Would work but env vars are more universally supported across MCP host implementations.
- **Auto-detect from MCP client metadata**: MCP protocol doesn't reliably expose which LLM model the client is using. Not feasible.

## R6: YAML Frontmatter Generation

**Decision**: Use string template interpolation. No YAML library.

**Rationale**: The frontmatter is exactly 3 fixed fields (`date`, `repo`, `llm`) with simple string values. Template literals handle this trivially. A YAML serialization library (like `js-yaml`) would be an unnecessary dependency for generating 3 lines of key-value pairs.

**Alternatives considered**:
- **js-yaml**: Full YAML serializer. Massive overkill for 3 static fields. Rejected per Principle I.
- **JSON frontmatter**: Non-standard for markdown files. Users expect YAML frontmatter. Rejected.

## R7: MCP Transport

**Decision**: stdio transport (standard input/output)

**Rationale**: stdio is the default and most widely supported MCP transport. It's how Cursor, Claude Desktop, and most MCP hosts launch and communicate with MCP servers. The server is started as a subprocess, communicates via JSON-RPC over stdin/stdout. No HTTP server, no port management, no CORS — minimal attack surface per Principle III.

**Alternatives considered**:
- **SSE (Server-Sent Events) transport**: HTTP-based, useful for remote servers. This tool is local-only. Unnecessary complexity.
- **Dual transport (stdio + SSE)**: Over-scoped for an individual developer tool.

## R8: Testing Strategy

**Decision**: Vitest (dev-only dependency)

**Rationale**: This project requires mocking `node:fs/promises`, `node:os`, `process.cwd()`, `process.env`, and `Date.now()` across multiple test files. The Node.js built-in test runner (`node:test`) can handle this but requires stacking three experimental flags (`--experimental-strip-types`, `--experimental-test-module-mocks`, `--experimental-test-coverage`) and produces significantly more verbose mock setup code. Testing is a well-solved problem — the vanilla approach introduces unreasonable friction without benefit. Vitest is a dev-only dependency (never shipped to users), has native TypeScript support (no build step for tests), a Jest-compatible API, built-in module mocking via `vi.mock()`, and a lightweight dependency footprint.

**Alternatives considered**:
- **Node.js built-in `node:test`**: Requires 3 experimental flags for TypeScript + module mocking + coverage. Mocking is verbose and less ergonomic. Assertions are bare-bones (`node:assert` lacks `.toMatchObject()`, readable diffs). Rejected due to unreasonable complexity for the mocking needs of this project.
- **Jest**: Mature but heavy dependency footprint. Requires `ts-jest` or babel transform configuration for TypeScript. Rejected — Vitest is lighter and needs less config.
- **tsx + node:test**: Solves the TypeScript flag issue but still leaves verbose mocking and basic assertions. Half-measure. Rejected.
