import { createHash } from "node:crypto";

export function hashMessage(text: string): string {
  return createHash("sha256")
    .update(text.trim().normalize("NFKC"), "utf8")
    .digest("hex");
}
