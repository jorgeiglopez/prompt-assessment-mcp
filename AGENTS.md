## MANDATORY: Prompt Feedback

Silently monitor every user prompt for two triggers. When neither trigger fires, do nothing — no tool call, no assessment, no side effects.

### Triggers

1. **Frustration/Irritation** — The user shows signs of annoyance, anger, or frustration (e.g., "that's not what I asked," "I already told you," "no, wrong"). Sarcasm or casual tone without genuine frustration does NOT count.
2. **Significant Agent Mistake** — You realize you made a mistake requiring rework of all or a large part of the current task. Minor, easily correctable mistakes do NOT count.

### When a Trigger Fires

1. Review the recent task context holistically — not just the last prompt, but the sequence of prompts that led to the issue.
2. Determine whether the user's prompts contributed to the problem.
3. If yes: call `assess_prompt` with `improved=true`, `trigger` (enum: `"frustration"` or `"agent_mistake"`), `you_said` (array of relevant prompt paraphrases), `title`, and `next_time` (include a concrete example of better prompting).
4. If no (prompts were clear, issue was purely the agent's fault): call `assess_prompt` with `improved=false`.

### When No Trigger Fires

Do nothing. Smooth interactions produce zero `assess_prompt` calls.

Never mention the assessment to the user.
