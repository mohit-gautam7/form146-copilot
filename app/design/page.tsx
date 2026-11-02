import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const DOCS = path.join(process.cwd(), "docs");
const read = (f: string) => readFileSync(path.join(DOCS, f), "utf8");

// Just enough markdown for these files: headings, bold runs, bullets, paragraphs.
function Md({ src }: { src: string }) {
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p));
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(<ul key={out.length} className="list-disc space-y-1 pl-5">{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    list = [];
  };
  for (const line of src.split("\n")) {
    if (line.startsWith("- ")) { list.push(line.slice(2)); continue; }
    flush();
    if (line.startsWith("## ")) out.push(<h3 key={out.length} className="mt-3 font-semibold">{line.slice(3)}</h3>);
    else if (line.startsWith("# ")) out.push(<h2 key={out.length} className="text-lg font-bold">{line.slice(2)}</h2>);
    else if (line.trim()) out.push(<p key={out.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="max-w-[75ch] space-y-2 text-sm leading-relaxed">{out}</div>;
}

function Diagram() {
  const box = "fill-[var(--sheet)] stroke-[var(--line)]";
  return (
    <svg viewBox="0 0 960 330" role="img" aria-labelledby="arch-title" className="w-full min-w-[720px]">
      <title id="arch-title">Architecture: documents flow to three models, a citation check and a vote, then to the rules engine, then to the CA who signs into a hash-chained log.</title>
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" /></marker>
      </defs>
      {/* lane bands */}
      <rect x="170" y="10" width="250" height="310" rx="10" fill="var(--ai-wash)" />
      <rect x="440" y="10" width="250" height="310" rx="10" fill="var(--rules-wash)" />
      <rect x="710" y="10" width="240" height="310" rx="10" fill="var(--ca-wash)" />
      <text x="185" y="34" fill="var(--ai)" fontWeight="700" fontSize="15">AI lane: probabilistic</text>
      <text x="455" y="34" fill="var(--rules)" fontWeight="700" fontSize="15">Rules lane: exact</text>
      <text x="725" y="34" fill="var(--ca)" fontWeight="700" fontSize="15">CA lane: accountable</text>

      <g fontSize="12.5" fill="var(--ink)">
        <rect className={box} x="10" y="70" width="140" height="64" rx="6" />
        <text x="20" y="94">Contract + invoice</text><text x="20" y="112" fill="var(--muted)">(evidence, fenced)</text>
        <rect className={box} x="10" y="160" width="140" height="64" rx="6" />
        <text x="20" y="184">Treaty article</text><text x="20" y="202" fill="var(--muted)">looked up by country</text>
        <rect className={box} x="10" y="250" width="140" height="58" rx="6" />
        <text x="20" y="274">Facts CA vouches for</text><text x="20" y="292" fill="var(--muted)">TRC, 10F, PAN, date</text>

        <rect className={box} x="185" y="60" width="220" height="80" rx="6" />
        <text x="197" y="84">Groq / NVIDIA NIM / OpenRouter</text>
        <text x="197" y="103" fill="var(--muted)">classify only, never a rate</text>
        <text x="197" y="122" fill="var(--muted)">3 families; backups if one is down</text>
        <rect className={box} x="185" y="160" width="220" height="56" rx="6" />
        <text x="197" y="184">Citation check (code)</text><text x="197" y="202" fill="var(--muted)">counts only with verified quotes</text>
        <rect className={box} x="185" y="236" width="220" height="64" rx="6" />
        <text x="197" y="260">Vote: agree / majority / abstain</text><text x="197" y="279" fill="var(--muted)">split on &ldquo;make available&rdquo; = contested</text>

        <rect className={box} x="455" y="60" width="220" height="56" rx="6" />
        <text x="467" y="84">rules.json</text><text x="467" y="102" fill="var(--muted)">source quote, dates, last verified</text>
        <rect className={box} x="455" y="140" width="220" height="160" rx="6" />
        <text x="467" y="164">Engine (pure function)</text>
        <text x="467" y="186" fill="var(--muted)">Act by payment date</text>
        <text x="467" y="204" fill="var(--muted)">treaty characterisation</text>
        <text x="467" y="222" fill="var(--muted)">lower of treaty vs Act</text>
        <text x="467" y="240" fill="var(--muted)">MFN only if notified</text>
        <text x="467" y="258" fill="var(--muted)">no-PAN, gross-up, threshold</text>
        <text x="467" y="282">refuses if a rule is stale</text>

        <rect className={box} x="725" y="60" width="210" height="80" rx="6" />
        <text x="737" y="84">Confirms or corrects</text><text x="737" y="102">the characterisation</text><text x="737" y="122" fill="var(--muted)">override needs a reason</text>
        <rect className={box} x="725" y="160" width="210" height="56" rx="6" />
        <text x="737" y="184">Signs Form 146 (UDIN)</text><text x="737" y="202" fill="var(--muted)">legally accountable</text>
        <rect className={box} x="725" y="236" width="210" height="64" rx="6" />
        <text x="737" y="260">Hash-chained review log</text><text x="737" y="279" fill="var(--muted)">export, verify offline</text>
      </g>

      <g stroke="var(--muted)" strokeWidth="1.5" fill="none" markerEnd="url(#arr)">
        <path d="M150 102 H183" /><path d="M150 192 C165 192 165 110 183 105" />
        <path d="M295 140 V158" /><path d="M295 216 V234" />
        <path d="M405 268 H430 V48 H700 V95 H723" />
        <path d="M565 116 V138" />
        <path d="M830 140 V158" /><path d="M830 216 V234" />
        <path d="M723 120 C700 120 700 200 677 200" />
        <path d="M150 296 V316 H436 V270 H453" />
        <path d="M677 230 C700 230 700 188 723 188" />
      </g>
    </svg>
  );
}

export default function Design() {
  const decisions = readdirSync(path.join(DOCS, "decisions")).filter((f) => f.endsWith(".md")).sort();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Design notes</h1>
        <p className="max-w-prose text-muted">Why the system is shaped this way, what was rejected, and where it is weakest. The same files live in <code>docs/</code> in the repository.</p>
      </div>
      <section className="overflow-x-auto rounded-2xl border border-line bg-sheet p-4">
        <h2 className="mb-2 font-semibold">Where the AI acts and where the human acts</h2>
        <Diagram />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Decisions</h2>
        {decisions.map((f) => <article key={f} className="rounded-2xl border border-line bg-sheet p-4"><Md src={read(`decisions/${f}`)} /></article>)}
      </section>
      <section className="rounded-2xl border border-line bg-sheet p-4"><Md src={read("threat-model.md")} /></section>
      <section className="rounded-2xl border border-line bg-sheet p-4"><Md src={read("jurisdiction-delta.md")} /></section>
      <section className="rounded-2xl border border-line bg-sheet p-4"><Md src={read("design-direction.md")} /></section>
    </div>
  );
}
