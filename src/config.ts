import os from "node:os";
import path from "node:path";

export interface ServerConfig {
  storagePath: string;
  llmModel: string;
  repoName: string;
}

export function getConfig(): ServerConfig {
  const storagePath = path.join(os.homedir(), ".prompt-feedback");
  const llmModel = process.env.PROMPT_FEEDBACK_LLM || "unknown";

  let repoName: string;
  try {
    const cwd = process.cwd();
    const basename = path.basename(cwd);
    repoName = basename || "unknown";
  } catch {
    repoName = "unknown";
  }

  return { storagePath, llmModel, repoName };
}
