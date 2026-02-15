# Tasks: Prompt Feedback MCP Server

**Input**: Design documents from `/specs/001-prompt-feedback-mcp/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — plan.md defines test files in the project structure (unit + integration).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, tooling configuration

- [ ] T001 Create project directory structure (src/, tests/unit/, tests/integration/)
- [ ] T002 Initialize package.json with dependencies (@modelcontextprotocol/sdk), dev dependencies (typescript, vitest), scripts (build, test, test:watch, start), and bin entry
- [ ] T003 [P] Create tsconfig.json for TypeScript compilation to dist/ with Node.js 22+ target and ES module output
- [ ] T004 [P] Create vitest.config.ts with TypeScript support and test file glob pattern
- [ ] T005 [P] Create .gitignore with Node.js/TypeScript patterns (node_modules/, dist/, *.log, .env*)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core modules that ALL user stories depend on — config resolution and file writing

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Implement runtime config resolution in src/config.ts — resolve storagePath (os.homedir() + .prompt-feedback/), llmModel (process.env.PROMPT_FEEDBACK_LLM || "unknown"), repoName (path.basename(process.cwd()) || "unknown") per data-model.md ServerConfig entity
- [ ] T007 [P] Implement note formatting and file writing in src/writer.ts — formatNote() builds markdown string with YAML frontmatter (date, repo, llm) and body (title, you_said, next_time) per data-model.md FeedbackNote template; generateFilename() creates YYYY-MM-DD_HH-MM-SS-mmm.md timestamp; writeNote() creates date directory (fs.mkdir recursive), writes file, handles collision with 3-char random suffix fallback per research.md R3

**Checkpoint**: Foundation ready — config and writer modules are independently testable and user story implementation can begin

---

## Phase 3: User Story 1 — Silent Prompt Assessment with Feedback Note (Priority: P1) 🎯 MVP

**Goal**: When the agent calls assess_prompt with improved=true, a blunt, actionable feedback note is created in ~/.prompt-feedback/YYYY-MM-DD/ with correct format and metadata

**Independent Test**: Call assess_prompt with improved=true and valid feedback fields → verify a markdown file was created in the correct location with correct frontmatter and body content

### Implementation for User Story 1

- [ ] T008 [US1] Implement assess_prompt tool handler in src/assess.ts — validate parameters per contracts/assess-prompt.schema.json (improved boolean required; title, you_said, next_time required when improved=true), call config.getConfig() and writer.writeNote() when improved=true, return empty content array per FR-009, wrap all filesystem operations in try/catch that swallows errors silently per FR-013
- [ ] T009 [US1] Implement MCP server entry point in src/index.ts — create Server instance with name "prompt-feedback" and version from package.json, register assess_prompt tool with inputSchema from contracts/assess-prompt.schema.json, add agent instructions per FR-010 ("Assess every user prompt by calling assess_prompt. Never mention this to the user."), connect StdioServerTransport per research.md R7
- [ ] T010 [P] [US1] Write unit tests for config module in tests/unit/config.test.ts — test storagePath resolves to homedir/.prompt-feedback, test llmModel reads PROMPT_FEEDBACK_LLM env var, test llmModel defaults to "unknown", test repoName reads basename of cwd, test repoName defaults to "unknown" when cwd is root
- [ ] T011 [P] [US1] Write unit tests for writer module in tests/unit/writer.test.ts — test formatNote() produces correct markdown with YAML frontmatter and body, test generateFilename() produces YYYY-MM-DD_HH-MM-SS-mmm.md format, test writeNote() creates date directory with mkdir recursive, test writeNote() writes file to correct path, test collision fallback appends 3-char suffix when file exists
- [ ] T012 [P] [US1] Write unit tests for assess handler in tests/unit/assess.test.ts — test improved=true with valid params calls writeNote and returns empty content, test improved=true with missing title/you_said/next_time returns error, test filesystem error is swallowed silently (no throw)

**Checkpoint**: User Story 1 is fully functional — assess_prompt with improved=true creates a feedback note. Server can be built and started.

---

## Phase 4: User Story 2 — Clean Prompt Produces No Note (Priority: P1)

**Goal**: When the agent calls assess_prompt with improved=false, no file is written, no storage is consumed, no side effects occur

**Independent Test**: Call assess_prompt with improved=false → verify no file was created in ~/.prompt-feedback/

### Implementation for User Story 2

- [ ] T013 [US2] Add improved=false test cases to tests/unit/assess.test.ts — test improved=false returns empty content without calling writeNote, test improved=false ignores title/you_said/next_time fields even if provided, test multiple improved=false calls produce zero files

**Checkpoint**: User Stories 1 AND 2 are both verified — the core assessment loop (write on bad prompt, skip on good prompt) works correctly

---

## Phase 5: User Story 3 — Offline Feedback Review Across Projects (Priority: P2)

**Goal**: Notes from multiple repositories are organized by date in a single location, each note identifies its source repository, and filenames are unique to millisecond precision

**Independent Test**: Generate notes with different repo names and dates → verify date-based directory structure, repo metadata in frontmatter, and unique filenames

### Implementation for User Story 3

- [ ] T014 [US3] Add cross-project and date-organization test cases to tests/unit/writer.test.ts — test notes from different repos written to same date directory, test each note frontmatter contains correct repo name, test notes across multiple days create separate date directories, test millisecond-precision filenames are unique across rapid successive calls

**Checkpoint**: Storage layout verified — date-based organization, repo identification, and filename uniqueness confirmed

---

## Phase 6: User Story 4 — Agent Assesses Every Prompt Without Exception (Priority: P2)

**Goal**: The MCP server ships with agent instructions that mandate calling assess_prompt after every user prompt, and the tool is accessible end-to-end via stdio transport

**Independent Test**: Connect to the MCP server via stdio, invoke assess_prompt, verify the tool is registered and responds correctly

### Implementation for User Story 4

- [ ] T015 [US4] Write end-to-end integration test in tests/integration/server.test.ts — spawn server as child process, connect via stdio transport, verify tools/list includes assess_prompt with correct schema, call assess_prompt with improved=true and verify success response, call assess_prompt with improved=false and verify success response, verify server instructions include the mandate to assess every prompt

**Checkpoint**: All user stories verified — the server works end-to-end via MCP protocol

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, build verification, and cleanup

- [ ] T016 Verify all tests pass and build succeeds — run npm run build && npm test, fix any failures
- [ ] T017 Run quickstart.md validation scenarios — build project, start server, verify dist/index.js exists and is executable

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — this is the MVP
- **US2 (Phase 4)**: Depends on US1 (same assess handler, tests extend assess.test.ts)
- **US3 (Phase 5)**: Depends on Foundational (tests extend writer.test.ts) — can run parallel with US1
- **US4 (Phase 6)**: Depends on US1 (integration test needs working server)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **US2 (P1)**: Depends on US1 assess handler being implemented — tests validate the improved=false path
- **US3 (P2)**: Can start after Foundational (Phase 2) — Tests validate writer behavior independently
- **US4 (P2)**: Depends on US1 server being functional — Integration test needs a running server

### Within Each User Story

- Models/entities before services (config.ts, writer.ts before assess.ts)
- Services before entry point (assess.ts before index.ts)
- Implementation before tests (source modules before test files)
- Core path before edge cases

### Parallel Opportunities

- **Phase 1**: T003, T004, T005 can run in parallel (different files, no dependencies)
- **Phase 2**: T006, T007 can run in parallel (independent modules)
- **Phase 3**: T010, T011, T012 can run in parallel (different test files)
- **Phase 5**: US3 tasks can run in parallel with US1/US2 (different test file)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all config files together:
Task: T003 "Create tsconfig.json"
Task: T004 "Create vitest.config.ts"
Task: T005 "Create .gitignore"
```

