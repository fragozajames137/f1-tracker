import data from "../../public/blur-placeholders.json";

const placeholders = data as Record<string, string>;

export function getBlurPlaceholder(key: string): string | undefined {
  return placeholders[key];
}
