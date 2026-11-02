// Run: node --test lib/llm.test.ts   (no network: fetch is replaced)
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, parseJson, vote, unavailable, MODELS, type Vote } from "./llm.ts";

const docs = { country: "UK", contract: "Northgate will train Sahyadri's engineers to run the pipeline.", invoice: "Invoice NG-1. Training.", treatyText: "make available technical knowledge, experience, skill", treatyName: "India-UK DTAA" };
const answer = JSON.stringify({
  category: "fts", make_available: "yes", ancillary_to: "none", pe_risk: false, reasoning: "x",
  citations: [{ source: "contract", quote: "train Sahyadri's engineers to run the pipeline" }, { source: "treaty", quote: "make available technical knowledge" }],
});
const env = { GROQ_API_KEY: "k", NVIDIA_API_KEY: "k", OPENROUTER_API_KEY: "k" };

function fakeFetch(fail: Record<string, number>) {
  const calls: string[] = [];
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    const model = JSON.parse(init.body).model;
    calls.push(model);
    if (fail[model]) return new Response("gone", { status: fail[model] });
    return Response.json({ choices: [{ message: { content: "```json\n" + answer + "\n```" } }] });
  }) as typeof fetch;
  return calls;
}

test("a retired model is replaced by a backup from a family not already voting", async () => {
  const calls = fakeFetch({ "z-ai/glm-5.3-flash": 410 });
  const { votes, consensus } = await classify(docs, env, { retries: 0 });
  assert.equal(votes.length, 3);
  const families = votes.map((v) => v.family);
  assert.equal(new Set(families).size, 3, "three different families");
  const replacement = votes.find((v) => v.replaced);
  assert.equal(replacement?.replaced?.[0].model, "z-ai/glm-5.3-flash");
  assert.notEqual(replacement?.model, "z-ai/glm-5.3-flash");
  assert.ok(calls.includes("qwen/qwen3.8-27b"));
  assert.equal(consensus.agreement, "agree");
});

test("a provider with no key drops out of the rotation", async () => {
  fakeFetch({});
  const { votes } = await classify(docs, { GROQ_API_KEY: "k" }, { retries: 0 });
  assert.ok(votes.every((v) => v.provider === "groq"));
  assert.equal(new Set(votes.map((v) => v.family)).size, votes.length);
});

test("when everything is down the vote abstains instead of guessing", async () => {
  fakeFetch(Object.fromEntries(MODELS.map((m) => [m.model, 503])));
  const { consensus } = await classify(docs, env, { retries: 0 });
  assert.equal(consensus.agreement, "abstain");
  assert.equal(consensus.category, "unclear");
});

test("JSON repair handles fences and trailing commas only", () => {
  assert.equal(parseJson('```json\n{"category": "fts", "citations": [],}\n```').category, "fts");
  assert.throws(() => parseJson("I think it is FTS."));
});

test("a split between FTS and business profits is never settled by majority", () => {
  const v = (category: string, make_available: string) => ({
    provider: "x", label: "x", model: "x", family: category + make_available, latencyMs: 0, ok: true, valid: true, unverified: 0,
    parsed: { category, make_available, ancillary_to: "none", pe_risk: false, citations: [], reasoning: "" },
  }) as unknown as Vote;
  const k = vote([v("fts", "contested"), v("business_profits", "no"), v("business_profits", "na")]);
  assert.equal(k.category, "fts");
  assert.equal(k.makeAvailable, "contested");
  assert.equal(k.altCategory, "business_profits"); // the 2-vote majority is kept as a reading, not dropped
  assert.equal(k.agreement, "flag");
  assert.equal(vote([v("fts", "no"), v("business_profits", "na")]).makeAvailable, "contested"); // even if the FTS voter said no
});

test("outages get a short, specific reason", () => {
  assert.equal(unavailable("HTTP 410: gone"), "model retired or not found");
  assert.equal(unavailable('HTTP 429: {"message":"Rate limit exceeded: free-models-per-day"}'), "daily free quota used up");
  assert.equal(unavailable("HTTP 503: overloaded"), "provider error");
  assert.equal(unavailable("The operation was aborted due to timeout"), "timed out");
});
