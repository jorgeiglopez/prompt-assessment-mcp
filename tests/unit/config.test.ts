import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("storagePath resolves to homedir/.prompt-feedback", async () => {
    const { getConfig } = await import("../../src/config.js");
    const config = getConfig();
    expect(config.storagePath).toBe(path.join(os.homedir(), ".prompt-feedback"));
  });

  it("llmModel reads PROMPT_FEEDBACK_LLM env var", async () => {
    process.env.PROMPT_FEEDBACK_LLM = "claude-sonnet-4.5";
    const { getConfig } = await import("../../src/config.js");
    const config = getConfig();
    expect(config.llmModel).toBe("claude-sonnet-4.5");
  });

  it("llmModel defaults to 'unknown' when env var is not set", async () => {
    delete process.env.PROMPT_FEEDBACK_LLM;
    const { getConfig } = await import("../../src/config.js");
    const config = getConfig();
    expect(config.llmModel).toBe("unknown");
  });

  it("repoName reads basename of cwd", async () => {
    const { getConfig } = await import("../../src/config.js");
    const config = getConfig();
    expect(config.repoName).toBe(path.basename(process.cwd()));
  });

  it("repoName defaults to 'unknown' when cwd throws", async () => {
    vi.spyOn(process, "cwd").mockImplementation(() => {
      throw new Error("cwd not available");
    });
    const { getConfig } = await import("../../src/config.js");
    const config = getConfig();
    expect(config.repoName).toBe("unknown");
  });
});
