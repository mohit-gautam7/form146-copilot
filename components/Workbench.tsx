"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, FileText, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { evaluate, type Country } from "@/lib/engine.ts";
import { toInput, COUNTRIES, type Case, type Characterisation, type Meta } from "@/lib/pipeline.ts";
import { MODELS, unavailable, type Consensus, type Vote } from "@/lib/llm.ts";
import { append, type Entry } from "@/lib/audit.ts";
import { LaneColumn, Pill, ResultBlock, Trace, Stamp, CATEGORY, MAKE_AVAILABLE, ANCILLARY } from "./ui";
import { motion, AnimatePresence } from "./motion";
import rules from "@/data/rules.json";
import casesJson from "@/data/cases.json";

const cases = casesJson as Case[];
const FLAG: Record<string, string> = { US: "us", UK: "gb", SG: "sg", DE: "de", NL: "nl" };
const today = () => new Date().toISOString().slice(0, 10);
const BLANK_META: Meta = {
  amountInr: 1_000_000, paymentDate: today(), payeeType: "company", trc: true, form10f: true,
  noPeDeclaration: true, pan: true, nrDetailsFurnished: true, taxBorneByPayer: false, mfnClaimRate: null,
};
const BLANK_CHAR: Characterisation = { category: "unclear", makeAvailable: "na", ancillaryTo: "none", peRisk: false };

type AiState = { mode: string; votes: Vote[]; consensus: Consensus } | null;

function Flag({ country, className = "h-4 w-6" }: { country: string; className?: string }) {
  return <img src={`/flags/${FLAG[country]}.svg`} alt="" className={`${className} rounded-[3px] object-cover ring-1 ring-black/10`} />;
}

