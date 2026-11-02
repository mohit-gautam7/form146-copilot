import rules from "@/data/rules.json";
import { Pill } from "@/components/ui";

type Row = { id: string; what: string; value: string; verified: boolean; last: string; window: string; source?: string; quote?: string; note?: string };

const ageDays = (d: string) => Math.max(0, Math.floor((Date.now() - Date.parse(d)) / 86_400_000));

export default function Rules() {
  const R = rules as any;
  const rows: Row[] = [
    ...R.act.map((a: any) => ({
      id: a.id, what: `${a.act}, s. ${a.section}`, value: `${a.rate}% / Form ${a.form_certificate}`, verified: a.verified, last: a.last_verified,
      window: `${a.effective_from ?? "earlier"} to ${a.effective_to ?? "now"}`, source: a.source_url, quote: a.source_quote, note: a._note,
    })),
    ...R.treaty_rates.map((t: any) => ({
      id: t.id, what: `${R.treaties[t.country].name}, para ${t.para}`, value: `${t.rate}% ${t.category === "*" ? "royalties and FTS" : t.category.replace(/_/g, " ")}`,
      verified: t.verified, last: t.last_verified, window: `in force to ${t.effective_to ?? "now"}`, source: t.source_url, quote: t.source_quote,
    })),
    { id: "surcharge", what: "Surcharge and cess on the Act rate", value: `company 2% / 5%; cess ${R.surcharge.cess_pct}%`, verified: R.surcharge.verified, last: R.surcharge.last_verified, window: "tax year 2026-27", source: R.surcharge.source_url, note: R.surcharge._note },
    { id: "treaty_rate_is_final", what: "No surcharge or cess on a treaty rate", value: "treaty rate is final", verified: R.treaty_rate_is_final.verified, last: R.treaty_rate_is_final.last_verified, window: "-", note: R.treaty_rate_is_final._note },
    { id: "no_pan", what: `No PAN: s. ${R.no_pan.section_2025} (was ${R.no_pan.section_1961})`, value: `${R.no_pan.rate}% floor`, verified: R.no_pan.verified, last: R.no_pan.last_verified, window: "-", source: R.no_pan.source_url, note: R.no_pan.nr_carve_out },
  ];
  const unverified = rows.filter((r) => !r.verified);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Rules and their freshness</h1>
        <p className="max-w-prose text-muted">
          Every number the engine uses is here, with the words it was checked against. A rule older than {R.max_age_days} days, or outside its
          dates, makes the engine refuse instead of guessing. Unverified rules still run, but every result that touches them says so.
        </p>
      </div>
      <p className="rounded-md bg-warn-wash p-3 text-sm text-warn">
        {unverified.length} of {rows.length} rules are not yet verified against a primary source: {unverified.map((u) => u.id).join(", ")}.
        Closing these is the first job before anyone relies on the output.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-sheet">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr><th className="p-2">Rule</th><th className="p-2">Value</th><th className="p-2">Status</th><th className="p-2">Checked against</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const age = ageDays(r.last);
              const stale = age > R.max_age_days;
              return (
                <tr key={r.id} className="border-b border-line align-top last:border-0">
                  <td className="p-2"><div className="font-semibold">{r.what}</div><div className="font-mono text-xs text-muted">{r.id}</div></td>
                  <td className="p-2">{r.value}<div className="text-xs text-muted">{r.window}</div></td>
                  <td className="space-y-1 p-2">
                    <div>{r.verified ? <Pill tone="ok">verified</Pill> : <Pill tone="warn">not verified</Pill>}</div>
                    <div>{stale ? <Pill tone="bad">stale: engine refuses</Pill> : <span className="text-xs text-muted">checked {r.last} ({age} days ago)</span>}</div>
                  </td>
                  <td className="max-w-md p-2">
                    {r.quote && <p className="source-text italic">&ldquo;{r.quote}&rdquo;</p>}
                    {r.note && <p className="mt-1 text-xs text-muted">{r.note}</p>}
                    {r.source && <a className="text-xs underline" href={r.source} target="_blank" rel="noreferrer">source</a>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
