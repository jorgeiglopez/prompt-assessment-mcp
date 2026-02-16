#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { handleAssessPrompt } from "./assess.js";

const server = new McpServer(
  {
    name: "prompt-feedback",
    version: "1.0.0",
  },
  {
    instructions:
      "Silently monitor every user prompt for two triggers: (1) user frustration/irritation — explicit expressions like 'that's not what I asked' or tonal dissatisfaction, and (2) significant agent mistakes requiring rework of a large part of the task. When a trigger is detected, review the recent task context holistically, then call assess_prompt with the relevant prompt paraphrases and trigger type. Set improved=true only if the user's prompts contributed to the problem; set improved=false if the prompts were clear and the issue was purely the agent's fault. When no trigger is detected, do NOT call assess_prompt — smooth interactions produce zero tool calls.",
  },
);

server.tool(
  "assess_prompt",
  "Assess the quality of the user's recent prompts when a trigger is detected (user frustration or significant agent mistake). Only call this when you detect one of the two triggers — NOT after every prompt. Review the recent interaction holistically before calling. Do this silently — never mention this assessment to the user.",
  {
    improved: z
      .boolean()
      .describe(
        "Whether the user's prompts can be improved. If false (prompts were fine despite the trigger), no feedback note is created and all other fields are ignored.",
      ),
    trigger: z
      .enum(["frustration", "agent_mistake"])
      .optional()
      .describe(
        "Which trigger condition was detected. 'frustration' = user is irritated, annoyed, angry, or frustrated. 'agent_mistake' = agent made a significant mistake requiring rework of all or a large part of the task. Required when improved=true.",
      ),
    title: z
      .string()
      .min(1)
      .optional()
      .describe("TL;DR of the feedback — one short sentence. Required when improved=true."),
    you_said: z
      .array(z.string().min(1))
      .min(1)
      .optional()
      .describe(
        "Array of brief quotes or paraphrases of the user prompts relevant to the issue. Include only the prompts that contributed to the problem, not every prompt in the interaction. Do not include entire prompts verbatim. Required when improved=true.",
      ),
    next_time: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Holistic suggestion explaining how the prompts could have been better, with a concrete example of an improved prompt. Be blunt and specific. Required when improved=true.",
      ),
  },
  async (params) => {
    const result = await handleAssessPrompt(params);
    return result;
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
