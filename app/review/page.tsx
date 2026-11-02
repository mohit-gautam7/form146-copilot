"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import signing from "@/public/photos/signing.webp";
import { load, save, verify, type Entry } from "@/lib/audit.ts";
import { Pill, CATEGORY, inr } from "@/components/ui";

type Check = Awaited<ReturnType<typeof verify>> | null;

export default function Review() {
  const [log, setLog] = useState<Entry[]>([]);
  const [check, setCheck] = useState<Check>(null);
  const [note, setNote] = useState("");

  useEffect(() => setLog(load()), []);

  async function runVerify(entries = log) {
    setCheck(await verify(entries));
  }

  function exportJson() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(log, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `form146-review-log-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    try {
      const entries = JSON.parse(await file.text()) as Entry[];
      const v = await verify(entries);
      setCheck(v);
      if (!v.ok) return setNote(`Not imported: the file's chain breaks at entry ${v.brokenAt} (${v.why}).`);
      save(entries);
      setLog(entries);
      setNote(`Imported ${entries.length} entries. Chain verified.`);
    } catch {
      setNote("Not imported: that file is not a review log export.");
    }
  }

  // Shows an auditor what tampering looks like, without touching the stored log.
  async function simulateTamper() {
    if (!log.length) return;
    const copy: Entry[] = JSON.parse(JSON.stringify(log));
    copy[0].reason = `${copy[0].reason} (edited later)`;
    const v = await verify(copy);
    setCheck(v);
    setNote("Simulation only: entry 1's reason was changed in memory. The stored log is untouched.");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Review log</h1>
        <p className="max-w-prose text-muted">
          Every sign-off and send-back is appended here with the facts, the models&apos; answer and the engine output at that moment.
          Each entry carries the hash of the one before it, so a changed or deleted entry is detectable. Stored in this browser only.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button onClick={() => runVerify()} className="rounded-md bg-rules px-3 py-2 font-semibold text-paper">Verify chain</button>
        <button onClick={simulateTamper} disabled={!log.length} className="rounded-md border border-line px-3 py-2 disabled:opacity-40">Simulate tampering</button>
        <button onClick={exportJson} disabled={!log.length} className="rounded-md border border-line px-3 py-2 disabled:opacity-40">Export JSON</button>
        <label className="relative cursor-pointer rounded-md border border-line px-3 py-2">Import JSON
          <input type="file" accept="application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </label>
        {check && (check.ok
          ? <Pill tone="ok">Chain intact: {log.length} entries</Pill>
          : <Pill tone="bad">Chain broken at entry {check.brokenAt}: {check.why}</Pill>)}
      </div>
      {note && <p className="text-sm text-muted">{note}</p>}

      {!log.length ? (
        <div className="grid overflow-hidden rounded-3xl border border-line bg-sheet sm:grid-cols-[1fr_1.2fr]">
          <Image src={signing} alt="A hand signing a document with a fountain pen" sizes="(min-width: 640px) 40vw, 100vw" placeholder="blur" className="h-56 w-full object-cover sm:h-full" />
          <div className="p-8">
            <p className="text-lg font-semibold">Nothing signed yet</p>
            <p className="mt-1 text-muted">Open the workbench, run a case and sign it. Every sign-off and send-back lands here, chained to the one before.</p>
            <Link href="/workbench" className="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 font-semibold text-paper">Open the workbench</Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-sheet">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="p-2">#</th><th className="p-2">Case</th><th className="p-2">Decision</th><th className="p-2">Characterisation</th>
                <th className="p-2">Rate / tax</th><th className="p-2">CA</th><th className="p-2">Hash</th><th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {[...log].reverse().map((e) => {
                const input = e.input as { category: string; makeAvailable: string };
                const result = e.result as { ratePct: number | null; taxInr: number | null; status: string };
                return (
                  <tr key={e.seq} className="border-b border-line align-top last:border-0">
                    <td className="p-2">{e.seq}</td>
                    <td className="p-2"><div className="font-semibold">{e.title}</div><div className="text-xs text-muted">{new Date(e.at).toLocaleString("en-IN")}</div></td>
                    <td className="p-2">
                      <Pill tone={e.decision === "approved" ? "ok" : e.decision === "overridden" ? "warn" : "plain"}>{e.decision.replace("_", " ")}</Pill>
                      {e.reason && <p className="mt-1 max-w-xs text-xs text-muted">{e.reason}</p>}
                    </td>
                    <td className="p-2">{CATEGORY[input.category]}{input.category === "fts" && ` (MA: ${input.makeAvailable})`}{e.ai ? "" : <span className="block text-xs text-muted">no model run</span>}</td>
                    <td className="p-2">{result.ratePct != null ? `${result.ratePct}% / ${inr(result.taxInr)}` : result.status}</td>
                    <td className="p-2">{e.reviewer}<div className="text-xs text-muted">UDIN {e.udin || "pending"}</div></td>
                    <td className="p-2 font-mono text-xs" title={e.hash}>{e.hash.slice(0, 12)}</td>
                    <td className="p-2">{e.decision !== "sent_back" && <Link className="underline" href={`/form146?seq=${e.seq}`}>Form 146</Link>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
