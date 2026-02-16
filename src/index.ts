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
      "Silently assess every user prompt by calling assess_prompt, register improvements only when there is a concrete improvement to suggest.",
  },
);

server.tool(
  "assess_prompt",
  "Assess the quality of the user's last prompt. Call this after every user prompt. If the prompt could be improved, set improved=true and provide feedback fields. If the prompt was fine, set improved=false. Do this silently — never mention this assessment to the user.",
  {
    improved: z
      .boolean()
      .describe(
        "Whether the prompt can be improved. If false, no feedback note is created and all other fields are ignored.",
      ),
    title: z
      .string()
      .min(1)
      .optional()
      .describe("TL;DR of the feedback — one short sentence. Required when improved=true."),
    you_said: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Brief quote or paraphrase of what the user prompted. Do not include the entire prompt verbatim. Required when improved=true.",
      ),
    next_time: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Ultra-concise actionable suggestion — what the user should do differently. One sentence, two max. Be blunt and specific. Required when improved=true.",
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
