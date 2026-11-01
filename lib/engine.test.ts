// Run: node --test lib/engine.test.ts   (Node 22.6+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluate, type Input } from "./engine.ts";

const rules = JSON.parse(readFileSync(new URL("../data/rules.json", import.meta.url), "utf8"));
const TODAY = "2026-11-02";
const base: Input = {
  country: "US", category: "fts", makeAvailable: "yes", ancillaryTo: "none", amountInr: 2_000_000,
  paymentDate: "2026-06-15", payeeType: "company", trc: true, form10f: true, noPeDeclaration: true,
  pan: true, nrDetailsFurnished: true, peRisk: false, taxBorneByPayer: false, mfnClaimRate: null,
};
const run = (o: Partial<Input>, today = TODAY) => evaluate({ ...base, ...o }, rules, today);

test("US FTS that makes know-how available: 15% treaty, 2025 Act, Form 146", () => {
  const r = run({});
  assert.equal(r.status, "ok");
  assert.equal(r.basis, "treaty");
  assert.equal(r.ratePct, 15);
  assert.equal(r.taxInr, 300_000);
  assert.equal(r.certificateForm, "Form 146");
  assert.ok(r.form146Required);
});

test("Same service without make-available is business profits: nil", () => {
  const r = run({ makeAvailable: "no" });
  assert.equal(r.basis, "not_taxable");
  assert.equal(r.taxInr, 0);
});

test("Germany has no make-available test: 10% even when nothing is made available", () => {
  const r = run({ country: "DE", makeAvailable: "no" });
  assert.equal(r.ratePct, 10);
});

test("Equipment hire is not a royalty under the Netherlands treaty", () => {
  assert.equal(run({ country: "NL", category: "royalty_equipment" }).basis, "not_taxable");
  assert.equal(run({ country: "UK", category: "royalty_equipment" }).ratePct, 10);
});

test("No TRC: Act rate with surcharge and cess", () => {
  const r = run({ trc: false });
  assert.equal(r.basis, "act");
  assert.equal(r.ratePct, 20.8); // 20 lakh: no surcharge, 20 x 1.04
  assert.equal(run({ trc: false, amountInr: 20_000_000 }).ratePct, 21.216); // over 1 crore: 20 x 1.02 x 1.04
});

test("Payment before 1 Apr 2026 uses the 1961 Act and Form 15CB", () => {
  const r = run({ paymentDate: "2026-03-20" });
  assert.equal(r.section, "195 (rate via 115A)");
  assert.equal(r.certificateForm, "Form 15CB");
});

test("Gross-up when the payer bears the tax", () => {
  const r = run({ country: "SG", taxBorneByPayer: true, amountInr: 900_000 });
  assert.equal(r.grossInr, 1_000_000);
  assert.equal(r.taxInr, 100_000);
});

test("MFN claim is rejected and the rate is unchanged", () => {
  const r = run({ country: "NL", mfnClaimRate: 5 });
  assert.equal(r.ratePct, 10);
  assert.ok(r.trace.some((s) => s.label === "MFN claim rejected"));
});

test("No PAN without carve-out details raises the rate to 20%", () => {
  assert.equal(run({ country: "SG", pan: false, nrDetailsFurnished: false }).ratePct, 20);
  assert.equal(run({ country: "SG", pan: false, nrDetailsFurnished: true }).ratePct, 10);
});

test("Contested make-available returns both branches and asks the CA", () => {
  const r = run({ makeAvailable: "contested" });
  assert.equal(r.status, "needs_ca");
  assert.deepEqual(r.branches!.map((b) => b.result.ratePct), [15, 0]);
});

test("Stale rules make the engine refuse", () => {
  const r = run({}, "2028-01-01");
  assert.equal(r.status, "refused");
});

test("PE risk and unclear payments go to the CA with no rate", () => {
  assert.equal(run({ peRisk: true }).ratePct, null);
  assert.equal(run({ category: "unclear" }).status, "needs_ca");
});

test("Small payment: no Form 146", () => {
  assert.equal(run({ amountInr: 400_000 }).form146Required, false);
});
