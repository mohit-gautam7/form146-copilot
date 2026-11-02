"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { load, type Entry } from "@/lib/audit.ts";
import type { Input, Result } from "@/lib/engine.ts";
import { COUNTRIES } from "@/lib/pipeline.ts";
import { CATEGORY, inr, Stamp } from "@/components/ui";

type Who = "Input" | "AI" | "Rules" | "CA";
const WHO_CLS: Record<Who, string> = { Input: "text-muted", AI: "text-ai", Rules: "text-rules", CA: "text-ca" };

export default function Page() {
  return <Suspense><Form146 /></Suspense>;
}

function Form146() {
  const seq = Number(useSearchParams().get("seq"));
  const [e, setE] = useState<Entry | null | undefined>(undefined);
  useEffect(() => setE(load().find((x) => x.seq === seq) ?? null), [seq]);

  if (e === undefined) return null;
  if (!e) return <p className="text-muted">No signed entry {seq} in this browser. Sign a case in the <Link className="underline" href="/workbench">Workbench</Link> first.</p>;

  const i = e.input as Input & { remitter: string; beneficiary: string };
  const r = e.result as Result;
  const aiCat = (e.ai as { category?: string } | null)?.category;
  const charWho: Who = aiCat && aiCat === i.category ? "AI" : "CA";
  const taxable = r.basis === "treaty" || r.basis === "act";

  const rows: [string, string, Who][] = [
    ["Name of remitter", i.remitter || "-", "Input"],
    ["Name of beneficiary", i.beneficiary || "-", "Input"],
    ["Country of residence of beneficiary", COUNTRIES[i.country], "Input"],
    ["Amount payable (INR)", inr(i.amountInr), "Input"],
    ["Nature of remittance", `${CATEGORY[i.category]}${i.category === "fts" ? ` (makes know-how available: ${i.makeAvailable})` : ""}`, charWho],
    ["Governing law and section", `${r.act ?? "-"}, section ${r.section ?? "-"}`, "Rules"],
    ["Is the remittance chargeable to tax in India?", taxable ? "Yes" : r.basis === "not_taxable" ? "No" : "Referred to CA", "Rules"],
    ["Tax residency certificate obtained", i.trc ? "Yes" : "No", "Input"],
    ["Relevant DTAA and article", r.article ?? "Not applied", "Rules"],
    ["Rate of TDS", r.ratePct != null ? `${r.ratePct}%` : "-", "Rules"],
    ["Basis of rate", r.basis === "treaty" ? "Rate as per DTAA" : r.basis === "act" ? "Rate as per Income-tax Act" : r.basis === "not_taxable" ? "Not chargeable" : "-", "Rules"],
    ["Amount of TDS", inr(r.taxInr), "Rules"],
    ["Grossed up (tax borne by remitter)", r.grossInr != null ? inr(r.grossInr) : "No", "Rules"],
    ["Certified by", `${e.reviewer}${e.udin ? `, UDIN ${e.udin}` : ""}`, "CA"],
    ["Decision", e.decision === "overridden" ? `Approved with override: ${e.reason}` : "Approved", "CA"],
  ];

  return (
    <article className="mx-auto max-w-3xl rounded-2xl border border-line bg-sheet p-6 print:border-0 print:p-0">
      <div className="no-print mb-4 flex justify-between text-sm">
        <Link className="underline" href="/review">Back to review log</Link>
        <button onClick={() => window.print()} className="rounded-md border border-line px-3 py-1">Print or save as PDF</button>
      </div>
      <header className="mb-4 border-b border-line pb-3">
        <p className="text-sm text-muted">DRAFT: not filed. Prepared from synthetic data.</p>
        <h1 className="text-2xl font-bold">{r.certificateForm ?? "Form 146"}: Certificate of an accountant</h1>
        <p className="text-sm text-muted">Payment to a non-resident, {r.act}. Entry {e.seq}, signed {new Date(e.at).toLocaleString("en-IN")}.</p>
      </header>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value, who]) => (
            <tr key={label} className="border-b border-line align-top last:border-0">
              <th scope="row" className="w-2/5 py-2 pr-3 text-left font-normal text-muted">{label}</th>
              <td className="py-2">{value}</td>
              <td className={`py-2 pl-2 text-right text-xs font-semibold ${WHO_CLS[who]}`}>{who}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted">The right-hand column shows who supplied each field: the facts entered (Input), the models (AI), the rules engine (Rules) or the chartered accountant (CA).</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="text-xs text-muted">
          <p className="font-semibold text-ink">Computation trail</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">{r.trace.map((s, n) => <li key={n}>{s.label}: {s.detail}</li>)}</ol>
          <p className="mt-2 break-all">Log hash {e.hash}</p>
        </div>
        <Stamp name={e.reviewer} udin={e.udin} hash={e.hash} at={e.at} />
      </div>
    </article>
  );
}
