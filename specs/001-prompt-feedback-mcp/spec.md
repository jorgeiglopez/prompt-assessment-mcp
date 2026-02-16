# Feature Specification: Prompt Feedback MCP Server

**Feature Branch**: `001-prompt-feedback-mcp`  
**Created**: 2026-02-16  
**Status**: Draft  
**Input**: User description: "A tool that helps users become better prompters over time. After every user prompt, the AI agent assesses its quality and — only when there's a concrete improvement to suggest — writes a short, actionable note. The user reads these notes offline to identify patterns and sharpen their prompting habits."

## Clarifications

### Session 2026-02-16

- Q: What should happen when the tool encounters a filesystem error (e.g., permission denied, disk full) while writing a feedback note? → A: Fail silently — swallow the error, agent continues unaffected. Losing one assessment is not a big deal.
- Q: Should the tool handle sensitive content (credentials, API keys) in the `you_said` field? → A: No special handling — the agent's paraphrase naturally omits raw secrets; this is the agent's responsibility, not the server's.
- Q: Should the tool enforce a note retention or cleanup policy? → A: Indefinite storage — no automatic cleanup. Notes are tiny markdown files; users manage manually if needed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Silent Prompt Assessment with Feedback Note (Priority: P1)

A user sends a prompt to an AI agent that is vague or ambiguous — for example, "make the filenames human readable." The agent processes the prompt normally. Behind the scenes, the agent evaluates the prompt and determines it could be improved. A blunt, actionable feedback note is automatically created and stored for the user to review later. The user is never interrupted or notified during the conversation.

**Why this priority**: This is the core value proposition — automatically capturing prompt improvement opportunities without disrupting the user's workflow. Without this, the tool has no purpose.

**Independent Test**: Can be fully tested by sending an ambiguous prompt to an agent with the tool enabled, then verifying a feedback note file was created in the correct location with the correct format and content.

**Acceptance Scenarios**:

1. **Given** a user sends a vague prompt (e.g., "make it better"), **When** the agent calls the assessment tool with `improved=true`, a title, the user's original phrasing, and an actionable suggestion, **Then** a single markdown feedback note is created in the user's feedback directory organized by date.
2. **Given** a user sends a prompt with missing context (e.g., referencing a file without naming it), **When** the agent assesses the prompt, **Then** the resulting note specifically references what was missing and suggests what to include next time.
3. **Given** a feedback note is created, **When** the user inspects the file, **Then** it contains frontmatter metadata (date, repository name, LLM model) and a body with the title, a quote/paraphrase of the original prompt, and a concise improvement suggestion.

---

### User Story 2 - Clean Prompt Produces No Note (Priority: P1)

A user sends a clear, complete, and efficient prompt — for example, "Rename journal files to YYYY-MM-DD_HH-MM-SS.md format." The agent processes the prompt normally and evaluates it. Since there is nothing to improve, no feedback note is created. No file is written, no storage is consumed, and the user's feedback directory remains clean.

**Why this priority**: Equally critical to the core loop. If the tool creates noise for good prompts, users will stop trusting and reviewing their feedback. The absence of a note is itself a signal that the prompt was fine.

**Independent Test**: Can be fully tested by sending a well-formed prompt to an agent with the tool enabled, then verifying that no new feedback file was created in the feedback directory.

**Acceptance Scenarios**:

1. **Given** a user sends a clear and complete prompt, **When** the agent calls the assessment tool with `improved=false`, **Then** no feedback note file is created.
2. **Given** a user sends multiple clear prompts in succession, **When** the agent assesses each one, **Then** the feedback directory contains no new files for any of those prompts.

---

### User Story 3 - Offline Feedback Review Across Projects (Priority: P2)

A user has been working across three different projects over the past week. They open their feedback directory and find notes organized by date. They can scan the notes from all projects in one place, notice recurring patterns (e.g., they frequently omit file format details), and consciously adjust their prompting habits going forward.

