import type { Result, Step } from "@/lib/engine.ts";

export const CATEGORY: Record<string, string> = {
  royalty_ip: "Royalty for IP",
  royalty_equipment: "Royalty for equipment hire",
  fts: "Fees for technical services",
  business_profits: "Business profits",
  reimbursement: "Reimbursement at cost",
  unclear: "Unclear",
};
export const MAKE_AVAILABLE: Record<string, string> = { yes: "Yes", no: "No", contested: "Contested", na: "Not applicable" };
export const ANCILLARY: Record<string, string> = { none: "Not ancillary", ip: "Ancillary to licensed IP", equipment: "Ancillary to hired equipment" };

type Lane = "ai" | "rules" | "ca";
const LANE: Record<Lane, { name: string; who: string; bar: string; wash: string; text: string }> = {
  ai: { name: "AI lane", who: "Three models characterise the payment. Probabilistic.", bar: "border-ai", wash: "bg-ai-wash", text: "text-ai" },
  rules: { name: "Rules lane", who: "Code applies treaty and Act. Exact and repeatable.", bar: "border-rules", wash: "bg-rules-wash", text: "text-rules" },
  ca: { name: "CA lane", who: "A chartered accountant decides and signs. Accountable.", bar: "border-ca", wash: "bg-ca-wash", text: "text-ca" },
};

export function LaneColumn({ lane, children }: { lane: Lane; children: React.ReactNode }) {
  const l = LANE[lane];
  return (
    <section aria-label={l.name} className={`rounded-lg border-t-4 ${l.bar} bg-sheet p-4 shadow-[0_1px_0_var(--line)]`}>
      <h2 className={`text-base font-bold ${l.text}`}>{l.name}</h2>
      <p className="mb-4 text-sm text-muted">{l.who}</p>
      {children}
    </section>
  );
}

export function Pill({ tone, children }: { tone: "ok" | "warn" | "bad" | "ai" | "plain"; children: React.ReactNode }) {
  const cls = {
    ok: "bg-rules-wash text-rules",
    warn: "bg-warn-wash text-warn",
    bad: "bg-ca-wash text-ca",
    ai: "bg-ai-wash text-ai",
    plain: "bg-paper text-muted",
  }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

export const inr = (n: number | null | undefined) =>
  n == null ? "-" : `Rs ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function StatusLine({ r }: { r: Result }) {
  const label = { ok: "Computed", needs_ca: "Needs the CA's judgement", refused: "Refused to compute" }[r.status];
  const tone = r.status === "ok" ? "ok" : r.status === "needs_ca" ? "warn" : "bad";
  return <Pill tone={tone}>{label}</Pill>;
}

export function Trace({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-2 text-sm">
      {steps.map((s, i) => (
        <li key={i} className="border-l-2 border-line pl-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{s.label}</span>
            {s.verified === false && <Pill tone="warn">rule not yet verified</Pill>}
            {s.source && (
              <a href={s.source} target="_blank" rel="noreferrer" className="text-xs text-muted underline">source</a>
            )}
          </div>
          <p className="text-muted">{s.detail}</p>
        </li>
      ))}
    </ol>
  );
}

export function ResultBlock({ r }: { r: Result }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><StatusLine r={r} />{r.basis !== "none" && <Pill tone="plain">basis: {r.basis.replace("_", " ")}</Pill>}</div>
      {r.ratePct != null && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">Rate</dt><dd className="text-2xl font-bold">{r.ratePct}%</dd>
          <dt className="text-muted">Tax to withhold</dt><dd className="font-semibold">{inr(r.taxInr)}</dd>
          {r.grossInr != null && (<><dt className="text-muted">Grossed-up amount</dt><dd>{inr(r.grossInr)}</dd></>)}
          <dt className="text-muted">Article</dt><dd>{r.article ?? "-"}</dd>
          <dt className="text-muted">Certificate</dt><dd>{r.form146Required ? `${r.certificateForm} required` : "Not required"}</dd>
        </dl>
      )}
      {r.reasons.length > 0 && (
        <ul className="space-y-1 rounded-md bg-warn-wash p-2 text-sm text-warn">
          {r.reasons.map((x) => <li key={x}>{x}</li>)}
        </ul>
      )}
    </div>
  );
}

export function Stamp({ name, udin, hash, at }: { name: string; udin: string; hash: string; at: string }) {
  return (
    <div className="stamp mx-auto my-2 flex h-40 w-40 flex-col items-center justify-center rounded-full border-4 border-double border-ca text-center text-ca">
      <span className="text-xs font-bold tracking-wide">CERTIFIED BY CA</span>
      <span className="mt-1 max-w-[8rem] truncate text-sm font-semibold">{name}</span>
      <span className="text-[10px]">UDIN {udin || "pending"}</span>
      <span className="text-[10px]">{new Date(at).toLocaleDateString("en-IN")}</span>
      <span className="mt-1 font-mono text-[9px]">#{hash.slice(0, 10)}</span>
    </div>
  );
}
