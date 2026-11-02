// A model may only cite text that actually exists. This is a plain substring check, no AI.

export type Sources = Record<string, string>; // e.g. { contract, invoice, treaty }
export type Citation = { source: string; quote: string };
export type CitationCheck = Citation & { found: boolean };

const norm = (s: string) =>
  s.toLowerCase()
    .replace(/[‘’‛`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, "-") // models emit non-breaking and en/em hyphens
    .replace(/\s+/g, " ")
    .trim();

const MIN = 8;

// Legal quoting elides with "..."; each fragment must still be verbatim, in order, in one source.
function foundIn(hay: string, fragments: string[]) {
  let from = 0;
  for (const f of fragments) {
    const at = hay.indexOf(f, from);
    if (at < 0) return false;
    from = at + f.length;
  }
  return true;
}

export function checkCitations(citations: Citation[], sources: Sources): CitationCheck[] {
  const hay = Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, norm(v)]));
  return citations.map((c) => {
    const fragments = norm(c.quote ?? "")
      .split(/\.{3}|…/)
      .map((f) => f.trim().replace(/^["'(\[]+|["')\];:,.]+$/g, "").trim())
      .filter(Boolean);
    // ponytail: exact match after normalising; fuzzy matching would let paraphrases through, which is the point of the check.
    const found = fragments.length > 0 && fragments.every((f) => f.length >= MIN) &&
      (hay[c.source] != null ? foundIn(hay[c.source], fragments) : Object.values(hay).some((h) => foundIn(h, fragments)));
    return { ...c, found };
  });
}
