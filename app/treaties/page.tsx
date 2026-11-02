"use client";

import { useState } from "react";
import treaties from "@/data/treaties.json";
import { COUNTRIES, type Article } from "@/lib/pipeline.ts";

const articles = treaties.articles as Article[];

function highlight(text: string, q: string) {
  if (q.trim().length < 3) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((p, i) => (i % 2 ? <mark key={i} className="bg-ai-wash text-ink">{p}</mark> : p));
}

export default function Treaties() {
  const [q, setQ] = useState("make available");
  const [country, setCountry] = useState("all");
  const shown = articles.filter((a) => (country === "all" || a.country === country) && (q.trim().length < 3 || a.text.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Treaty clauses the models may cite</h1>
        <p className="max-w-prose text-muted">
          The complete evidence base: the royalty and technical-services articles of five treaties, cut from official texts on {treaties.fetched_on}.
          A model&apos;s vote counts only if at least one of its contract or invoice quotes and one of its treaty quotes are found word for word. Any quote that is not found is flagged to the CA.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">Search<input value={q} onChange={(e) => setQ(e.target.value)} className="w-64" /></label>
        <label className="flex items-center gap-2">Treaty
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="all">All five</option>
            {Object.entries(COUNTRIES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </label>
        <span className="self-center text-muted">{shown.length} of {articles.length} clauses</span>
      </div>
      {shown.map((a) => (
        <article key={a.id} className="rounded-2xl border border-line bg-sheet p-4">
          <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold">{COUNTRIES[a.country as keyof typeof COUNTRIES]}: {a.article.startsWith("Protocol") ? a.article : `Article ${a.article}`}, {a.title}</h2>
            <a href={a.source_url} target="_blank" rel="noreferrer" className="text-xs text-muted underline">{a.source}</a>
          </header>
          <p className="source-text max-w-[75ch] text-[15px]">{highlight(a.text, q)}</p>
        </article>
      ))}
    </div>
  );
}
