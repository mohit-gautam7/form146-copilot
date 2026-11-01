"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { evaluate, type Country } from "@/lib/engine.ts";
import { toInput, COUNTRIES, type Case, type Characterisation, type Meta } from "@/lib/pipeline.ts";
import type { Consensus, Vote } from "@/lib/llm.ts";
import { append, type Entry } from "@/lib/audit.ts";
import { LaneColumn, Pill, ResultBlock, Trace, Stamp, CATEGORY, MAKE_AVAILABLE, ANCILLARY } from "./ui";
import rules from "@/data/rules.json";
import casesJson from "@/data/cases.json";

const cases = casesJson as Case[];
const today = () => new Date().toISOString().slice(0, 10);
const BLANK_META: Meta = {
  amountInr: 1_000_000, paymentDate: today(), payeeType: "company", trc: true, form10f: true,
  noPeDeclaration: true, pan: true, nrDetailsFurnished: true, taxBorneByPayer: false, mfnClaimRate: null,
};
const BLANK_CHAR: Characterisation = { category: "unclear", makeAvailable: "na", ancillaryTo: "none", peRisk: false };

type AiState = { mode: string; votes: Vote[]; consensus: Consensus } | null;

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
      setChar({ category: k.category, makeAvailable: k.makeAvailable, ancillaryTo: k.ancillaryTo, peRisk: k.peRisk });
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
  const setC = <K extends keyof Characterisation>(key: K, v: Characterisation[K]) => setChar((c) => ({ ...c, [key]: v }));

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Certify a payment to a non-resident</h1>
          <p className="mt-1 max-w-prose text-muted">
            Since 1 April 2026 the certificate is Form 146 under section 393(2) of the Income-tax Act, 2025. Paste the contract and invoice,
            let three models characterise the payment, confirm or correct them, and sign. The rate is computed by code, never by a model.
          </p>
          {sample && (
            <p className="mt-3 rounded-md border border-line bg-sheet p-3 text-sm">
              <span className="font-semibold">What this sample tests: </span>{sample.trap}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" htmlFor="case">Sample case (synthetic)</label>
          <select id="case" value={caseId} onChange={(e) => pick(e.target.value)}>
            {cases.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.country})</option>)}
            <option value="custom">Blank: paste your own</option>
          </select>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="flex flex-col gap-1">Remitter (Indian payer)<input value={parties.remitter} onChange={(e) => setParties({ ...parties, remitter: e.target.value })} /></label>
            <label className="flex flex-col gap-1">Beneficiary (non-resident)<input value={parties.beneficiary} onChange={(e) => setParties({ ...parties, beneficiary: e.target.value })} /></label>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-line bg-sheet p-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-3">
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
              <select value={country} onChange={(e) => { setCountry(e.target.value as Country); setAi(null); }}>
                {Object.entries(COUNTRIES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">Payee type
              <select value={meta.payeeType} onChange={(e) => setM("payeeType", e.target.value as Meta["payeeType"])}>
                <option value="company">Foreign company</option>
                <option value="non_company">Not a company</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">Amount (INR)
              <input type="number" min={0} value={meta.amountInr} onChange={(e) => setM("amountInr", Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">Payment date
              <input type="date" value={meta.paymentDate} onChange={(e) => setM("paymentDate", e.target.value)} />
            </label>
          </div>
          {([
            ["trc", "Tax residency certificate on file"],
            ["form10f", "Form 10F on file"],
            ["noPeDeclaration", "No-PE declaration from payee"],
            ["pan", "Payee has a PAN"],
            ["nrDetailsFurnished", "Payee gave TIN, address and email (no-PAN carve-out)"],
            ["taxBorneByPayer", "Contract says the payer bears Indian tax"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input type="checkbox" checked={meta[key] as boolean} onChange={(e) => setM(key, e.target.checked)} />{label}
            </label>
          ))}
          <label className="flex items-center gap-2">Payee claims an MFN rate of
            <input type="number" className="w-20" placeholder="none" value={meta.mfnClaimRate ?? ""} onChange={(e) => setM("mfnClaimRate", e.target.value === "" ? null : Number(e.target.value))} />%
          </label>
        </fieldset>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <LaneColumn lane="ai">
          <button onClick={askModels} disabled={busy || !contract.trim()} className="mb-3 w-full rounded-md bg-ai px-3 py-2 font-semibold text-paper disabled:opacity-50">
            {busy ? "Asking three models..." : ai ? "Ask the models again" : "Ask the models"}
          </button>
          {aiError && <p role="alert" className="rounded-md bg-ca-wash p-2 text-sm text-ca">{aiError}</p>}
          {!ai && !aiError && <p className="text-sm text-muted">No model has seen this case yet. You can also characterise it yourself in the CA lane.</p>}
          {ai && <AiPanel ai={ai} />}
        </LaneColumn>

        <LaneColumn lane="rules">
          <ResultBlock r={result} />
          {result.branches && (
            <div className="mt-3 grid gap-2">
              {result.branches.map((b) => (
                <div key={b.label} className="rounded-md border border-line p-2 text-sm">
                  <p className="font-semibold">{b.label}</p>
                  <p className="text-muted">{b.result.ratePct}% = {b.result.taxInr != null ? `Rs ${b.result.taxInr.toLocaleString("en-IN")}` : "-"} ({b.result.article})</p>
                </div>
              ))}
            </div>
          )}
          {result.unverified.length > 0 && (
            <p className="mt-3 text-xs text-warn">Uses rules not yet verified against a primary source: {result.unverified.join(", ")}. See Rules.</p>
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
            <label className="flex items-center gap-2"><input type="checkbox" checked={char.peRisk} onChange={(e) => setC("peRisk", e.target.checked)} />Possible PE in India</label>
          </fieldset>

          {overridden && <p className="mt-3 rounded-md bg-warn-wash p-2 text-sm text-warn">You changed the models&apos; answer. Record why before signing.</p>}

          <div className="mt-4 grid gap-2 text-sm">
            <label className="flex flex-col gap-1">CA name<input value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="e.g. A. Rao, M. No. 123456" /></label>
            <label className="flex flex-col gap-1">UDIN (placeholder)<input value={udin} onChange={(e) => setUdin(e.target.value)} placeholder="generated on the ICAI portal" /></label>
            <label className="flex flex-col gap-1">Reason{overridden ? " (required)" : " (optional)"}
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button disabled={!canSign} onClick={() => decide(overridden ? "overridden" : "approved")} className="rounded-md bg-ca px-3 py-2 font-semibold text-paper disabled:opacity-40">
                Sign as {overridden ? "overridden" : "approved"}
              </button>
              <button disabled={!reviewer.trim()} onClick={() => decide("sent_back")} className="rounded-md border border-line px-3 py-2 disabled:opacity-40">Send back</button>
            </div>
            {!canSign && result.status === "refused" && <p className="text-xs text-muted">The engine refused. Fix the rule or the facts before anyone can sign.</p>}
          </div>

          {signed && (
            <div className="mt-4 text-center">
              {signed.decision !== "sent_back" ? <Stamp name={signed.reviewer} udin={signed.udin} hash={signed.hash} at={signed.at} /> : <p className="text-sm">Sent back. Logged as entry {signed.seq}.</p>}
              <div className="mt-2 flex justify-center gap-4 text-sm">
                {signed.decision !== "sent_back" && <Link className="underline" href={`/form146?seq=${signed.seq}`}>Open draft Form 146</Link>}
                <Link className="underline" href="/review">Review log</Link>
              </div>
            </div>
          )}
        </LaneColumn>
      </div>
    </div>
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
      <p><span className="text-muted">Consensus: </span><strong>{CATEGORY[k.category]}</strong>{k.category === "fts" && <> / make available: <strong>{MAKE_AVAILABLE[k.makeAvailable]}</strong></>}{k.peRisk && <> / <strong>PE risk</strong></>}</p>
      <ul className="space-y-2">
        {ai.votes.map((v) => (
          <li key={v.provider} className="rounded-md border border-line p-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-semibold">{v.label}</span>
              <span className="text-xs text-muted">{v.model} / {(v.latencyMs / 1000).toFixed(1)}s</span>
            </div>
            {!v.ok && <p className="text-ca">Failed: {v.error}</p>}
            {v.parsed && (
              <>
                <p>
                  {CATEGORY[v.parsed.category] ?? v.parsed.category}
                  {v.parsed.category === "fts" && `, make available: ${v.parsed.make_available}`}
                  {!v.valid && <span className="ml-2"><Pill tone="bad">vote discarded</Pill></span>}
                </p>
                <p className="mt-1 text-muted">{v.parsed.reasoning}</p>
                <ul className="mt-2 space-y-1">
                  {v.checks?.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-label={c.found ? "quote found in source" : "quote not found in source"} className={c.found ? "text-rules" : "text-ca"}>{c.found ? "found" : "not found"}</span>
                      <span className="source-text italic">&ldquo;{c.quote}&rdquo; <span className="not-italic text-xs text-muted">({c.source})</span></span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
