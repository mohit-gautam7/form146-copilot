// Run: node --test lib/citations.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCitations } from "./citations.ts";

const src = { contract: "Brightlane grants Customer a non-exclusive, non-transferable right to access the service.", treaty: 'The term "fees for technical services" means payments of any kind ... if such services make available technical knowledge, experience, skill, know-how or processes.' };
const ok = (quote: string, source = "treaty") => checkCitations([{ source, quote }], src)[0].found;

test("verbatim quote passes, paraphrase fails", () => {
  assert.ok(ok("make available technical knowledge"));
  assert.ok(!ok("makes technical knowledge available"));
});

test("unicode hyphens and surrounding quote marks are normalised", () => {
  assert.ok(ok("a non‑exclusive, non‑transferable right", "contract"));
  assert.ok(ok('"make available technical knowledge, experience"'));
});

test("ellipsis: every fragment must be verbatim and in order", () => {
  assert.ok(ok('"fees for technical services" means payments ... make available technical knowledge'));
  assert.ok(!ok("make available technical knowledge ... fees for technical services"));
  assert.ok(!ok("fees for technical services ... invented clause text here"));
});

test("too-short fragments do not count as evidence", () => {
  assert.ok(!ok("the ... of"));
});
