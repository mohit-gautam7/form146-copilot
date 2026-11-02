import Link from "next/link";
import Image from "next/image";
import mumbai from "@/public/photos/mumbai.webp";
import port from "@/public/photos/port.webp";
import stamp from "@/public/photos/stamp.webp";
import { ArrowRight, Calculator, Check, FileSearch, Landmark, Sparkles, Stamp, X } from "lucide-react";
import Hero from "@/components/landing/Hero";
import { Reveal } from "@/components/motion";
import results from "@/data/eval-results.json";
import rules from "@/data/rules.json";

const FLAG: Record<string, string> = { US: "us", UK: "gb", SG: "sg", DE: "de", NL: "nl" };

const MILESTONES = [
  { date: "1 Apr 2026", title: "New Act, new numbers", body: "Section 195 became section 393(2), Table Sl. No. 17. Every template that cites 195 is now wrong for current payments." },
  { date: "1 Apr 2026", title: "15CA and 15CB retired", body: "The remitter's declaration is Form 145 and the CA's certificate is Form 146, with new TIN and UDIN checks." },
  { date: "19 Oct 2023", title: "MFN is not automatic", body: "AO v. Nestle SA: a treaty's most-favoured-nation clause needs its own notification. Vendors still ask for the lower rate." },
];

const LANES = [
  {
    icon: Sparkles, name: "AI lane", color: "var(--ai)", wash: "var(--ai-wash)", tag: "Probabilistic",
    does: ["Three model families read the contract and invoice", "Each must quote the documents and the treaty word for word", "If one is retired or rate-limited, a backup from another family takes its seat"],
    never: "Never outputs a rate.",
  },
  {
    icon: Calculator, name: "Rules lane", color: "var(--rules)", wash: "var(--rules-wash)", tag: "Exact",
    does: ["Chooses the Act by payment date", "Applies treaty vs Act rate, MFN, no-PAN, gross-up", "Every number carries its source sentence and last-checked date"],
    never: "Refuses rather than guesses when a rule is stale.",
  },
  {
    icon: Stamp, name: "CA lane", color: "var(--ca)", wash: "var(--ca-wash)", tag: "Accountable",
    does: ["Confirms or overrides the characterisation, with a reason", "Signs with UDIN; the draft Form 146 is filled in", "Each decision joins a hash-chained log an auditor can verify"],
    never: "The signature is never automated.",
  },
];

