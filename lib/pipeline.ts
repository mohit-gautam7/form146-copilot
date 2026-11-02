// Glue shared by the UI and the eval script: case data -> engine input.
import type { Input, Result, Country, Category, MakeAvailable } from "./engine.ts";

export type Meta = Omit<Input, "country" | "category" | "makeAvailable" | "ancillaryTo" | "peRisk">;
export type Characterisation = { category: Category; makeAvailable: MakeAvailable; ancillaryTo: Input["ancillaryTo"]; peRisk: boolean };
export type Case = {
  id: string; title: string; country: Country; synthetic: boolean; authoredBy: string; trap: string;
  remitter: string; beneficiary: string; foreignAmount: string;
  contract: string; invoice: string; meta: Meta; gold: Characterisation;
  expected: { status: Result["status"]; basis: Result["basis"]; ratePct: number | null; form146Required: boolean; act?: string; certificateForm?: string };
};
export type Article = { id: string; country: string; article: string; title: string; text: string; source: string; source_url: string };

export const COUNTRIES: Record<Country, string> = {
  US: "United States", UK: "United Kingdom", SG: "Singapore", DE: "Germany", NL: "Netherlands",
};

export const toInput = (country: Country, c: Characterisation, meta: Meta): Input => ({ country, ...c, ...meta });

export const treatyText = (articles: Article[], country: string) =>
  articles.filter((a) => a.country === country).map((a) => a.text).join("\n\n");

export function matches(r: Result, e: Case["expected"]) {
  const diffs: string[] = [];
  if (r.status !== e.status) diffs.push(`status ${r.status} (expected ${e.status})`);
  if (r.basis !== e.basis) diffs.push(`basis ${r.basis} (expected ${e.basis})`);
  if (r.ratePct !== e.ratePct) diffs.push(`rate ${r.ratePct} (expected ${e.ratePct})`);
  if (r.form146Required !== e.form146Required) diffs.push(`Form 146 ${r.form146Required} (expected ${e.form146Required})`);
  if (e.act && r.act !== e.act) diffs.push(`Act ${r.act} (expected ${e.act})`);
  if (e.certificateForm && r.certificateForm !== e.certificateForm) diffs.push(`certificate ${r.certificateForm} (expected ${e.certificateForm})`);
  return diffs;
}