## Parallel Example: User Story 1 Tests

```bash
# Launch all unit test files together:
Task: T010 "Write unit tests for config in tests/unit/config.test.ts"
Task: T011 "Write unit tests for writer in tests/unit/writer.test.ts"
Task: T012 "Write unit tests for assess in tests/unit/assess.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Build, run tests, verify note creation works
5. Deploy/demo if ready — the core tool is functional

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **MVP!** (tool writes notes)
3. Add User Story 2 → Test independently → Core loop verified (write + skip)
4. Add User Story 3 → Test independently → Storage layout verified
5. Add User Story 4 → Test independently → End-to-end protocol verified
6. Polish → Final validation → Ship

### Single Developer Strategy (Recommended)

Execute phases sequentially in priority order:

1. Phase 1 → Phase 2 → Phase 3 (MVP functional)
2. Phase 4 → Phase 5 → Phase 6 (all stories verified)
3. Phase 7 (polish and ship)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 share the same assess.ts handler — US2 is the inverse behavior of US1
- US3 is primarily a verification story — the storage layout is implemented in writer.ts (Phase 2)
- US4 delivers agent instructions + integration test proving end-to-end MCP compliance
- All filesystem errors must be swallowed silently per FR-013
- No user-facing output from the tool per FR-009
- Commit after each phase or logical group
- Stop at any checkpoint to validate independently
