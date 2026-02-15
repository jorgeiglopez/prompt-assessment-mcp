import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { formatNote, generateFilename, getDateDirectory, writeNote } from "../../src/writer.js";
import type { NoteContent, NoteMetadata } from "../../src/writer.js";

const sampleContent: NoteContent = {
  title: "Be specific about the file format you want",
  you_said: "make the filenames human readable",
  next_time:
    "Rename journal files to YYYY-MM-DD_HH-MM-SS.md format — don't make me guess the format.",
};

const sampleMetadata: NoteMetadata = {
  date: "2026-02-15T22:13:56.876Z",
  repo: "ai-journal-mcp",
  llm: "claude-sonnet-4.5",
};

describe("formatNote", () => {
  it("produces correct markdown with YAML frontmatter and body", () => {
    const result = formatNote(sampleContent, sampleMetadata);

    expect(result).toContain("---");
    expect(result).toContain("date: 2026-02-15T22:13:56.876Z");
    expect(result).toContain("repo: ai-journal-mcp");
    expect(result).toContain("llm: claude-sonnet-4.5");
    expect(result).toContain("## Be specific about the file format you want");
    expect(result).toContain('**You said:** "make the filenames human readable"');
    expect(result).toContain(
      "**Next time:** Rename journal files to YYYY-MM-DD_HH-MM-SS.md format",
    );
  });

  it("starts with YAML frontmatter delimiters", () => {
    const result = formatNote(sampleContent, sampleMetadata);
    const lines = result.split("\n");
    expect(lines[0]).toBe("---");
    expect(lines[4]).toBe("---");
  });
});

describe("generateFilename", () => {
  it("produces YYYY-MM-DD_HH-MM-SS-mmm.md format", () => {
    const date = new Date("2026-02-15T22:13:56.876Z");
    const filename = generateFilename(date);

    // The exact output depends on timezone, but the format should match
    expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}\.md$/);
  });

  it("pads single-digit values with zeros", () => {
    // January 5th, 3:02:01.009
    const date = new Date(2026, 0, 5, 3, 2, 1, 9);
    const filename = generateFilename(date);

    expect(filename).toBe("2026-01-05_03-02-01-009.md");
  });
});

describe("getDateDirectory", () => {
  it("returns YYYY-MM-DD format", () => {
    const date = new Date(2026, 1, 15, 22, 13, 56, 876);
    const dir = getDateDirectory(date);
    expect(dir).toBe("2026-02-15");
  });
});

describe("writeNote", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "prompt-feedback-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("creates date directory with mkdir recursive", async () => {
    const filePath = await writeNote(tmpDir, sampleContent, sampleMetadata);

    // Derive expected date dir from the same date object the writer uses
    const expectedDateDir = getDateDirectory(new Date(sampleMetadata.date));
    const dateDir = path.join(tmpDir, expectedDateDir);
    const stat = await fs.stat(dateDir);
    expect(stat.isDirectory()).toBe(true);
    expect(filePath.startsWith(dateDir)).toBe(true);
  });

  it("writes file to correct path", async () => {
    const filePath = await writeNote(tmpDir, sampleContent, sampleMetadata);

    const fileContent = await fs.readFile(filePath, "utf-8");
    expect(fileContent).toContain("date: 2026-02-15T22:13:56.876Z");
    expect(fileContent).toContain("## Be specific about the file format you want");
  });

  it("collision fallback appends 3-char suffix when file exists", async () => {
    // Write the first note
    const firstPath = await writeNote(tmpDir, sampleContent, sampleMetadata);

    // Write a second note with the same timestamp — should trigger collision fallback
    const secondPath = await writeNote(tmpDir, sampleContent, sampleMetadata);

    expect(secondPath).not.toBe(firstPath);
    // Second filename should have a suffix before .md
    const secondFilename = path.basename(secondPath);
    expect(secondFilename).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}-.{3}\.md$/);

    // Both files should exist and have content
    const firstContent = await fs.readFile(firstPath, "utf-8");
    const secondContent = await fs.readFile(secondPath, "utf-8");
    expect(firstContent).toContain("date: 2026-02-15T22:13:56.876Z");
    expect(secondContent).toContain("date: 2026-02-15T22:13:56.876Z");
  });

  // --- User Story 3: Cross-project and date organization ---

  it("notes from different repos written to same date directory", async () => {
    const metadata1: NoteMetadata = {
      date: "2026-02-16T10:00:00.000Z",
      repo: "project-alpha",
      llm: "claude-sonnet-4.5",
    };
    const metadata2: NoteMetadata = {
      date: "2026-02-16T10:00:01.000Z",
      repo: "project-beta",
      llm: "gpt-4o",
    };

    const path1 = await writeNote(tmpDir, sampleContent, metadata1);
    const path2 = await writeNote(tmpDir, sampleContent, metadata2);

    // Both should be in the same date directory
    expect(path.dirname(path1)).toBe(path.dirname(path2));
  });

  it("each note frontmatter contains correct repo name", async () => {
    const metadata1: NoteMetadata = {
      date: "2026-02-16T10:00:00.000Z",
      repo: "project-alpha",
      llm: "claude-sonnet-4.5",
    };
    const metadata2: NoteMetadata = {
      date: "2026-02-16T10:00:01.000Z",
      repo: "project-beta",
      llm: "gpt-4o",
    };

    const path1 = await writeNote(tmpDir, sampleContent, metadata1);
    const path2 = await writeNote(tmpDir, sampleContent, metadata2);

    const content1 = await fs.readFile(path1, "utf-8");
    const content2 = await fs.readFile(path2, "utf-8");

    expect(content1).toContain("repo: project-alpha");
    expect(content2).toContain("repo: project-beta");
  });

  it("notes across multiple days create separate date directories", async () => {
    const metadataDay1: NoteMetadata = {
      date: "2026-02-15T10:00:00.000Z",
      repo: "test-repo",
      llm: "test-llm",
    };
    const metadataDay2: NoteMetadata = {
      date: "2026-02-16T10:00:00.000Z",
      repo: "test-repo",
      llm: "test-llm",
    };

    const path1 = await writeNote(tmpDir, sampleContent, metadataDay1);
    const path2 = await writeNote(tmpDir, sampleContent, metadataDay2);

    // Should be in different directories
    expect(path.dirname(path1)).not.toBe(path.dirname(path2));

    // Both directories should exist
    const dirs = await fs.readdir(tmpDir);
    expect(dirs.length).toBe(2);
  });

  it("millisecond-precision filenames are unique across rapid successive calls", async () => {
    const filenames = new Set<string>();

    for (let i = 0; i < 5; i++) {
      const metadata: NoteMetadata = {
        date: new Date(2026, 1, 16, 10, 0, 0, i).toISOString(),
        repo: "test-repo",
        llm: "test-llm",
      };
      const filePath = await writeNote(tmpDir, sampleContent, metadata);
      filenames.add(path.basename(filePath));
    }

    // All filenames should be unique
    expect(filenames.size).toBe(5);
  });
});
