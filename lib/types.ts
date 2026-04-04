export type MessageCategory = "Filter" | "Momentum" | "Perspective";

export const MESSAGE_CATEGORIES: MessageCategory[] = [
  "Filter",
  "Momentum",
  "Perspective",
];

export function parseCategory(value: string | null): MessageCategory | null {
  if (!value) return null;
  return MESSAGE_CATEGORIES.includes(value as MessageCategory)
    ? (value as MessageCategory)
    : null;
}
