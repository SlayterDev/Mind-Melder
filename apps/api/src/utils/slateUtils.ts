/**
 * Extracts plain text from a serialized Slate JSON document string.
 * Used to populate content_plain for full-text search indexing,
 * avoiding noise from JSON structural keywords in the tsvector.
 */
export function slateJsonToPlainText(content: string): string {
  try {
    const doc = JSON.parse(content);
    if (!Array.isArray(doc)) return '';
    return extractText(doc);
  } catch {
    return '';
  }
}

function extractText(nodes: unknown[]): string {
  return nodes
    .map((node) => {
      if (typeof node !== 'object' || node === null) return '';
      const n = node as Record<string, unknown>;
      if (typeof n.text === 'string') return n.text;
      if (Array.isArray(n.children)) return extractText(n.children);
      return '';
    })
    .filter(Boolean)
    .join(' ');
}
