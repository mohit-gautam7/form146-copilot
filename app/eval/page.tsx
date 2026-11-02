import results from "@/data/eval-results.json";
import { Pill, CATEGORY } from "@/components/ui";
import { unavailable } from "@/lib/llm.ts";

type CaseRow = {
  id: string; title: string; country: string; trap: string;
  expected: { status: string; basis: string; ratePct: number | null };
  rules: { pass: boolean; diffs: string[] };
  ai: null | {
    agreement: string; validVotes: number; categoryOk: boolean; makeAvailableOk: boolean; safe: boolean; pass: boolean; diffs: string[];
    consensus: { category: string; makeAvailable: string };
    votes: { provider: string; model: string; family?: string; ok: boolean; valid: boolean; latencyMs: number; category?: string; badQuotes: number; error?: string; replaced?: string[] }[];
  };
};

function Tile({ value, of, label, hint }: { value: number; of: number; label: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-line bg-sheet p-4">
      <p className="text-3xl font-bold">{value}<span className="text-lg font-normal text-muted"> / {of}</span></p>
      <p className="font-semibold">{label}</p>
      <p className="text-sm text-muted">{hint}</p>
    </div>
  );
}

export default function Eval() {
  const s = results.summary;
  const cases = results.cases as CaseRow[];
  const failures = cases.filter((c) => !c.rules.pass || (c.ai && !c.ai.pass));
  const agreeParts = [
    { key: "agree", label: "All agree", n: s.agreement.agree, cls: "bg-rules" },
    { key: "flag", label: "Majority only", n: s.agreement.flag, cls: "bg-warn" },
    { key: "abstain", label: "Abstained", n: s.agreement.abstain, cls: "bg-ca" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Evaluation on {s.cases} synthetic cases</h1>
        <p className="max-w-prose text-muted">
          Two lanes are scored separately so each failure is blamed on the right part. The rules lane feeds the gold characterisation to the
          engine and tests the code. The full pipeline feeds the models&apos; consensus and tests the AI plus the code.
          Last run: {new Date(results.generatedAt).toLocaleString("en-IN")} ({results.mode}).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile value={s.rulesPass} of={s.cases} label="Rules lane correct" hint="Expected to be perfect: the same author wrote rules and gold answers. Real test is CA-written cases." />
        <Tile value={s.fullPass} of={s.aiCases} label="Full pipeline correct" hint="Status, basis, rate and Form 146 flag all match." />
        <Tile value={s.categoryOk} of={s.aiCases} label="Models got the category" hint="Consensus category equals the gold answer." />
        <Tile value={s.unsafe} of={s.aiCases} label="Wrong and confident" hint="The metric that matters: a wrong rate shown as 'Computed', not routed to the CA." />
      </div>

      {s.aiCases === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-6 text-sm">
          <p className="font-semibold">No model answers recorded yet.</p>
          <p className="mt-1 text-muted">Add GROQ_API_KEY, NVIDIA_API_KEY and OPENROUTER_API_KEY to .env.local, then run <code>npm run eval</code>. The run records every model answer, so this page and the public demo replay them without keys.</p>
        </div>
      ) : (
        <section aria-label="Model agreement" className="rounded-2xl border border-line bg-sheet p-4">
          <h2 className="font-semibold">How often the three models agreed</h2>
          <div className="mt-3 flex h-6 gap-[2px] overflow-hidden rounded" role="img" aria-label={agreeParts.map((p) => `${p.label}: ${p.n}`).join(", ")}>
            {agreeParts.filter((p) => p.n).map((p) => (
              <div key={p.key} className={p.cls} style={{ flexGrow: p.n }} title={`${p.label}: ${p.n} cases`} />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-4 text-sm">
            {agreeParts.map((p) => <li key={p.key} className="flex items-center gap-2"><span className={`inline-block h-3 w-3 rounded-sm ${p.cls}`} />{p.label}: {p.n}</li>)}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">Where it fails, and which lane is to blame</h2>
        {failures.length === 0 ? <p className="text-sm text-muted">No failures in this run.</p> : (
          <ul className="space-y-2 text-sm">
            {failures.map((c) => (
              <li key={c.id} className="rounded-md border border-line bg-sheet p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{c.title}</span>
                  {!c.rules.pass ? <Pill tone="bad">rules lane</Pill> : <Pill tone="ai">AI lane</Pill>}
                  {c.ai && !c.ai.safe && <Pill tone="bad">wrong and confident</Pill>}
                  {c.ai && c.ai.safe && !c.ai.pass && <Pill tone="warn">safely escalated</Pill>}
                </div>
                <p className="text-muted">{c.trap}</p>
                <p className="mt-1">{[...c.rules.diffs, ...(c.ai?.diffs ?? [])].join("; ")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-x-auto rounded-2xl border border-line bg-sheet">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr><th className="p-2">Case</th><th className="p-2">Expected</th><th className="p-2">Rules lane</th><th className="p-2">Models said</th><th className="p-2">Votes</th><th className="p-2">Full pipeline</th></tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-b border-line align-top last:border-0">
                <td className="p-2"><div className="font-semibold">{c.title}</div><div className="text-xs text-muted">{c.id}</div></td>
                <td className="p-2">{c.expected.ratePct != null ? `${c.expected.ratePct}%` : "-"} <span className="text-xs text-muted">{c.expected.status === "ok" ? c.expected.basis.replace("_", " ") : c.expected.status.replace("_", " ")}</span></td>
                <td className="p-2">{c.rules.pass ? <Pill tone="ok">pass</Pill> : <Pill tone="bad">fail</Pill>}</td>
                <td className="p-2">{c.ai ? <>{CATEGORY[c.ai.consensus.category]}{c.ai.consensus.category === "fts" && <span className="text-xs text-muted"> MA {c.ai.consensus.makeAvailable}</span>}</> : "-"}</td>
                <td className="p-2 text-xs">
                  {c.ai?.votes.map((v, i) => (
                    <div key={i} title={v.error ?? v.model}>
                      {v.ok ? (
                        <>
                          <span className="font-semibold">{v.family ?? v.provider}</span>: {`${v.category ?? "?"}${v.valid ? "" : " (not counted)"}${v.badQuotes ? `, ${v.badQuotes} quote${v.badQuotes === 1 ? "" : "s"} not found` : ""}`}{" "}
                          <span className="text-muted">{(v.latencyMs / 1000).toFixed(1)}s</span>
                          {v.replaced?.length ? <span className="block text-warn">stood in for {v.replaced.join(", ")}</span> : null}
                        </>
                      ) : (
                        <span className="text-warn">No model answered ({unavailable(v.error)}); tried {v.replaced?.join(", ")}</span>
                      )}
                    </div>
                  )) ?? "-"}
                </td>
                <td className="p-2">{c.ai ? (c.ai.pass ? <Pill tone="ok">pass</Pill> : c.ai.safe ? <Pill tone="warn">escalated</Pill> : <Pill tone="bad">fail</Pill>) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
