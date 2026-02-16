# Research: Trigger-Based Holistic Assessment

**Branch**: `002-trigger-based-assessment` | **Date**: 2026-02-16

**Note**: This feature evolves the existing 001 codebase. Research decisions from 001 (R1–R8) remain valid and are not repeated here. This document covers only new decisions required by the schema and behavioral changes.

## R1: Zod Array Validation for `you_said`

**Decision**: Use `z.array(z.string().min(1)).min(1)` for `you_said` validation in the tool schema.

**Rationale**: The `you_said` field changes from a single string to an array of strings. Zod (bundled with the MCP SDK, already a project dependency) natively supports array schemas with element-level and collection-level constraints. `min(1)` on the array ensures at least one prompt paraphrase is provided. `min(1)` on each string element ensures no empty strings slip through. This is vanilla usage of an existing dependency — no new library needed.

**Alternatives considered**:
- **Manual array validation in handler**: Would duplicate what zod already does. The MCP SDK's `server.tool()` validates params against the zod schema before the handler runs. Rejected — unnecessary duplication.
- **No minimum length on array**: Would allow `improved=true` with an empty `you_said` array. This is semantically invalid (you can't have feedback without referencing any prompts). Rejected.

## R2: Zod Enum for `trigger` Parameter

**Decision**: Use `z.enum(["frustration", "agent_mistake"])` for the `trigger` parameter.

**Rationale**: The trigger field has exactly two valid values. Zod's `z.enum()` constrains input at the schema level, providing clear error messages if an invalid value is passed. This is a standard zod pattern — no new dependency or technique required.

**Alternatives considered**:
- **String with validation in handler**: Would move validation out of the schema, making the tool's contract less explicit to consuming agents. Rejected — the schema should be self-documenting.
- **Boolean (isFrustration)**: Loses semantic clarity and doesn't extend cleanly if triggers are added later. Rejected.

## R3: Note Format for Array of Prompts

**Decision**: Render `you_said` as a numbered markdown list under the "You said" section.

**Rationale**: A numbered list preserves the chronological order of prompts (which prompt came first matters for understanding the interaction pattern). It's visually distinct from the rest of the note's content and scales naturally from 1 to N items. The user can quickly scan which prompts were flagged.

**Example output**:

```markdown
**You said:**

1. "add authentication to the app"
2. "no, I meant OAuth not basic auth"
3. "I already told you it needs Google login"
```

**Alternatives considered**:
- **Bullet list (unordered)**: Loses chronological signal. When reviewing patterns, the order of prompts reveals how the miscommunication escalated. Rejected.
- **Blockquotes**: Visually heavy for multiple items. Doesn't communicate ordering. Rejected.
- **Single concatenated string**: Loses the discrete prompt boundaries. The user can't see where one prompt ends and another begins. Rejected.

## R4: Agent Instructions Rewrite

**Decision**: Replace the per-prompt assessment mandate with trigger-based instructions in both the MCP server `instructions` field and the `assess_prompt` tool description.

**Rationale**: The server's `instructions` field is read by MCP hosts to understand the server's purpose. The tool's `description` is read by agents to understand when/how to call the tool. Both currently say "call after every user prompt" — this must change to reflect the trigger-based model. The new instructions must clearly describe the two triggers, the holistic evaluation process, and the `improved=false` path for when triggers fire but prompts were fine.

**Implementation**: Two text changes in `src/index.ts`:
1. Server `instructions` string: Updated to describe trigger-based assessment.
2. Tool `description` string: Updated to describe when to call (triggers only) and the holistic evaluation process.

## R5: AGENTS.md Update

**Decision**: Rewrite `AGENTS.md` to reflect trigger-based instructions instead of per-prompt mandate.

**Rationale**: `AGENTS.md` is the workspace-level instruction file that AI agents in Cursor read. It currently mandates calling `assess_prompt` after every prompt. This must be updated to describe the two triggers (frustration, significant mistake), the holistic evaluation approach, and the `you_said` array format.

**Implementation**: Full rewrite of `AGENTS.md` content. The new instructions must be concise (agents read this on every prompt) while covering:
- When to trigger (two conditions)
- How to evaluate holistically (review task context, not just last prompt)
- When NOT to create a note (triggers fire but prompts were fine → `improved=false`)
- Schema format (array for `you_said`, enum for `trigger`)

## R6: Backward Compatibility

**Decision**: This is a breaking change to the tool schema. No backward compatibility layer.

**Rationale**: The project has a single consumer pattern (AI agents calling via MCP). There is no installed base to migrate — feature 001 is the initial implementation. The schema change (`you_said` from string to array, addition of `trigger` enum) is a clean replacement. Maintaining dual schemas would add complexity for zero benefit.

**Alternatives considered**:
- **Accept both string and array for `you_said`**: Would complicate the handler and writer with conditional logic. No installed base requires it. Rejected.
- **Version the tool name (e.g., `assess_prompt_v2`)**: Overengineered. Single consumer pattern with no migration path needed. Rejected.