**Why this priority**: This is the learning payoff — the reason notes are stored at all. Without cross-project aggregation and date-based organization, the user cannot easily identify patterns. However, this is downstream of note creation (P1 stories).

**Independent Test**: Can be fully tested by generating feedback notes from multiple repositories over multiple days, then browsing the feedback directory to confirm notes are organized by date and each note identifies its source repository.

**Acceptance Scenarios**:

1. **Given** feedback notes have been created from three different repositories over five days, **When** the user browses the feedback storage location, **Then** notes are organized into date-based folders (one folder per day) and each note's metadata identifies which repository it came from.
2. **Given** a user reviews notes from a single day, **When** multiple notes exist for that day, **Then** each note has a unique filename based on its creation timestamp (to millisecond precision) so no notes are overwritten.

---

### User Story 4 - Agent Assesses Every Prompt Without Exception (Priority: P2)

An AI agent is configured with the prompt feedback tool. Regardless of whether the user's prompt is good or bad, simple or complex, the agent calls the assessment tool after every single user prompt. This ensures comprehensive coverage — the agent never silently skips an assessment.

**Why this priority**: Mandatory assessment ensures no learning opportunities are missed. If assessment were optional or inconsistent, users would get an incomplete picture of their prompting habits. This is essential for the tool's reliability but depends on the P1 note creation being functional.

**Independent Test**: Can be fully tested by sending a series of prompts (mix of good and bad) and verifying the assessment tool was invoked for each one, regardless of whether a note was created.

**Acceptance Scenarios**:

1. **Given** a user sends any prompt to the agent, **When** the agent processes the prompt, **Then** the agent calls the assessment tool exactly once for that prompt.
2. **Given** a user sends five prompts in a session (three clear, two vague), **When** all assessments complete, **Then** the assessment tool was called five times — two resulting in notes and three resulting in no action.

---

### Edge Cases

- What happens when two feedback notes are generated at the exact same millisecond? The system must ensure unique filenames to prevent overwriting.
- What happens when the feedback storage directory does not exist yet? The system must create the necessary directory structure automatically.
- What happens when the user's prompt is extremely long (thousands of characters)? The `you_said` field should contain a brief paraphrase, not the entire prompt.
- What happens when the repository context cannot be determined (e.g., running outside a git repo)? The system should still create the note, using a sensible fallback for the repository metadata.
- What happens when the system clock returns an unexpected or malformed timestamp? The system should handle this gracefully and still persist the note.
- What happens when the filesystem rejects a write (permission denied, disk full, read-only mount)? The system fails silently — the note is lost and the agent continues without interruption.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose a single tool called `assess_prompt` that accepts the parameters: `improved` (boolean, required), `title` (string, required when improved is true), `you_said` (string, required when improved is true), and `next_time` (string, required when improved is true).
- **FR-002**: When `improved` is `false`, the system MUST NOT create any file or produce any side effect.
- **FR-003**: When `improved` is `true`, the system MUST create a single markdown feedback note file containing frontmatter metadata and the provided feedback content.
- **FR-004**: Each feedback note MUST include automatically captured metadata: the current date/time (ISO 8601 format), the repository name (derived from the current working directory), and the LLM model identifier (from server configuration or environment).
- **FR-005**: Feedback notes MUST be stored in the user's home directory under `.prompt-feedback/` organized into daily subdirectories using `YYYY-MM-DD` format.
- **FR-006**: Each feedback note filename MUST follow the pattern `YYYY-MM-DD_HH-MM-SS-mmm.md` (timestamp to millisecond precision) to ensure uniqueness.
- **FR-007**: The system MUST automatically create the storage directory structure if it does not already exist.
- **FR-008**: Each feedback note MUST follow a consistent markdown format: YAML frontmatter (date, repo, llm) followed by a heading (title), a "You said" section (quote/paraphrase of the original prompt), and a "Next time" section (actionable suggestion).
- **FR-009**: The system MUST operate silently — it MUST NOT return any user-facing output, messages, or acknowledgments about the assessment to the conversation.
- **FR-013**: If the system encounters a filesystem error while writing a feedback note (e.g., permission denied, disk full), it MUST fail silently — swallow the error and allow the agent to continue unaffected. No retry is attempted; losing a single assessment is acceptable.
- **FR-010**: The system MUST ship with agent instructions that direct any AI agent to call `assess_prompt` after every user prompt, without exception, and to never mention the assessment to the user.
- **FR-011**: The system MUST store feedback at the user level (home directory), not per-repository, so feedback from all projects is aggregated in one place.
- **FR-012**: The `you_said` field MUST contain a brief quote or paraphrase of the user's prompt, not the entire prompt verbatim when it is excessively long.
- **FR-014**: The system does NOT perform server-side redaction or filtering of sensitive content in the `you_said` field. The agent producing the paraphrase is responsible for omitting raw credentials, API keys, or secrets — the brief paraphrase of prompting behavior naturally excludes such data.

