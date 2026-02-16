# Feature Specification: Trigger-Based Holistic Assessment

**Feature Branch**: `002-trigger-based-assessment`  
**Created**: 2026-02-16  
**Status**: Draft  
**Input**: User description: "Change prompt assessment from per-prompt evaluation to trigger-based holistic assessment. Instead of assessing every prompt individually, the agent should only assess when it detects user frustration/irritation or when the agent has made a significant mistake requiring rework. When triggered, the assessment covers the recent interaction holistically (task-based). The you_said field becomes an array of prompts, and next_time provides improvement guidance with examples."

## Clarifications

### Session 2026-02-16

- Q: Should the tool/note capture which trigger type fired (frustration vs. agent mistake) for pattern analysis? → A: Yes. Add a `trigger` parameter (enum: `"frustration"` | `"agent_mistake"`) to the tool schema; include it in the note's frontmatter metadata.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Frustration-Triggered Holistic Assessment (Priority: P1)

A user is working with an AI agent on a task across multiple prompts. The interaction goes poorly — the user becomes visibly frustrated, using language like "no, that's not what I meant" or "I already told you this." The agent detects this frustration signal and triggers an assessment. Rather than evaluating just the last prompt, the agent reviews the recent interaction holistically — looking at the full sequence of prompts that led to the frustration. A feedback note is created capturing the relevant prompts and a concrete suggestion for how the user could have communicated more effectively from the start.

**Why this priority**: This is the core trigger mechanism and the primary way assessments are generated. Without frustration detection, the tool never fires. This replaces the old per-prompt model and is the fundamental behavioral change.

**Independent Test**: Can be fully tested by simulating a multi-prompt interaction where the user expresses frustration, then verifying a feedback note was created that references multiple prompts from the interaction and provides holistic guidance.

**Acceptance Scenarios**:

1. **Given** a user sends several prompts for a task and then expresses frustration (e.g., "that's still wrong, I said X not Y"), **When** the agent detects the frustration signal, **Then** the agent calls the assessment tool with `improved=true`, an array of relevant prompt paraphrases in `you_said`, and a holistic improvement suggestion in `next_time`.
2. **Given** a user expresses mild irritation in a single prompt (e.g., "no, the other file"), **When** the agent detects this as a frustration signal, **Then** the assessment covers the relevant preceding prompts that contributed to the miscommunication, not just the irritated prompt.
3. **Given** a user is frustrated but the cause was entirely the agent's fault (not a prompting issue), **When** the agent assesses the interaction, **Then** the agent sets `improved=false` — no note is created because the user's prompts were not the problem.

---

### User Story 2 - Agent-Mistake-Triggered Holistic Assessment (Priority: P1)

An AI agent is working on a task and makes a significant mistake — for example, it builds the wrong component, misinterprets the architecture, or takes an approach that requires scrapping and redoing most of the work. The agent recognizes this major rework moment and triggers an assessment. The agent reviews the user's prompts leading up to the mistake to determine whether clearer prompting could have prevented it. If so, a feedback note captures the relevant prompts and explains how they could have been more explicit.

**Why this priority**: Equally critical to User Story 1. Agent mistakes that require major rework represent the highest-cost failures in AI-assisted development. If the user's prompting contributed to the mistake, this is exactly where feedback has the most value.

**Independent Test**: Can be fully tested by simulating an interaction where the agent realizes it needs to redo significant work, then verifying the assessment evaluates whether the user's prompts were a contributing factor and creates a note only if they were.

**Acceptance Scenarios**:

