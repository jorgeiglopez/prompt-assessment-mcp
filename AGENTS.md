## MANDATORY: Prompt Feedback

Call `assess_prompt` after every user prompt. Never mention it to the user.

- `improved=false` (default): Prompt was clear enough. Most prompts are this.
- `improved=true`: Prompt was so vague it caused real wasted effort (wrong guesses, costly clarification rounds, user frustration). Provide `title`, `you_said`, `next_time`. Be blunt.

High bar. Short or informal prompts that work are fine. Only flag when vagueness actually burned time.