export default function Landing() {
  const s = results.summary;
  const treaties = Object.entries(rules.treaties as Record<string, { name: string; fts_requires_make_available: boolean; equipment_is_royalty: boolean }>);
  const rateFor = (c: string) => {
    const r = rules.treaty_rates.filter((x) => x.country === c).map((x) => x.rate);
    return Math.min(...r) === Math.max(...r) ? `${r[0]}%` : `${Math.min(...r)}-${Math.max(...r)}%`;
  };

  return (
    <div className="-mt-6">
      <Hero />

      {/* Why now */}
      <section className="bleed relative isolate overflow-hidden">
        <Image src={mumbai} alt="The Bandra-Worli Sea Link in Mumbai at dawn" fill sizes="100vw" placeholder="blur" className="-z-10 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0d1520]/85 via-[#0d1520]/75 to-[#0d1520]/90" />
        <div className="mx-auto max-w-7xl px-4 py-20 text-white">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">The law moved under every CA&apos;s feet this year.</h2>
            <p className="mt-3 max-w-xl text-white/75">Payments to non-residents are certified one by one. In 2026 the section, the forms and the case law all changed at once.</p>
          </Reveal>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {MILESTONES.map((m, i) => (
              <Reveal key={m.title} delay={i * 0.1}>
                <li className="h-full rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                  <p className="text-sm font-semibold text-[#f2b8b2]">{m.date}</p>
                  <h3 className="mt-1 text-lg font-bold">{m.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">{m.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Three lanes */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Three lanes. Each does only what it can be trusted with.</h2>
          <p className="mt-3 max-w-2xl text-muted">The split is the design. Judgement over messy text goes to models that must show their evidence. Arithmetic over published law goes to code. Liability stays with a person.</p>
        </Reveal>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {LANES.map((l, i) => (
            <Reveal key={l.name} delay={i * 0.12}>
              <article className="group relative h-full overflow-hidden rounded-3xl border border-line bg-sheet p-6 transition-shadow hover:shadow-2xl hover:shadow-black/5">
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: l.color }} />
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl transition-transform group-hover:-rotate-6 group-hover:scale-110" style={{ background: l.wash, color: l.color }}>
                    <l.icon size={22} aria-hidden />
                  </span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: l.wash, color: l.color }}>{l.tag}</span>
                </div>
                <h3 className="mt-5 text-xl font-bold">{l.name}</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {l.does.map((d) => <li key={d} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0" style={{ color: l.color }} aria-hidden />{d}</li>)}
                </ul>
                <p className="mt-4 border-t border-line pt-3 text-sm font-semibold">{l.never}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Evidence */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-20 lg:grid-cols-2">
        <Reveal className="relative">
          <Image src={port} alt="Container cranes at a port at night" sizes="(min-width: 1024px) 50vw, 100vw" placeholder="blur" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl shadow-black/20" />
          <div className="absolute -bottom-5 left-5 right-5 flex flex-wrap gap-2 sm:left-8 sm:right-auto">
            <span className="rounded-2xl border border-line bg-sheet px-4 py-2 text-sm shadow-lg"><span className="text-muted">Payment</span> <strong>Rs 44,80,000</strong> to the UK</span>
            <span className="rounded-2xl border border-line bg-sheet px-4 py-2 text-sm shadow-lg"><span className="text-muted">Withhold</span> <strong className="text-rules">15%</strong></span>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="text-3xl font-bold tracking-tight">Every claim points at a sentence you can find.</h2>
          <ul className="mt-6 space-y-4">
            {[
              [FileSearch, "Quotes are checked, not trusted", "A model's quote must appear verbatim in the contract, invoice or treaty. Elisions are allowed only if each piece is still exact and in order."],
              [Landmark, "Treaty texts from official sources", "Articles cut from the IRS, GOV.UK and CBDT texts. Rates carry the sentence they were checked against."],
              [X, "Contested means contested", "When the models split on 'make available', you see both outcomes computed side by side. The tool does not pick."],
            ].map(([Icon, t, b]) => {
              const I = Icon as typeof Check;
              return (
                <li key={t as string} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper"><I size={18} aria-hidden /></span>
                  <div><p className="font-semibold">{t as string}</p><p className="text-sm text-muted">{b as string}</p></div>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </section>

      {/* Numbers */}
      <section className="bleed border-y border-line bg-sheet">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight">Tested on {s.cases} traps, scored honestly.</h2>
            <p className="mt-2 max-w-2xl text-muted">Synthetic cases, each aimed at a known mistake: SaaS as royalty, equipment under the Dutch treaty, a March 2026 payment, a vendor&apos;s MFN claim. The safety number is the one on the right.</p>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [s.rulesPass, s.cases, "rules lane correct", "regression check"],
              [s.fullPass, s.aiCases, "full pipeline correct", "models + rules"],
              [s.categoryOk, s.aiCases, "models got the category", "consensus vs gold"],
              [s.unsafe, s.aiCases, "wrong and confident", "a wrong rate shown as final"],
            ].map(([v, of, label, hint], i) => (
              <Reveal key={label as string} delay={i * 0.08}>
                <div className={`rounded-2xl border p-5 ${i === 3 ? "border-ca/30 bg-ca-wash" : "border-line bg-paper"}`}>
                  <p className="text-4xl font-extrabold tracking-tight">{v as number}<span className="text-xl font-medium text-muted"> / {of as number}</span></p>
                  <p className="mt-1 font-semibold">{label as string}</p>
                  <p className="text-sm text-muted">{hint as string}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Link href="/eval" className="mt-6 inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline">See every case and failure <ArrowRight size={16} aria-hidden /></Link>
        </div>
      </section>

      {/* Treaties */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight">Five treaties, read clause by clause.</h2>
          <p className="mt-2 max-w-2xl text-muted">The same service can be taxable under one treaty and not under another. These are the differences the engine encodes.</p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {treaties.map(([c, t], i) => (
            <Reveal key={c} delay={i * 0.06}>
              <div className="h-full rounded-2xl border border-line bg-sheet p-5 transition-transform hover:-translate-y-1">
                <img src={`/flags/${FLAG[c]}.svg`} alt="" className="h-8 w-12 rounded-md object-cover shadow-sm ring-1 ring-black/5" />
                <p className="mt-3 font-bold">{t.name.replace(" DTAA", "")}</p>
                <p className="text-2xl font-extrabold text-rules">{rateFor(c)}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  <li>{t.fts_requires_make_available ? "Technical fees need 'make available'" : "No 'make available' test"}</li>
                  <li>{t.equipment_is_royalty ? "Equipment hire is a royalty" : "Equipment hire is not a royalty"}</li>
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate mb-4 overflow-hidden rounded-[2rem]">
        <Image src={stamp} alt="A rubber stamp resting on a tax office document" fill sizes="(min-width: 1280px) 1280px, 100vw" placeholder="blur" className="-z-10 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#1b2430]/95 via-[#1b2430]/80 to-[#1b2430]/30" />
        <div className="max-w-xl px-8 py-16 text-white sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Try a case. Sign it. Watch the log hold.</h2>
          <p className="mt-3 text-white/80">Fourteen synthetic cases are loaded with recorded model answers. Change anything and the rules lane recomputes at once.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/workbench" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-[#1b2430]">Open the workbench <ArrowRight size={18} aria-hidden /></Link>
            <Link href="/design" className="inline-flex items-center rounded-full border border-white/40 px-6 py-3 font-semibold">Read the design notes</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
