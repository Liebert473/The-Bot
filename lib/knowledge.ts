import { readFile } from "node:fs/promises";
import path from "node:path";

let cached: { manifesto: string; framework: string } | null = null;

export async function loadKnowledgeBase(): Promise<{
  manifesto: string;
  framework: string;
}> {
  if (cached) return cached;
  const base = path.join(process.cwd(), "knowledge");
  const [manifesto, framework] = await Promise.all([
    readFile(path.join(base, "manifesto.md"), "utf8"),
    readFile(path.join(base, "framework.md"), "utf8"),
  ]);
  cached = { manifesto, framework };
  return cached;
}
