import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export interface NoteContent {
  title: string;
  you_said: string;
  next_time: string;
}

export interface NoteMetadata {
  date: string;
  repo: string;
  llm: string;
}

export function formatNote(content: NoteContent, metadata: NoteMetadata): string {
  const frontmatter = [
    "---",
    `date: ${metadata.date}`,
    `repo: ${metadata.repo}`,
    `llm: ${metadata.llm}`,
    "---",
  ].join("\n");

  const body = [
    "",
    `## ${content.title}`,
    "",
    `**You said:** "${content.you_said}"`,
    "",
    `**Next time:** ${content.next_time}`,
    "",
  ].join("\n");

  return frontmatter + body;
}

export function generateFilename(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ms = String(now.getMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}-${ms}.md`;
}

export function getDateDirectory(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function writeNote(
  storagePath: string,
  content: NoteContent,
  metadata: NoteMetadata,
): Promise<string> {
  const now = new Date(metadata.date);
  const dateDir = getDateDirectory(now);
  const dirPath = path.join(storagePath, dateDir);

  await fs.mkdir(dirPath, { recursive: true });

  const filename = generateFilename(now);
  let filePath = path.join(dirPath, filename);

  try {
    await fs.writeFile(filePath, formatNote(content, metadata), { flag: "wx" });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "EEXIST") {
      // Collision fallback: append 3-char random suffix
      const suffix = crypto.randomBytes(2).toString("hex").slice(0, 3);
      const fallbackFilename = filename.replace(".md", `-${suffix}.md`);
      filePath = path.join(dirPath, fallbackFilename);
      await fs.writeFile(filePath, formatNote(content, metadata), { flag: "wx" });
    } else {
      throw err;
    }
  }

  return filePath;
}
