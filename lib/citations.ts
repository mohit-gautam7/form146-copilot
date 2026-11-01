// A model may only cite text that actually exists. This is a plain substring check, no AI.

export type Sources = Record<string, string>; // e.g. { contract, invoice, treaty }
export type Citation = { source: string; quote: string };
export type CitationCheck = Citation & { found: boolean };

const norm = (s: string) =>
  s.toLowerCase()
    .replace(/[‘’‛`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

export function checkCitations(citations: Citation[], sources: Sources): CitationCheck[] {
  const hay = Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, norm(v)]));
  return citations.map((c) => {
    const q = norm(c.quote ?? "").replace(/^\.+|\.+$/g, "");
    // ponytail: exact substring after normalising; fuzzy matching would let paraphrases through, which is the point of the check.
    const found = q.length >= 8 && (hay[c.source]?.includes(q) ?? Object.values(hay).some((h) => h.includes(q)));
    return { ...c, found };
  });
}
