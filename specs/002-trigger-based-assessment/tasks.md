# Tasks: Trigger-Based Holistic Assessment

**Input**: Design documents from `/specs/002-trigger-based-assessment/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Existing test files must be updated to match the new schema. No new test files needed.

**Organization**: Tasks are grouped by user story. US1+US2 are merged into one phase because they share all server-side code (the `trigger` enum value is the only difference, and both flow through the same handler, writer, and schema).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Update shared types and interfaces that all subsequent changes depend on. These are the TypeScript interfaces imported across modules — they must be updated first.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 [P] Update `NoteContent` interface in src/writer.ts — change `you_said` from `string` to `string[]`
- [ ] T002 [P] Update `NoteMetadata` interface in src/writer.ts — add `trigger: string` field
- [ ] T003 Update `AssessPromptParams` interface in src/assess.ts — change `you_said` from `string` to `string[]`, add `trigger` field as optional string (enum enforced at schema level)

**Checkpoint**: All interfaces updated. Module compilation may fail until handler/format code is updated in Phase 2.

---

## Phase 2: US1 + US2 — Trigger-Based Assessment (Priority: P1) MVP

**Goal**: Both frustration and agent-mistake triggers work end-to-end: the tool accepts the new schema (trigger enum, you_said array), the handler validates and passes data through, and the writer produces the updated note format with numbered prompt list and trigger in frontmatter.

**Independent Test**: Call `assess_prompt` with `improved=true`, `trigger: "frustration"`, `you_said: ["prompt 1", "prompt 2"]`, `title`, and `next_time`. Verify a note is created with trigger in frontmatter, numbered list of prompts under "You said", and the next_time suggestion.

### Implementation

- [ ] T004 [US1] Update `formatNote` function in src/writer.ts — add `trigger` to YAML frontmatter, render `you_said` array as numbered markdown list under "You said" section (per research.md R3), keep "Next time" section unchanged
- [ ] T005 [US1] Update `handleAssessPrompt` function in src/assess.ts — update validation to check `trigger` is present when `improved=true`, change `you_said` validation from string `.trim()` to array `.length` check with element validation, pass `trigger` through to `NoteMetadata`
- [ ] T006 [US1] Update tool zod schema in src/index.ts — replace `you_said` `z.string()` with `z.array(z.string().min(1)).min(1)`, add `trigger` as `z.enum(["frustration", "agent_mistake"])`, update `next_time` description to mention concrete examples
- [ ] T007 [US1] Update server `instructions` string in src/index.ts — replace "Silently assess every user prompt" with trigger-based instruction describing the two triggers and holistic evaluation approach
- [ ] T008 [US1] Update tool `description` string in src/index.ts — replace "Call this after every user prompt" with trigger-based description explaining when to call (frustration or significant agent mistake only)

**Checkpoint**: `assess_prompt` tool accepts the new schema and produces correctly formatted notes with trigger metadata and numbered prompt arrays. Both `trigger: "frustration"` and `trigger: "agent_mistake"` work through the same code path. `improved=false` still produces no note.

---

## Phase 3: US3 — No Assessment for Smooth Interactions (Priority: P1)

**Goal**: Agent instructions explicitly direct agents to NOT call `assess_prompt` during smooth interactions. The per-prompt mandate from v1 is fully removed from all instruction surfaces.

**Independent Test**: Read AGENTS.md and confirm it no longer says "call after every user prompt." Verify it describes the two-trigger model and explicitly states the tool should not be called when interactions are smooth.

### Implementation

- [ ] T009 [US3] Rewrite AGENTS.md — the agent MUST silently monitor every single user prompt for signs of frustration/irritation or significant agent mistakes. This is passive detection on every prompt, NOT calling the tool on every prompt. When a trigger IS detected: call `assess_prompt`, review the recent task context holistically, populate `you_said` array with relevant prompt paraphrases, set `trigger` enum, and set `improved=true` only if the user's prompts contributed. When NO trigger is detected: do nothing — no tool call, no assessment, no side effects. The key distinction: observe every prompt, act only on triggers.

**Checkpoint**: All instruction surfaces (server instructions in index.ts from Phase 2, tool description in index.ts from Phase 2, and AGENTS.md from this phase) consistently describe the trigger-based model. No remnant of per-prompt mandate exists.

---

## Phase 4: US4 — Holistic Multi-Prompt Capture (Priority: P2)

**Goal**: Feedback notes correctly capture an array of relevant prompt paraphrases as a numbered list, and `next_time` includes a concrete improvement example. This is already implemented by the `formatNote` changes in Phase 2 (T004) — this phase validates and verifies.

**Independent Test**: Create a note with `you_said: ["prompt 1", "prompt 2", "prompt 3"]`. Open the resulting file and verify it contains a numbered list under "You said" with all three prompts, plus the next_time suggestion.

### Implementation

- [ ] T010 [US4] Verify `formatNote` in src/writer.ts handles single-element `you_said` array (renders as `1. "prompt"` — not a numbered list with only item 1, just a single numbered item). Make sure to capture the raw user prompts without alteration.
- [ ] T011 [US4] Verify `formatNote` in src/writer.ts handles multi-element `you_said` array (renders numbered list preserving chronological order)

**Checkpoint**: Notes correctly render both single-prompt and multi-prompt arrays. Format matches data-model.md file template.

---

## Phase 5: Test Updates & Polish

**Purpose**: Update all existing test files to match the new schema shape. Build and run full test suite.

- [ ] T012 [P] Update unit tests in tests/unit/writer.test.ts — change `sampleContent.you_said` from string to array, add `trigger` to `sampleMetadata`, update `formatNote` assertions to check for numbered list format and trigger in frontmatter
- [ ] T013 [P] Update unit tests in tests/unit/assess.test.ts — change `you_said` from string to array in all test cases, add `trigger` field to `improved=true` calls, add test for missing `trigger` returning error, update `improved=false` tests to verify trigger is also ignored
- [ ] T014 Update integration test in tests/integration/server.test.ts — update schema assertions to check for `trigger` property and `you_said` as array type, update `improved=true` call to use array `you_said` and include `trigger`, update instructions assertion to no longer check for per-prompt mandate
- [ ] T015 Run `npm run build` to verify TypeScript compilation with zero errors
- [ ] T016 Run `npm test` to verify all tests pass

**Checkpoint**: Full test suite passes. Build succeeds. All instruction surfaces, schema, handler, and writer are consistent with the trigger-based model.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1+US2 (Phase 2)**: Depends on Phase 1 (interfaces must be updated before handler/format code)
- **US3 (Phase 3)**: No code dependency — can run in parallel with Phase 2 (different file: AGENTS.md)
- **US4 (Phase 4)**: Depends on Phase 2 (format verification requires formatNote changes)
- **Test Updates (Phase 5)**: Depends on Phases 2, 3, and 4 (all source changes must be complete before updating tests)

### User Story Dependencies

- **US1+US2 (P1)**: Depends on Foundational (Phase 1). Delivers the full trigger-based tool.
- **US3 (P1)**: Independent of US1+US2 at the file level (AGENTS.md vs src/). Can proceed in parallel.
- **US4 (P2)**: Depends on US1+US2 (the format changes are made in that phase).

### Parallel Opportunities

- T001 and T002 can run in parallel (both edit src/writer.ts but different sections — interfaces only)
- Phase 2 (US1+US2) and Phase 3 (US3) can run in parallel (different files entirely)
- T012, T013 can run in parallel (different test files)

---

## Parallel Example: Phase 2 + Phase 3

```text
# These can proceed simultaneously:
Stream A (US1+US2): T004 → T005 → T006 → T007 → T008
Stream B (US3):     T009

# Then converge for Phase 4 + 5:
T010 → T011 → T012/T013 (parallel) → T014 → T015 → T016
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2)

1. Complete Phase 1: Foundational types
2. Complete Phase 2: US1+US2 trigger-based assessment
3. **STOP and VALIDATE**: Build (`npm run build`), manually test with a sample tool call
4. The tool now works with the new schema — triggers, array, format all functional

### Incremental Delivery

1. Phase 1 → Types updated
2. Phase 2 → Tool works with new schema (MVP!)
3. Phase 3 → Agent instructions aligned (AGENTS.md)
4. Phase 4 → Format verified for edge cases
5. Phase 5 → Full test suite green, build clean

---

## Notes

- US1 and US2 are merged because they share 100% of server code. The `trigger` enum (`"frustration"` vs `"agent_mistake"`) is the only difference — both flow through the same handler, writer, and schema.
- US3 has no server code — it's enforced entirely by agent instructions (AGENTS.md + server instructions text).
- US4's format is implemented in Phase 2 (T004). Phase 4 is verification only.
- `src/config.ts` and `tests/unit/config.test.ts` require NO changes.
- T010 and T011 are verification tasks — they may result in minor tweaks to `formatNote` if edge cases aren't handled, but the core implementation is T004.
