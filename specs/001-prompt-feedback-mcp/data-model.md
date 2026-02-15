# Data Model: Prompt Feedback MCP Server

**Branch**: `001-prompt-feedback-mcp` | **Date**: 2026-02-16

## Entities

### AssessPromptParams (Input)

The parameters received by the `assess_prompt` MCP tool call.

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `improved` | `boolean` | Always | Must be `true` or `false`. Determines whether a note is created. |
| `title` | `string` | When `improved=true` | Non-empty. One short sentence — the TL;DR of the feedback. |
| `you_said` | `string` | When `improved=true` | Non-empty. Brief quote or paraphrase of the user's prompt. |
| `next_time` | `string` | When `improved=true` | Non-empty. Actionable suggestion — one sentence, two max. |

**Validation rules**:
- If `improved` is `false`, the other fields are ignored (may be absent or empty).
- If `improved` is `true` and any of `title`, `you_said`, or `next_time` is missing or empty, the tool returns an error to the agent (not to the user).

### FeedbackNote (Output)

A single markdown file persisted to disk. Not a runtime object stored in memory — it exists only as a file.

| Field | Source | Location in File |
|-------|--------|-----------------|
| `date` | System clock (`new Date().toISOString()`) | YAML frontmatter |
| `repo` | Current working directory basename | YAML frontmatter |
| `llm` | Environment variable `PROMPT_FEEDBACK_LLM` or `"unknown"` | YAML frontmatter |
| `title` | From `AssessPromptParams.title` | H2 heading (`## {title}`) |
| `you_said` | From `AssessPromptParams.you_said` | Bold label + content (`**You said:** "{you_said}"`) |
| `next_time` | From `AssessPromptParams.next_time` | Bold label + content (`**Next time:** {next_time}`) |

**File template**:

```markdown
---
date: 2026-02-15T22:13:56.876Z
repo: ai-journal-mcp
llm: claude-sonnet-4.5
---

## Be specific about the file format you want

**You said:** "make the filenames human readable"

**Next time:** Rename journal files to YYYY-MM-DD_HH-MM-SS.md format — don't make me guess the format.
```

### ServerConfig (Runtime)

Configuration resolved once at server startup. Not persisted.

| Field | Source | Fallback |
|-------|--------|----------|
| `storagePath` | `$HOME/.prompt-feedback/` (from `os.homedir()`) | None — `os.homedir()` always returns a value |
| `llmModel` | `process.env.PROMPT_FEEDBACK_LLM` | `"unknown"` |
| `repoName` | `path.basename(process.cwd())` | `"unknown"` |

## Relationships

```text
AssessPromptParams ──(when improved=true)──> FeedbackNote (file on disk)
ServerConfig ──(provides metadata to)──> FeedbackNote (date, repo, llm fields)
```

## State Transitions

There are no state transitions. FeedbackNote is a write-once, immutable artifact. Once created, it is never modified or deleted by the system.

```text
[Tool called] → improved=false → [No action]
[Tool called] → improved=true  → [FeedbackNote created] → [Done]
                                  └─ write fails → [Silently swallowed] → [Done]
```

## Storage Layout

```text
~/.prompt-feedback/
├── 2026-02-14/
│   ├── 2026-02-14_09-15-23-456.md
│   └── 2026-02-14_14-30-01-012.md
├── 2026-02-15/
│   └── 2026-02-15_22-13-56-876.md
└── 2026-02-16/
    ├── 2026-02-16_08-00-00-000.md
    └── 2026-02-16_08-00-00-000-a3f.md   ← collision fallback (rare)
```

- Directory per day: `YYYY-MM-DD/`
- File per note: `YYYY-MM-DD_HH-MM-SS-mmm.md`
- Collision fallback: `YYYY-MM-DD_HH-MM-SS-mmm-xyz.md` (3-char random suffix)
