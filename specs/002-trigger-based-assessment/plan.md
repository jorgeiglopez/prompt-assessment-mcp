# Implementation Plan: Trigger-Based Holistic Assessment

**Branch**: `002-trigger-based-assessment` | **Date**: 2026-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-trigger-based-assessment/spec.md`

## Summary

Refactor the existing `assess_prompt` MCP tool from per-prompt evaluation to trigger-based holistic assessment. The tool schema changes: `you_said` becomes an array of strings, a new `trigger` enum parameter is added (`"frustration"` | `"agent_mistake"`), and `next_time` must include concrete examples. The server instructions and AGENTS.md are rewritten to direct agents to call the tool only when user frustration or significant agent mistakes are detected, not after every prompt. The note format updates to render an array of prompt paraphrases and include trigger type in frontmatter. Implementation modifies the existing 4-module TypeScript codebase with no new dependencies.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22+ (LTS) — unchanged from 001
**Primary Dependencies**: `@modelcontextprotocol/sdk` (runtime, includes zod for schema validation) — unchanged from 001. No new dependencies required.
**Storage**: Local filesystem — plain markdown files in `~/.prompt-feedback/YYYY-MM-DD/` — unchanged from 001
**Testing**: Vitest (dev-only) — unchanged from 001
**Target Platform**: Any platform with Node.js (macOS, Linux, Windows) — unchanged from 001
**Project Type**: Single project — standalone MCP server — unchanged from 001
**Performance Goals**: Tool call completes in <50ms — unchanged. Trigger-based model means fewer calls overall.
**Constraints**: Zero user-facing output. Fail silently on all filesystem errors. No network calls. No database. — unchanged from 001
**Scale/Scope**: Single user, one tool, one file per triggered assessment. Fewer notes overall (trigger-based vs. per-prompt). — unchanged from 001

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Vanilla-First Development

| Check | Status | Detail |
|-------|--------|--------|
| Standard library first | PASS | All file I/O uses `node:fs/promises`, paths use `node:path`, timestamps use `Date`. No changes to core I/O strategy. |
| External dependency justified | PASS | Same two dependencies as 001: (1) `@modelcontextprotocol/sdk` (runtime — MCP protocol compliance). (2) `vitest` (dev-only — testing). No new dependencies introduced by this feature. Zod (for array/enum validation) is bundled with the MCP SDK, not a new addition. |
| Transitive dependencies minimized | PASS | No change to dependency tree. |

### Principle II: Modular Design & Testability

| Check | Status | Detail |
|-------|--------|--------|
| Single responsibility per module | PASS | Same 4-module structure: server entry (index), tool handler (assess), file writer (writer), config resolution (config). Each retains its single responsibility. |
| Explicit interfaces | PASS | Updated interfaces: `AssessPromptParams` gains `trigger` field and `you_said` becomes `string[]`. `NoteContent.you_said` becomes `string[]`. `NoteMetadata` gains `trigger` field. All changes are in explicit type definitions. |
| No circular dependencies | PASS | Dependency flow unchanged: `index → assess → writer, config`. Unidirectional. |
| Test coverage plan | PASS | Existing tests updated to cover: array validation for `you_said`, enum validation for `trigger`, updated note format rendering, new frontmatter field. |

### Principle III: Security (NON-NEGOTIABLE)

| Check | Status | Detail |
|-------|--------|--------|
| Input validation | PASS | All parameters validated by zod schema. `trigger` constrained to enum (`"frustration"` \| `"agent_mistake"`). `you_said` validated as non-empty array of non-empty strings. No unvalidated input reaches file operations. |
| No hardcoded secrets | PASS | Unchanged — LLM from env var, no secrets in source. |
| Error messages safe | PASS | Unchanged — errors swallowed silently. |
| External input sanitized | PASS | Array elements in `you_said` are used only in markdown body content, never in filenames, paths, or commands. `trigger` is an enum — only two valid values. |

**GATE RESULT: ALL PASS — proceeding to Phase 0.**

### Post-Design Re-check (after Phase 1)

All three principles re-evaluated after research and design artifacts were produced:

- **Principle I**: Confirmed. Research (R1–R6) verified every decision uses existing dependencies only. Zod array/enum validation is native to the already-approved `@modelcontextprotocol/sdk`. No new runtime or dev dependencies introduced.
- **Principle II**: Confirmed. Data model shows clean entity evolution (AssessPromptParams gains `trigger` enum, `you_said` becomes `string[]`). Module dependency flow unchanged: `index → assess → writer, config`. `config.ts` untouched. Contract schema (JSON Schema) documents the tool interface explicitly.
- **Principle III**: Confirmed. Contract schema enforces input validation — `trigger` constrained to enum, `you_said` constrained to non-empty array of non-empty strings. User-supplied strings flow only into markdown file body, never into filenames, paths, or commands. All errors swallowed silently per FR-011.

**POST-DESIGN GATE: ALL PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/002-trigger-based-assessment/
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
├── index.ts             # MCP server entry point — updated tool schema, updated server instructions
├── assess.ts            # Tool handler — updated interface (trigger enum, you_said array), updated validation
├── writer.ts            # Note formatting — updated format (numbered prompt list, trigger in frontmatter)
└── config.ts            # Runtime config — NO CHANGES

tests/
├── unit/
│   ├── writer.test.ts   # Updated: array rendering, trigger in frontmatter
│   ├── assess.test.ts   # Updated: array/enum validation, trigger passthrough
│   └── config.test.ts   # NO CHANGES
└── integration/
    └── server.test.ts   # Updated: new schema shape in E2E test

AGENTS.md                # Updated: new trigger-based instructions (replaces per-prompt mandate)
```

**Structure Decision**: Same single-project layout as 001. No structural changes. Four source modules under `src/`, mirrored by unit tests under `tests/unit/`, plus one integration test. This feature modifies 3 of 4 source modules (`config.ts` is unchanged).

## Complexity Tracking

> No constitution violations to justify. All gates passed cleanly. No new dependencies, no new modules, no structural changes.
