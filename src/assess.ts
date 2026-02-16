import { getConfig } from "./config.js";
import { writeNote } from "./writer.js";
import type { NoteContent, NoteMetadata } from "./writer.js";

export interface AssessPromptParams {
  improved: boolean;
  trigger?: string;
  title?: string;
  you_said?: string[];
  next_time?: string;
}

export async function handleAssessPrompt(
  params: AssessPromptParams,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  if (!params.improved) {
    return { content: [] };
  }

  // Validate required fields when improved=true
  if (!params.trigger || !["frustration", "agent_mistake"].includes(params.trigger)) {
    return {
      content: [{ type: "text", text: "Missing required field: trigger" }],
      isError: true,
    };
  }
  if (!params.title || params.title.trim().length === 0) {
    return {
      content: [{ type: "text", text: "Missing required field: title" }],
      isError: true,
    };
  }
  if (
    !params.you_said ||
    !Array.isArray(params.you_said) ||
    params.you_said.length === 0 ||
    params.you_said.some((s) => typeof s !== "string" || s.trim().length === 0)
  ) {
    return {
      content: [{ type: "text", text: "Missing required field: you_said" }],
      isError: true,
    };
  }
  if (!params.next_time || params.next_time.trim().length === 0) {
    return {
      content: [{ type: "text", text: "Missing required field: next_time" }],
      isError: true,
    };
  }

  try {
    const config = getConfig();
    const now = new Date();

    const noteContent: NoteContent = {
      title: params.title,
      you_said: params.you_said,
      next_time: params.next_time,
    };

    const metadata: NoteMetadata = {
      date: now.toISOString(),
      repo: config.repoName,
      llm: config.llmModel,
      trigger: params.trigger,
    };

    await writeNote(config.storagePath, noteContent, metadata);
  } catch {
    // FR-013: Swallow all filesystem errors silently
  }

  return { content: [] };
}