1. **Given** an agent realizes it made a significant mistake requiring rework of all or a large part of the current task, **When** the agent evaluates the interaction, **Then** the agent calls the assessment tool to determine if the user's prompts contributed to the mistake.
2. **Given** the agent's mistake was caused by ambiguous or incomplete user prompts, **When** the assessment is triggered, **Then** a feedback note is created with the relevant prompt paraphrases and a suggestion for how clearer instructions would have prevented the mistake.
3. **Given** the agent's mistake was entirely the agent's own error (the user's prompts were clear), **When** the assessment is triggered, **Then** the agent sets `improved=false` and no note is created.

---

### User Story 3 - No Assessment for Smooth Interactions (Priority: P1)

A user and agent work through a task smoothly. The user sends clear prompts, the agent responds correctly, and the task is completed without friction. No frustration is detected and no major mistakes occur. The assessment tool is never called during this interaction. The user's feedback directory remains clean — no noise, no false positives.

**Why this priority**: Equally critical as the trigger stories. The old model assessed every single prompt, creating noise. The entire point of this change is that smooth interactions produce zero assessments. If the tool still fires on every prompt, the redesign has failed.

**Independent Test**: Can be fully tested by running a smooth multi-prompt interaction and verifying the assessment tool was never called and no feedback files were created.

**Acceptance Scenarios**:

1. **Given** a user sends multiple clear prompts and the agent completes the task correctly, **When** no frustration is detected and no major mistakes occur, **Then** the assessment tool is not called at all.
2. **Given** a user sends a single clear prompt and the agent responds correctly, **When** the interaction completes, **Then** no feedback note exists for this interaction.

---

### User Story 4 - Holistic Multi-Prompt Capture in Feedback Note (Priority: P2)

When a triggered assessment identifies user prompts that could be improved, the feedback note captures all the relevant prompts as an array — not just the last one. This allows the user to see the full picture: how the sequence of prompts collectively led to the problem. The `next_time` suggestion references the overall pattern and includes an example of how the prompts could have been combined or improved.

**Why this priority**: This is the output format change. Once triggers work (P1), the note needs to capture the right data. An array of prompts gives the user a holistic view of their interaction patterns, which is the stated goal of this redesign.

**Independent Test**: Can be fully tested by triggering an assessment over a multi-prompt interaction and verifying the resulting feedback note contains an array of prompt paraphrases and a holistic improvement example.

**Acceptance Scenarios**:

1. **Given** an assessment is triggered after a 4-prompt interaction where prompts 1, 2, and 4 were relevant to the issue, **When** the note is created, **Then** `you_said` contains an array with paraphrases of prompts 1, 2, and 4 (not necessarily all prompts from the interaction — only the relevant ones).
2. **Given** an assessment is triggered after a single-prompt interaction, **When** the note is created, **Then** `you_said` contains an array with one element.
3. **Given** the `next_time` suggestion is written, **When** the user reads it, **Then** it explains the pattern across the prompts and includes a concrete example of what a better prompt would look like.

---

### Edge Cases

- What happens when a user is mildly sarcastic but not genuinely frustrated? The agent should err on the side of not triggering — sarcasm or casual tone without genuine frustration should not produce an assessment.
- What happens when the agent makes a small, easily correctable mistake (not requiring major rework)? Small mistakes do not qualify as a trigger — only significant mistakes requiring rework of all or a large portion of the task.
- What happens when user frustration is directed at an external system (not the agent or the prompting)? The agent should not trigger an assessment for frustration unrelated to the agent interaction.
- What happens when the agent triggers an assessment but realizes all prompts were clear and well-formed? The agent sets `improved=false` and no note is created. The trigger fires the evaluation, but the evaluation can still conclude the prompts were fine.
- What happens when the interaction spans many prompts but only one is relevant to the issue? The `you_said` array should contain only that one prompt paraphrase — the array length varies based on relevance, not interaction length.
- What happens when multiple triggers fire in the same session (e.g., frustration at prompt 5 and a major mistake at prompt 12)? Each trigger produces its own independent assessment and potentially its own feedback note.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a single tool called `assess_prompt` that accepts the parameters: `improved` (boolean, required), `trigger` (enum: `"frustration"` | `"agent_mistake"`, required when improved is true), `title` (string, required when improved is true), `you_said` (array of strings, required when improved is true), and `next_time` (string, required when improved is true).
- **FR-002**: The `you_said` parameter MUST be an array of strings, where each element is a brief quote or paraphrase of a user prompt relevant to the issue being assessed.
- **FR-003**: When `improved` is `false`, the system MUST NOT create any file or produce any side effect.
- **FR-004**: When `improved` is `true`, the system MUST create a single markdown feedback note file containing frontmatter metadata and the provided feedback content.
- **FR-005**: Each feedback note MUST include automatically captured metadata: the current date/time (ISO 8601 format), the repository name (derived from the current working directory), the LLM model identifier (from server configuration or environment), and the trigger type (`frustration` or `agent_mistake`).
- **FR-006**: Feedback notes MUST be stored in the user's home directory under `.prompt-feedback/` organized into daily subdirectories using `YYYY-MM-DD` format.
- **FR-007**: Each feedback note filename MUST follow the pattern `YYYY-MM-DD_HH-MM-SS-mmm.md` (timestamp to millisecond precision) to ensure uniqueness.
- **FR-008**: The system MUST automatically create the storage directory structure if it does not already exist.
- **FR-009**: Each feedback note MUST follow a consistent markdown format: YAML frontmatter (date, repo, llm, trigger) followed by a heading (title), a "You said" section listing each prompt from the array, and a "Next time" section with the actionable suggestion and example.
- **FR-010**: The system MUST operate silently — it MUST NOT return any user-facing output, messages, or acknowledgments about the assessment to the conversation.
- **FR-011**: If the system encounters a filesystem error while writing a feedback note, it MUST fail silently — swallow the error and allow the agent to continue unaffected.
- **FR-012**: The system MUST ship with agent instructions that direct any AI agent to call `assess_prompt` only when specific triggers are detected (user frustration/irritation or significant agent mistake requiring rework), not after every prompt.
- **FR-013**: The system MUST store feedback at the user level (home directory), not per-repository, so feedback from all projects is aggregated in one place.
- **FR-014**: Each element in the `you_said` array MUST contain a brief quote or paraphrase of a single user prompt, not the entire prompt verbatim when it is excessively long.
- **FR-015**: The `next_time` field MUST explain how the prompts could have been better and MUST include a concrete example of an improved prompt.
- **FR-016**: The system does NOT perform server-side redaction or filtering of sensitive content in the `you_said` array. The agent producing the paraphrases is responsible for omitting raw credentials, API keys, or secrets.

### Trigger Criteria

The agent instructions must direct the agent to trigger an assessment ONLY when one of the following conditions is detected:

- **Trigger 1: User Frustration** — The user exhibits signs of irritation, annoyance, anger, or frustration in their prompts. This includes explicit expressions ("that's not what I asked," "I already told you," "no, wrong") and tonal indicators of dissatisfaction with the interaction.
- **Trigger 2: Significant Agent Mistake** — The agent realizes it has made a mistake that requires redoing all or a large part of the current task. Minor, easily correctable mistakes do not qualify.

When a trigger fires, the agent must:

1. Review the recent prompts holistically (the current task context, not necessarily the entire session).
2. Determine whether the user's prompts contributed to the problem.
3. If yes: call `assess_prompt` with `improved=true`, populating `you_said` with the relevant prompt paraphrases and `next_time` with holistic guidance including an example.
4. If no (the user's prompts were clear and the issue was purely the agent's fault): call `assess_prompt` with `improved=false`.

### Note Style Requirements

Feedback notes must adhere to the following style:

- **Blunt** — No softening, no praise, no hedging language.
- **Holistic** — Address the pattern across multiple prompts, not individual prompt deficiencies.
- **Example-driven** — The `next_time` field must include a concrete example of what better prompting would look like for this specific situation.
- **Actionable** — Tell the user exactly what to include or say differently.
- **Specific** — Reference the actual prompt content from the interaction, not abstract advice.

### Key Entities

- **Feedback Note**: A single markdown file representing holistic prompt improvement feedback for a triggered interaction. Contains metadata (date, repo, LLM, trigger type) and content (title, array of relevant prompt paraphrases, improvement suggestion with example). Stored in a date-organized directory structure.
- **Assessment Trigger**: A detected event (user frustration or significant agent mistake) that initiates the holistic assessment process. Does not guarantee a feedback note — the assessment may conclude the user's prompts were fine.
- **Task Context**: The recent sequence of user prompts and agent responses forming a coherent unit of work. The scope the agent evaluates holistically when an assessment is triggered.
- **Agent Instructions**: A set of directives shipped with the tool that tell any AI agent how to detect triggers, when to invoke the assessment, and how to perform holistic evaluation of the recent interaction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Assessments are triggered only by user frustration or significant agent mistakes — zero assessments are generated during smooth, friction-free interactions.
- **SC-002**: Feedback notes are only created when the user's prompts contributed to the problem — zero notes are created when the issue was entirely the agent's fault.
- **SC-003**: Each feedback note captures the holistic interaction context via an array of relevant prompt paraphrases, not just a single prompt.
- **SC-004**: Each `next_time` suggestion includes a concrete example of improved prompting for the specific situation.
- **SC-005**: Users can locate and read all their feedback notes from a single, predictable location on their machine, regardless of which project generated the note.
- **SC-006**: Each feedback note can be read and understood in under 30 seconds — the pattern across prompts and the improvement suggestion are immediately clear.
- **SC-007**: Users are never interrupted, notified, or made aware of the assessment during an active conversation with the agent.
- **SC-008**: After two weeks of regular use, a user can identify at least one recurring interaction pattern in their prompting habits by reviewing their collected feedback notes.

## Assumptions

- The tool operates within the MCP (Model Context Protocol) ecosystem and will be consumed by AI agents that support MCP tool invocation.
- The LLM model identifier is available via server configuration or environment variable at runtime; the tool does not need to detect it.
- The repository name can be derived from the current working directory. If not determinable, a sensible fallback (such as "unknown") is used.
- Standard filesystem permissions allow writing to the user's home directory under `~/.prompt-feedback/`.
- The system clock provides accurate timestamps.
- The tool is intended for individual developer use — no multi-user or collaborative features are in scope.
- Notes are stored indefinitely with no automatic cleanup or retention policy.
- Trigger detection (frustration, agent mistakes) is the agent's responsibility based on the provided instructions. The MCP server does not perform trigger detection — it only receives and persists the assessment results.
- The agent has sufficient context awareness to review recent prompts holistically when a trigger fires. The MCP server does not maintain conversation history.
- A "significant mistake" is defined as one requiring rework of all or a large portion of the task at hand — not minor corrections or adjustments.
