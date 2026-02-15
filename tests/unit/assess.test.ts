import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

describe("handleAssessPrompt", () => {
  let tmpDir: string;

  beforeEach(async () => {
    vi.resetModules();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "prompt-feedback-assess-test-"));
    // Override config to use tmpDir
    vi.doMock("../../src/config.js", () => ({
      getConfig: () => ({
        storagePath: tmpDir,
        llmModel: "test-model",
        repoName: "test-repo",
      }),
    }));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("improved=true with valid params calls writeNote and returns empty content", async () => {
    const { handleAssessPrompt } = await import("../../src/assess.js");

    const result = await handleAssessPrompt({
      improved: true,
      title: "Be more specific",
      you_said: "make it better",
      next_time: "Specify exactly what to improve and in which file.",
    });

    expect(result.content).toEqual([]);
    expect(result.isError).toBeUndefined();

    // Verify a note was written
    const dateDirs = await fs.readdir(tmpDir);
    expect(dateDirs.length).toBe(1);

    const files = await fs.readdir(path.join(tmpDir, dateDirs[0]));
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/\.md$/);

    const content = await fs.readFile(path.join(tmpDir, dateDirs[0], files[0]), "utf-8");
    expect(content).toContain("## Be more specific");
    expect(content).toContain('**You said:** "make it better"');
    expect(content).toContain("**Next time:** Specify exactly what to improve and in which file.");
  });

  it("improved=true with missing title returns error", async () => {
    const { handleAssessPrompt } = await import("../../src/assess.js");

    const result = await handleAssessPrompt({
      improved: true,
      you_said: "make it better",
      next_time: "Be specific.",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("title");
  });

  it("improved=true with missing you_said returns error", async () => {
    const { handleAssessPrompt } = await import("../../src/assess.js");

    const result = await handleAssessPrompt({
      improved: true,
      title: "Be more specific",
      next_time: "Be specific.",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("you_said");
  });

  it("improved=true with missing next_time returns error", async () => {
    const { handleAssessPrompt } = await import("../../src/assess.js");

    const result = await handleAssessPrompt({
      improved: true,
      title: "Be more specific",
      you_said: "make it better",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("next_time");
  });

  it("filesystem error is swallowed silently (no throw)", async () => {
    // Mock config to use an invalid path
    vi.doMock("../../src/config.js", () => ({
      getConfig: () => ({
        storagePath: "/nonexistent/deeply/nested/path/that/does/not/exist",
        llmModel: "test-model",
        repoName: "test-repo",
      }),
    }));

    // Need to re-import to get the new mock
    vi.resetModules();
    vi.doMock("../../src/config.js", () => ({
      getConfig: () => ({
        storagePath: "/nonexistent/deeply/nested/path/that/does/not/exist",
        llmModel: "test-model",
        repoName: "test-repo",
      }),
    }));

    const { handleAssessPrompt } = await import("../../src/assess.js");

    // This should NOT throw — errors are swallowed per FR-013
    const result = await handleAssessPrompt({
      improved: true,
      title: "Be more specific",
      you_said: "make it better",
      next_time: "Specify exactly what to improve.",
    });

    expect(result.content).toEqual([]);
    expect(result.isError).toBeUndefined();
  });

  // --- User Story 2: improved=false produces no note ---

  it("improved=false returns empty content without calling writeNote", async () => {
    const { handleAssessPrompt } = await import("../../src/assess.js");

    const result = await handleAssessPrompt({
      improved: false,
    });

    expect(result.content).toEqual([]);
    expect(result.isError).toBeUndefined();

    // Verify no files were written
    const entries = await fs.readdir(tmpDir);
    expect(entries.length).toBe(0);
  });

  it("improved=false ignores title/you_said/next_time fields even if provided", async () => {
    const { handleAssessPrompt } = await import("../../src/assess.js");

    const result = await handleAssessPrompt({
      improved: false,
      title: "This should be ignored",
      you_said: "This should also be ignored",
      next_time: "And this too",
    });

    expect(result.content).toEqual([]);
    expect(result.isError).toBeUndefined();

    // Verify no files were written
    const entries = await fs.readdir(tmpDir);
    expect(entries.length).toBe(0);
  });

  it("multiple improved=false calls produce zero files", async () => {
    const { handleAssessPrompt } = await import("../../src/assess.js");

    await handleAssessPrompt({ improved: false });
    await handleAssessPrompt({ improved: false });
    await handleAssessPrompt({ improved: false });

    // Verify no files were written
    const entries = await fs.readdir(tmpDir);
    expect(entries.length).toBe(0);
  });
});
