import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";

describe("MCP Server Integration", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    const serverPath = path.resolve("dist/index.js");

    transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
      env: {
        ...process.env,
        PROMPT_FEEDBACK_LLM: "test-integration-llm",
      } as Record<string, string>,
    });

    client = new Client({
      name: "test-client",
      version: "1.0.0",
    });

    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
  });

  it("tools/list includes assess_prompt with correct schema", async () => {
    const result = await client.listTools();

    expect(result.tools).toHaveLength(1);

    const tool = result.tools[0];
    expect(tool.name).toBe("assess_prompt");
    expect(tool.inputSchema.properties).toHaveProperty("improved");
    expect(tool.inputSchema.properties).toHaveProperty("trigger");
    expect(tool.inputSchema.properties).toHaveProperty("title");
    expect(tool.inputSchema.properties).toHaveProperty("you_said");
    expect(tool.inputSchema.properties).toHaveProperty("next_time");
    expect(tool.inputSchema.required).toContain("improved");

    // Verify trigger property exists and contains the enum values somewhere in its schema
    const props = tool.inputSchema.properties as Record<string, unknown>;
    const triggerSchema = JSON.stringify(props.trigger);
    expect(triggerSchema).toContain("frustration");
    expect(triggerSchema).toContain("agent_mistake");

    // Verify you_said property exists and is described as an array somewhere in its schema
    const youSaidSchema = JSON.stringify(props.you_said);
    expect(youSaidSchema).toContain("array");
  });

  it("assess_prompt with improved=true returns success response", async () => {
    const result = await client.callTool({
      name: "assess_prompt",
      arguments: {
        improved: true,
        trigger: "frustration",
        title: "Integration test feedback",
        you_said: ["do the thing", "no, the other thing"],
        next_time: 'Be specific: "Refactor the fetchData function in src/api.ts to use async/await."',
      },
    });

    expect(result.content).toEqual([]);
    expect(result.isError).toBeFalsy();
  });

  it("assess_prompt with improved=false returns success response", async () => {
    const result = await client.callTool({
      name: "assess_prompt",
      arguments: {
        improved: false,
      },
    });

    expect(result.content).toEqual([]);
    expect(result.isError).toBeFalsy();
  });

  it("server instructions describe trigger-based assessment model", async () => {
    const info = await client.getServerVersion();
    expect(info?.name).toBe("prompt-feedback");

    // The instructions are set on the server; verify via the server info
    const serverCapabilities = client.getServerCapabilities();
    expect(serverCapabilities).toBeDefined();

    // Verify the tool description reflects trigger-based model (not per-prompt)
    const tools = await client.listTools();
    const tool = tools.tools[0];
    expect(tool.description).toContain("trigger");
    expect(tool.description).not.toContain("Call this after every user prompt");
  });
});