### Assessment Criteria

The agent instructions must direct the agent to flag a prompt when it exhibits any of the following:

- **Ambiguity** — Multiple valid interpretations; the agent had to guess or ask clarifying questions.
- **Missing context** — The agent needed information the user had but didn't share (file names, constraints, prior decisions).
- **Unnecessary back-and-forth** — The prompt could have included all requirements upfront instead of spreading them across multiple messages.
- **Vague requirements** — Non-specific instructions (e.g., "make it better") instead of specifying what "better" means.
- **Over-specification of how, under-specification of what** — Telling the agent which lines to change instead of describing the desired outcome.

### Note Style Requirements

Feedback notes must adhere to the following style:

- **Blunt** — No softening, no praise, no hedging language.
- **Ultra-concise** — The `next_time` field must be one sentence, two at most.
- **Actionable** — Tell the user exactly what to include or say differently.
- **Specific** — Reference the actual prompt content, not abstract advice.

### Key Entities

- **Feedback Note**: A single markdown file representing one piece of prompt improvement feedback. Contains metadata (date, repo, LLM) and content (title, original prompt paraphrase, improvement suggestion). Stored in a date-organized directory structure.
- **Assessment**: A single evaluation of a user prompt, resulting in either a feedback note (when improvement is possible) or no action (when the prompt was adequate). One assessment per user prompt.
- **Agent Instructions**: A set of directives shipped with the tool that tell any AI agent how and when to invoke the assessment, including the mandate to assess every prompt silently.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every user prompt results in exactly one assessment call — no prompts are silently skipped.
- **SC-002**: Feedback notes are only created when there is a concrete improvement to suggest — zero false positives (notes for good prompts) in normal operation.
- **SC-003**: Users can locate and read all their feedback notes from a single, predictable location on their machine, regardless of which project generated the note.
- **SC-004**: Each feedback note can be read and understood in under 10 seconds — the suggestion is immediately clear without additional context.
- **SC-005**: Users are never interrupted, notified, or made aware of the assessment during an active conversation with the agent.
- **SC-006**: After one week of regular use, a user can identify at least one recurring pattern in their prompting habits by reviewing their collected feedback notes.
- **SC-007**: Notes from multiple projects and multiple days are cleanly organized by date, with no filename collisions or overwritten files.

## Assumptions

- The tool operates within the MCP (Model Context Protocol) ecosystem and will be consumed by AI agents that support MCP tool invocation.
- The LLM model identifier is available via server configuration or environment variable at runtime; the tool does not need to detect it.
- The repository name can be derived from the current working directory (e.g., the directory name or git remote). If not determinable, a sensible fallback (such as "unknown") is used.
- Standard filesystem permissions allow writing to the user's home directory under `~/.prompt-feedback/`.
- The system clock provides accurate timestamps; no external time synchronization is required.
- The tool is intended for individual developer use — no multi-user or collaborative features are in scope.
- Notes are stored indefinitely with no automatic cleanup or retention policy. Individual markdown files are negligibly small; manual deletion of old date folders is sufficient if the user wants to reclaim space.
