## Prompt Feedback MCP Server

### Purpose

A tool that helps users become better prompters over time. After every user prompt, the AI agent assesses its quality and — only when there's a concrete improvement to suggest — writes a short, actionable note. The user reads these notes offline to identify patterns and sharpen their prompting habits.

### How It Works

1. The user sends a prompt
2. The AI agent processes it normally
3. **Mandatory:** The agent calls `assess_prompt` to evaluate the prompt's quality
4. The agent assesses whether the prompt had issues — ambiguity, missing context, unnecessary verbosity, vague requirements, anything that caused extra back-and-forth or wasted effort
5. If there's a concrete improvement to suggest → the tool writes a note
6. If the prompt was fine → the tool does nothing (no file created)

The agent does this silently. The user is never interrupted or told about the assessment in-conversation.

### The Tool: `assess_prompt`

**Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `improved` | boolean | yes | Whether the prompt can be improved. If `false`, no file is created. |
| `title` | string | when `improved=true` | TL;DR of the feedback — one short sentence |
| `you_said` | string | when `improved=true` | Brief quote or paraphrase of what the user prompted |
| `next_time` | string | when `improved=true` | Ultra-concise actionable suggestion — what to do differently |

The `repo`, `time`, and `llm` metadata are captured automatically by the server (repo from cwd, time from system clock, llm passed via server config or environment).

### File Format

Each note is a single markdown file stored in `~/.prompt-feedback/YYYY-MM-DD/`.

```markdown
---
date: 2026-02-15T22:13:56.876Z
repo: ai-journal-mcp
llm: claude-sonnet-4.5
---

## Be specific about the file format you want

**You said:** "make the filenames human readable"

**Next time:** "Rename journal files to YYYY-MM-DD_HH-MM-SS.md format"
```

### Assessment Criteria

The agent should flag a prompt when it has any of these issues:

- **Ambiguity** — Multiple valid interpretations; the agent had to guess or ask clarifying questions
- **Missing context** — The agent needed information the user had but didn't share (file names, constraints, prior decisions)
- **Unnecessary back-and-forth** — The prompt could have included all requirements upfront instead of drip-feeding them across multiple messages
- **Vague requirements** — "Make it better" instead of specifying what "better" means
- **Over-specification of how, under-specification of what** — Telling the agent which lines to change instead of describing the desired outcome

### Note Style

Notes must be:
- **Blunt** — No softening, no praise, no "great question but..."
- **Ultra-concise** — The `next_time` field should be one sentence, two max
- **Actionable** — Tell the user exactly what to include or say differently
- **Specific** — Reference the actual prompt, not abstract advice

Bad: "Next time, provide more context about your requirements."
Good: "Next time: 'Rename files to YYYY-MM-DD_HH-MM-SS.md format' — don't make me guess the format."

### Storage

- Location: `~/.prompt-feedback/YYYY-MM-DD/`
- Filename: `YYYY-MM-DD_HH-MM-SS-mmm.md`
- One file per note, only created when there's feedback to give
- User-level storage (not per-repo) so it works as an aggregator across all projects

### Agent Instructions

The tool ships with instructions that tell any AI agent:

> After every user prompt, call `assess_prompt`. Evaluate whether the prompt was clear, complete, and efficient. If it could be improved, set `improved=true` and write a blunt, one-sentence suggestion. If the prompt was fine, set `improved=false` and move on. Do this silently — never mention this assessment to the user.
