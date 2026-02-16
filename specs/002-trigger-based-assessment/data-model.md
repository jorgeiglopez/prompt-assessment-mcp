# Data Model: Trigger-Based Holistic Assessment

**Branch**: `002-trigger-based-assessment` | **Date**: 2026-02-16

**Note**: This is an evolution of the 001 data model. Changes are marked with **[CHANGED]** or **[NEW]**.

## Entities

### AssessPromptParams (Input)

The parameters received by the `assess_prompt` MCP tool call.

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `improved` | `boolean` | Always | Must be `true` or `false`. Determines whether a note is created. |
| `trigger` | `string` (enum) | When `improved=true` | **[NEW]** Must be `"frustration"` or `"agent_mistake"`. Identifies which trigger condition was detected. |
| `title` | `string` | When `improved=true` | Non-empty. One short sentence — the TL;DR of the feedback. |
| `you_said` | `string[]` (array of strings) | When `improved=true` | **[CHANGED]** Non-empty array. Each element is a non-empty string — a brief quote or paraphrase of a single user prompt relevant to the issue. Minimum 1 element. |
| `next_time` | `string` | When `improved=true` | Non-empty. Actionable suggestion explaining how the prompts could be better. Must include a concrete example. |

**Validation rules**:
- If `improved` is `false`, all other fields are ignored (may be absent or empty).
- If `improved` is `true` and any of `trigger`, `title`, `you_said`, or `next_time` is missing or invalid, the tool returns an error to the agent (not to the user).
- `trigger` must be exactly `"frustration"` or `"agent_mistake"` — no other values accepted.
- `you_said` must contain at least one non-empty string.

### FeedbackNote (Output)

A single markdown file persisted to disk. Not a runtime object stored in memory — it exists only as a file.

| Field | Source | Location in File |
|-------|--------|-----------------|
| `date` | System clock (`new Date().toISOString()`) | YAML frontmatter |
| `repo` | Current working directory basename | YAML frontmatter |
| `llm` | Environment variable `PROMPT_FEEDBACK_LLM` or `"unknown"` | YAML frontmatter |
| `trigger` | **[NEW]** From `AssessPromptParams.trigger` | YAML frontmatter |
| `title` | From `AssessPromptParams.title` | H2 heading (`## {title}`) |
| `you_said` | **[CHANGED]** From `AssessPromptParams.you_said` (array) | Numbered list under bold label |
| `next_time` | From `AssessPromptParams.next_time` | Bold label + content |

**File template**:

```markdown
---
date: 2026-02-16T14:30:01.456Z
repo: my-project
llm: claude-sonnet-4.5
trigger: frustration
---

## Vague requirements caused repeated corrections

**You said:**

1. "add authentication to the app"
2. "no, I meant OAuth not basic auth"
3. "I already told you it needs Google login"

**Next time:** Specify the auth method and provider upfront: "Add OAuth2 authentication using Google as the identity provider, with session-based tokens." One prompt instead of three corrections.
```

### ServerConfig (Runtime)

Configuration resolved once at server startup. Not persisted. **NO CHANGES from 001.**

| Field | Source | Fallback |
|-------|--------|----------|
| `storagePath` | `$HOME/.prompt-feedback/` (from `os.homedir()`) | None — `os.homedir()` always returns a value |
| `llmModel` | `process.env.PROMPT_FEEDBACK_LLM` | `"unknown"` |
| `repoName` | `path.basename(process.cwd())` | `"unknown"` |

## Relationships

```text
AssessPromptParams ──(when improved=true)──> FeedbackNote (file on disk)
ServerConfig ──(provides metadata to)──> FeedbackNote (date, repo, llm fields)
AssessPromptParams.trigger ──(passed through to)──> FeedbackNote.trigger (frontmatter)
AssessPromptParams.you_said[] ──(rendered as numbered list in)──> FeedbackNote.you_said
```

## State Transitions

No change from 001. FeedbackNote is a write-once, immutable artifact.

```text
[Trigger detected] → agent evaluates holistically
                   → prompts were fine → improved=false → [No action]
                   → prompts could improve → improved=true → [FeedbackNote created] → [Done]
                                                             └─ write fails → [Silently swallowed] → [Done]

[No trigger] → [Tool not called] → [No action]
```

## Storage Layout

Unchanged from 001:

```text
~/.prompt-feedback/
├── 2026-02-14/
│   └── 2026-02-14_09-15-23-456.md    ← frustration trigger
├── 2026-02-15/
│   └── 2026-02-15_22-13-56-876.md    ← agent_mistake trigger
└── 2026-02-16/
    ├── 2026-02-16_08-00-00-000.md
    └── 2026-02-16_08-00-00-000-a3f.md   ← collision fallback (rare)
```

- Directory per day: `YYYY-MM-DD/`
- File per note: `YYYY-MM-DD_HH-MM-SS-mmm.md`
- Collision fallback: `YYYY-MM-DD_HH-MM-SS-mmm-xyz.md` (3-char random suffix)
