import type { Descendant } from 'slate';

export const EMPTY_SLATE_DOCUMENT: Descendant[] = [
  { type: 'paragraph', children: [{ text: '' }] },
];

export function serializeToString(value: Descendant[]): string {
  return JSON.stringify(value);
}

export function deserializeFromString(raw: string): Descendant[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as Descendant[];
  } catch {
    // fall through to default
  }
  return EMPTY_SLATE_DOCUMENT;
}

export function slateToPlainText(value: Descendant[]): string {
  return value
    .map((node) => extractText(node))
    .filter(Boolean)
    .join('\n');
}

function extractText(node: Descendant): string {
  if ('text' in node) return node.text;
  if ('children' in node) {
    return (node.children as Descendant[]).map(extractText).filter(Boolean).join(' ');
  }
  return '';
}
