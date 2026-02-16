/**
 * Builds a prefix search query for PostgreSQL full-text search using to_tsquery.
 * Sanitizes input by removing special characters and supports partial term matching.
 * 
 * @param query - The raw search query from user input
 * @returns The formatted query string for to_tsquery, or null if no valid terms
 * 
 * @example
 * buildPrefixSearchQuery('trans test') // Returns 'trans:* & test:*'
 * buildPrefixSearchQuery('!@#$%') // Returns null (no valid terms)
 */
export function buildPrefixSearchQuery(query: string): string | null {
  const sanitizedTerms = query
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);

  if (sanitizedTerms.length === 0) {
    // All terms were filtered out (e.g., input contained only special characters)
    return null;
  }

  return sanitizedTerms.map((t) => `${t}:*`).join(' & ');
}