export default function Workbench() {
  const [caseId, setCaseId] = useState(cases[1].id);
  const sample = cases.find((c) => c.id === caseId);
  const [country, setCountry] = useState<Country>(sample!.country);
  const [contract, setContract] = useState(sample!.contract);
  const [invoice, setInvoice] = useState(sample!.invoice);
  const [meta, setMeta] = useState<Meta>(sample!.meta);
  const [parties, setParties] = useState({ remitter: sample!.remitter, beneficiary: sample!.beneficiary, foreignAmount: sample!.foreignAmount });
  const [ai, setAi] = useState<AiState>(null);
  const [aiError, setAiError] = useState("");
  const [busy, setBusy] = useState(false);
  const [char, setChar] = useState<Characterisation>(BLANK_CHAR);
  const [reviewer, setReviewer] = useState("");
  const [udin, setUdin] = useState("");
  const [reason, setReason] = useState("");
  const [signed, setSigned] = useState<Entry | null>(null);

  function pick(id: string) {
    const c = cases.find((x) => x.id === id);
    setCaseId(id);
    setAi(null); setAiError(""); setChar(BLANK_CHAR); setSigned(null); setReason("");
    if (!c) {
      setContract(""); setInvoice(""); setMeta(BLANK_META);
      setParties({ remitter: "", beneficiary: "", foreignAmount: "" });
      return;
    }
    setCountry(c.country); setContract(c.contract); setInvoice(c.invoice); setMeta(c.meta);
    setParties({ remitter: c.remitter, beneficiary: c.beneficiary, foreignAmount: c.foreignAmount });
  }

  async function askModels() {
    setBusy(true); setAiError(""); setSigned(null);
    try {
      const res = await fetch("/api/classify", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ country, contract, invoice, caseId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setAi(body);
      const k = body.consensus as Consensus;
      setChar({ category: k.category, makeAvailable: k.makeAvailable, ancillaryTo: k.ancillaryTo, peRisk: k.peRisk, altCategory: k.altCategory });
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = toInput(country, char, meta);
  const result = useMemo(() => evaluate(input, rules, today()), [JSON.stringify(input)]); // eslint-disable-line react-hooks/exhaustive-deps

  const k = ai?.consensus;
  const overridden = !!k && (k.category !== char.category || k.makeAvailable !== char.makeAvailable || k.ancillaryTo !== char.ancillaryTo || k.peRisk !== char.peRisk);
  const canSign = reviewer.trim().length > 1 && result.status !== "refused" && (!overridden || reason.trim().length > 10);

  async function decide(decision: Entry["decision"]) {
    const entry = await append({
      caseId: sample ? caseId : "custom",
      title: sample?.title ?? `${parties.beneficiary || "Custom payment"} (${country})`,
      decision, reviewer: reviewer.trim(), udin: udin.trim(), reason: reason.trim(),
      input: { ...input, ...parties }, ai: k ?? null, result,
    });
    setSigned(entry);
  }

  const setM = <K extends keyof Meta>(key: K, v: Meta[K]) => setMeta((m) => ({ ...m, [key]: v }));
  // Choosing the category is the CA settling the models' dissent, so it is dropped.
  const setC = <K extends keyof Characterisation>(key: K, v: Characterisation[K]) =>
    setChar((c) => ({ ...c, [key]: v, ...(key === "category" ? { altCategory: undefined } : {}) }));

  const steps = [
    { label: "Documents", done: contract.trim().length > 0 },
    { label: "Models read", done: !!ai },
    { label: "Rate computed", done: result.status !== "refused" && char.category !== "unclear" },
    { label: "Signed", done: !!signed && signed.decision !== "sent_back" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Certify a payment to a non-resident</h1>
          <p className="mt-1 max-w-2xl text-muted">
            Form 146 under section 393(2) of the Income-tax Act, 2025. The models characterise, code computes, you decide.
          </p>
        </div>
        <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Progress">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-center gap-2">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold transition-colors ${s.done ? "bg-rules text-paper" : "border border-line bg-sheet text-muted"}`}>
                {s.done ? <Check size={14} aria-hidden /> : i + 1}
              </span>
              <span className={s.done ? "font-semibold" : "text-muted"}>{s.label}</span>
              {i < steps.length - 1 && <span className="h-px w-5 bg-line" aria-hidden />}
            </li>
          ))}
        </ol>
      </header>

      <section aria-label="Sample cases">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Pick a synthetic case, or start blank</h2>
          <span className="text-xs text-muted">{cases.length} cases, each aimed at one trap</span>
        </div>
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
          {cases.map((c) => {
            const active = c.id === caseId;
            return (
              <button
                key={c.id}
                onClick={() => pick(c.id)}
                aria-pressed={active}
                className={`w-60 shrink-0 snap-start rounded-2xl border p-3 text-left transition-all ${active ? "border-ink bg-ink text-paper shadow-lg" : "border-line bg-sheet hover:-translate-y-0.5 hover:border-ink/40"}`}
              >
                <span className="flex items-center gap-2"><Flag country={c.country} /><span className={`text-xs ${active ? "text-paper/70" : "text-muted"}`}>{COUNTRIES[c.country]}</span></span>
                <span className="mt-2 block text-sm font-semibold leading-snug">{c.title}</span>
                <span className={`mt-1 line-clamp-2 block text-xs ${active ? "text-paper/70" : "text-muted"}`}>{c.trap}</span>
              </button>
            );
          })}
          <button
            onClick={() => pick("custom")}
            aria-pressed={caseId === "custom"}
            className={`grid w-44 shrink-0 snap-start place-items-center rounded-2xl border border-dashed p-3 text-sm ${caseId === "custom" ? "border-ink font-semibold" : "border-line text-muted hover:border-ink/40"}`}
          >
            <span className="flex flex-col items-center gap-1"><FileText size={20} aria-hidden />Blank: paste your own</span>
          </button>
        </div>
      </section>

      <section className="grid gap-5 rounded-3xl border border-line bg-sheet p-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1 font-semibold">Remitter (Indian payer)<input className="font-normal" value={parties.remitter} onChange={(e) => setParties({ ...parties, remitter: e.target.value })} /></label>
            <label className="flex flex-col gap-1 font-semibold">Beneficiary (non-resident)<input className="font-normal" value={parties.beneficiary} onChange={(e) => setParties({ ...parties, beneficiary: e.target.value })} /></label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-semibold">Contract
            <textarea rows={6} className="source-text font-normal" value={contract} onChange={(e) => { setContract(e.target.value); setAi(null); }} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">Invoice
            <textarea rows={3} className="source-text font-normal" value={invoice} onChange={(e) => { setInvoice(e.target.value); setAi(null); }} />
          </label>
        </div>
        <fieldset className="grid content-start gap-2 text-sm">
          <legend className="mb-1 font-semibold">Facts the CA vouches for</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">Payee country
              <span className="flex items-center gap-2"><Flag country={country} className="h-5 w-7 shrink-0" />
                <select value={country} onChange={(e) => { setCountry(e.target.value as Country); setAi(null); }}>
                  {Object.entries(COUNTRIES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
              </span>
            </label>
            <label className="flex flex-col gap-1">Payee type
              <select value={meta.payeeType} onChange={(e) => setM("payeeType", e.target.value as Meta["payeeType"])}>
                <option value="company">Foreign company</option>
                <option value="non_company">Not a company</option>
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-1">Amount (INR)
              <input type="number" min={0} value={meta.amountInr} onChange={(e) => setM("amountInr", Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">Payment date
              <input type="date" value={meta.paymentDate} onChange={(e) => setM("paymentDate", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">Credited in books (if earlier)
              <input type="date" value={meta.creditDate ?? ""} onChange={(e) => setM("creditDate", e.target.value || undefined)} />
            </label>
          </div>
          {([
            ["trc", "Tax residency certificate on file"],
            ["form10f", "Form 41 on file (Form 10F under the 1961 Act)"],
            ["noPeDeclaration", "No-PE declaration from payee"],
            ["pan", "Payee has a PAN"],
            ["nrDetailsFurnished", "Payee gave TIN, address and email (no-PAN carve-out)"],
            ["taxBorneByPayer", "Contract says the payer bears Indian tax"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-paper">
              <input type="checkbox" className="h-4 w-4 accent-[var(--ink)]" checked={meta[key] as boolean} onChange={(e) => setM(key, e.target.checked)} />{label}
            </label>
          ))}
          <label className="flex items-center gap-2">Payee claims an MFN rate of
            <input type="number" className="w-20" placeholder="none" value={meta.mfnClaimRate ?? ""} onChange={(e) => setM("mfnClaimRate", e.target.value === "" ? null : Number(e.target.value))} />%
          </label>
        </fieldset>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <LaneColumn lane="ai">
          <button onClick={askModels} disabled={busy || !contract.trim()} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ai px-3 py-2.5 font-semibold text-paper transition-opacity disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : ai ? <RefreshCw size={16} aria-hidden /> : <Sparkles size={16} aria-hidden />}
            {busy ? "Three models are reading..." : ai ? "Ask the models again" : "Ask the models"}
          </button>
          {aiError && <p role="alert" className="rounded-xl bg-ca-wash p-3 text-sm text-ca">{aiError}</p>}
          {busy && <Reading />}
          {!ai && !aiError && !busy && <p className="text-sm text-muted">No model has read this case yet. You can also characterise it yourself in the CA lane.</p>}
          {ai && !busy && <AiPanel ai={ai} />}
        </LaneColumn>

        <LaneColumn lane="rules">
          <AnimatePresence mode="wait">
            <motion.div key={`${result.status}-${result.ratePct}-${result.taxInr}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <ResultBlock r={result} />
            </motion.div>
          </AnimatePresence>
          {result.branches && (
            <div className="mt-3 grid gap-2">
              {result.branches.map((b) => (
                <div key={b.label} className="rounded-xl border border-line p-3 text-sm">
                  <p className="font-semibold">{b.label}</p>
                  <p className="text-muted">{b.result.ratePct}% = {b.result.taxInr != null ? `Rs ${b.result.taxInr.toLocaleString("en-IN")}` : "-"} ({b.result.article})</p>
                </div>
              ))}
            </div>
          )}
          {result.unverified.length > 0 && (
            <p className="mt-3 text-xs text-warn">Uses rules not yet verified against a primary source: {result.unverified.join(", ")}. <Link href="/rules" className="underline">See Rules</Link>.</p>
          )}
          <details className="mt-4" open>
            <summary className="cursor-pointer text-sm font-semibold">How this was computed</summary>
            <div className="mt-2"><Trace steps={result.trace} /></div>
          </details>
        </LaneColumn>

        <LaneColumn lane="ca">
          <fieldset className="grid gap-2 text-sm">
            <legend className="mb-1 font-semibold">Characterisation the engine runs on</legend>
            <label className="flex flex-col gap-1">Nature of payment
              <select value={char.category} onChange={(e) => setC("category", e.target.value as Characterisation["category"])}>
                {Object.entries(CATEGORY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">Makes know-how available?
              <select value={char.makeAvailable} onChange={(e) => setC("makeAvailable", e.target.value as Characterisation["makeAvailable"])}>
                {Object.entries(MAKE_AVAILABLE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">Ancillary to
              <select value={char.ancillaryTo} onChange={(e) => setC("ancillaryTo", e.target.value as Characterisation["ancillaryTo"])}>
                {Object.entries(ANCILLARY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[var(--ca)]" checked={char.peRisk} onChange={(e) => setC("peRisk", e.target.checked)} />Possible PE in India</label>
          </fieldset>

          {overridden && <p className="mt-3 rounded-xl bg-warn-wash p-3 text-sm text-warn">You changed the models&apos; answer. Record why before signing.</p>}

          <div className="mt-4 grid gap-2 text-sm">
            <label className="flex flex-col gap-1">CA name<input value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="e.g. A. Rao, M. No. 123456" /></label>
            <label className="flex flex-col gap-1">UDIN (placeholder)<input value={udin} onChange={(e) => setUdin(e.target.value)} placeholder="generated on the ICAI portal" /></label>
            <label className="flex flex-col gap-1">Reason{overridden ? " (required)" : " (optional)"}
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button disabled={!canSign} onClick={() => decide(overridden ? "overridden" : "approved")} className="rounded-xl bg-ca px-4 py-2.5 font-semibold text-paper transition-opacity disabled:opacity-40">
                Sign as {overridden ? "overridden" : "approved"}
              </button>
              <button disabled={!reviewer.trim()} onClick={() => decide("sent_back")} className="rounded-xl border border-line px-4 py-2.5 disabled:opacity-40">Send back</button>
            </div>
            {!canSign && result.status === "refused" && <p className="text-xs text-muted">The engine refused. Fix the rule or the facts before anyone can sign.</p>}
          </div>

          {signed && (
            <div className="mt-4 text-center">
              {signed.decision !== "sent_back" ? <Stamp name={signed.reviewer} udin={signed.udin} hash={signed.hash} at={signed.at} /> : <p className="text-sm">Sent back. Logged as entry {signed.seq}.</p>}
              <div className="mt-2 flex justify-center gap-4 text-sm">
                {signed.decision !== "sent_back" && <Link className="inline-flex items-center gap-1 font-semibold underline" href={`/form146?seq=${signed.seq}`}>Open draft Form 146 <ArrowRight size={14} aria-hidden /></Link>}
                <Link className="underline" href="/review">Review log</Link>
              </div>
            </div>
          )}
        </LaneColumn>
      </div>
    </div>
  );
}

// While the request runs: the three voters, each with a reading pulse.
function Reading() {
  return (
    <ul className="space-y-2" aria-label="Models reading">
      {MODELS.slice(0, 3).map((m, i) => (
        <li key={m.model} className="flex items-center justify-between rounded-xl border border-line p-3 text-sm">
          <span><span className="font-semibold">{m.family}</span><span className="block text-xs text-muted">{m.provider}</span></span>
          <span className="flex gap-1" aria-hidden>
            {[0, 1, 2].map((d) => (
              <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-ai" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 + d * 0.15 }} />
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AiPanel({ ai }: { ai: NonNullable<AiState> }) {
  const k = ai.consensus;
  const tone = k.agreement === "agree" ? "ok" : k.agreement === "flag" ? "warn" : "bad";
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={tone}>{{ agree: "Models agree", flag: "Majority only", abstain: "Abstained" }[k.agreement]}</Pill>
        <Pill tone="plain">{ai.mode === "replay" ? "recorded answers" : "live"}</Pill>
      </div>
      <p>{k.note}</p>
      <p className="rounded-xl bg-ai-wash p-3"><span className="text-muted">Consensus: </span><strong>{CATEGORY[k.category]}</strong>{k.category === "fts" && <> / make available: <strong>{MAKE_AVAILABLE[k.makeAvailable]}</strong></>}{k.peRisk && <> / <strong>PE risk</strong></>}</p>
      <ul className="space-y-2">
        {ai.votes.map((v, i) => (
          <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }} className="rounded-xl border border-line p-3">
            {v.ok ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-semibold">{v.family ?? v.label}</span>
                  <span className="text-xs text-muted">{v.label} / {(v.latencyMs / 1000).toFixed(1)}s</span>
                </div>
                <p className="text-xs text-muted">{v.model}</p>
                {v.replaced && <p className="mt-1 text-xs text-warn">Fallback: stood in for {v.replaced.map((r) => `${r.model} (${unavailable(r.error)})`).join(", ")}</p>}
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-semibold">No model answered</span>
                  <Pill tone="warn">not counted</Pill>
                </div>
                <p className="mt-1 text-muted">Every fallback for this seat was unavailable, so it casts no vote. This is an outage, not a judgement.</p>
                <ul className="mt-1 text-xs text-muted">
                  {(v.replaced ?? []).map((r, j) => <li key={j}>{r.model}: <span className="text-warn">{unavailable(r.error)}</span></li>)}
                </ul>
                <details className="mt-1 text-xs text-muted"><summary className="cursor-pointer">Raw error</summary><p className="break-all">{v.error}</p></details>
              </>
            )}
            {v.parsed && (
              <>
                <p className="mt-1">
                  {CATEGORY[v.parsed.category] ?? v.parsed.category}
                  {v.parsed.category === "fts" && `, make available: ${v.parsed.make_available}`}
                  {!v.valid && <span className="ml-2"><Pill tone="bad">not counted</Pill></span>}
                </p>
                <p className="mt-1 text-muted">{v.parsed.reasoning}</p>
                <ul className="mt-2 space-y-1">
                  {v.checks?.map((c, j) => (
                    <li key={j} className="flex gap-2">
                      <span className={`mt-0.5 shrink-0 ${c.found ? "text-rules" : "text-ca"}`} aria-label={c.found ? "quote found in source" : "quote not found in source"}>
                        {c.found ? <Check size={14} /> : <X size={14} />}
                      </span>
                      <span className="source-text italic">&ldquo;{c.quote}&rdquo; <span className="not-italic text-xs text-muted">({c.source})</span></span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
