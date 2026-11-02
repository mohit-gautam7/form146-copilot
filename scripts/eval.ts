// Run: npm run eval            (live if any API key is set in .env.local, else replays recordings)
//      npm run eval -- --only <case-id>   (one case; rewrites eval-results.json with just that case)
//      npm run eval -- --replay (never call the models)
// Scores two lanes separately so a failure can be blamed on the right part:
//   rules lane  = gold characterisation -> engine        (tests the code)
//   full lane   = model consensus -> engine              (tests the AI + code)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { evaluate } from "../lib/engine.ts";
import { classify, PROVIDERS } from "../lib/llm.ts";
import { toInput, treatyText, matches, type Case } from "../lib/pipeline.ts";

const read = (p: string) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const rules = read("data/rules.json");
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null; // npm run eval -- --only us-saas
const cases: Case[] = read("data/cases.json").filter((c: Case) => !only || c.id === only);
const { articles } = read("data/treaties.json");
const today = new Date().toISOString().slice(0, 10);
const recPath = new URL("../data/recordings.json", import.meta.url);
const recordings: Record<string, any> = existsSync(recPath) ? JSON.parse(readFileSync(recPath, "utf8")) : {};

const live = !process.argv.includes("--replay") && Object.values(PROVIDERS).some((p) => process.env[p.keyEnv]);
console.log(live ? "Live run: calling the models." : "Replay run: using recorded model answers.");

const out = [];
for (const c of cases) {
  const rulesResult = evaluate(toInput(c.country, c.gold, c.meta), rules, today);
  const rulesDiffs = matches(rulesResult, c.expected);

  let rec = recordings[c.id] ?? null;
  if (live) {
    const treaty = rules.treaties[c.country];
    const res = await classify({ country: c.country, contract: c.contract, invoice: c.invoice, treatyText: treatyText(articles, c.country), treatyName: treaty.name }, process.env, { retries: 4, timeoutMs: 150_000 });
    rec = { caseId: c.id, recordedAt: new Date().toISOString(), ...res };
    recordings[c.id] = rec;
    writeFileSync(recPath, JSON.stringify(recordings, null, 1)); // save as we go: free tiers die mid-run
    await new Promise((r) => setTimeout(r, 20_000)); // Groq free tier: 8k tokens/min, about 2 calls a minute
  }

  let ai = null;
  if (rec) {
    const k = rec.consensus;
    const fullResult = evaluate(toInput(c.country, { category: k.category, makeAvailable: k.makeAvailable, ancillaryTo: k.ancillaryTo, peRisk: k.peRisk }, c.meta), rules, today);
    const fullDiffs = matches(fullResult, c.expected);
    ai = {
      agreement: k.agreement, validVotes: k.validVotes, note: k.note,
      consensus: { category: k.category, makeAvailable: k.makeAvailable, ancillaryTo: k.ancillaryTo, peRisk: k.peRisk },
      categoryOk: k.category === c.gold.category,
      makeAvailableOk: c.gold.category !== "fts" || k.makeAvailable === c.gold.makeAvailable,
      // Abstaining is a correct outcome only when the gold answer itself needs a CA.
      safe: fullDiffs.length === 0 || fullResult.status !== "ok",
      pass: fullDiffs.length === 0,
      diffs: fullDiffs,
      votes: rec.votes.map((v: any) => ({
        provider: v.provider, model: v.model, family: v.family, ok: v.ok, valid: v.valid, latencyMs: v.latencyMs, error: v.error?.slice(0, 160),
        category: v.parsed?.category, makeAvailable: v.parsed?.make_available,
        badQuotes: (v.checks ?? []).filter((x: any) => !x.found).length,
        replaced: (v.replaced ?? []).map((r: any) => r.model),
      })),
    };
  }
  out.push({ id: c.id, title: c.title, country: c.country, trap: c.trap, expected: c.expected, rules: { pass: rulesDiffs.length === 0, diffs: rulesDiffs }, ai });
  console.log(`${rulesDiffs.length ? "FAIL" : "pass"} rules | ${ai ? (ai.pass ? "pass" : "FAIL") : " -- "} full | ${c.id}${ai && !ai.pass ? "  " + ai.diffs.join("; ") : ""}`);
}

const withAi = out.filter((o) => o.ai);
const summary = {
  cases: out.length,
  rulesPass: out.filter((o) => o.rules.pass).length,
  aiCases: withAi.length,
  fullPass: withAi.filter((o) => o.ai!.pass).length,
  categoryOk: withAi.filter((o) => o.ai!.categoryOk).length,
  unsafe: withAi.filter((o) => !o.ai!.safe).length,
  agreement: { agree: withAi.filter((o) => o.ai!.agreement === "agree").length, flag: withAi.filter((o) => o.ai!.agreement === "flag").length, abstain: withAi.filter((o) => o.ai!.agreement === "abstain").length },
};
writeFileSync(new URL("../data/eval-results.json", import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), mode: live ? "live" : "replay", summary, cases: out }, null, 1));
console.log(summary);
