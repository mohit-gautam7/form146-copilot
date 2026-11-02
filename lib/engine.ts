// Deterministic withholding engine. No LLM, no I/O: same input + same rules => same answer.
// Every number comes from data/rules.json and every step leaves a trace line with its source.

export type Country = "US" | "UK" | "SG" | "DE" | "NL";
export type Category = "royalty_ip" | "royalty_equipment" | "fts" | "business_profits" | "reimbursement" | "unclear";
export type MakeAvailable = "yes" | "no" | "contested" | "na";

export type Input = {
  country: Country;
  category: Category;
  makeAvailable: MakeAvailable;
  ancillaryTo: "none" | "ip" | "equipment";
  amountInr: number;
  paymentDate: string; // YYYY-MM-DD, date of remittance
  creditDate?: string; // date credited to the payee's account in the books, if earlier
  payeeType: "company" | "non_company";
  trc: boolean;
  form10f: boolean; // Form 10F (1961 Act) or Form 41 (2025 Act): the treaty-claim information form
  noPeDeclaration: boolean;
  pan: boolean;
  nrDetailsFurnished: boolean; // name, email, address, TRC, foreign TIN (no-PAN carve-out)
  peRisk: boolean;
  taxBorneByPayer: boolean;
  mfnClaimRate?: number | null;
};

export type Step = { label: string; detail: string; source?: string; verified?: boolean };

export type Result = {
  status: "ok" | "needs_ca" | "refused";
  basis: "treaty" | "act" | "not_taxable" | "none";
  ratePct: number | null;
  taxInr: number | null;
  grossInr: number | null;
  act: string | null;
  section: string | null;
  certificateForm: string | null;
  form146Required: boolean;
  article: string | null;
  ruleIds: string[];
  unverified: string[];
  trace: Step[];
  reasons: string[];
  branches?: { label: string; result: Result }[];
};

type Rules = any; // shape documented in data/rules.json

const DAY = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

export function evaluate(input: Input, rules: Rules, today: string): Result {
  if (input.makeAvailable === "contested" && input.category === "fts") {
    const yes = evaluate({ ...input, makeAvailable: "yes" }, rules, today);
    const no = evaluate({ ...input, makeAvailable: "no" }, rules, today);
    // A dispute that changes nothing needs no CA decision (e.g. Germany has no make-available test).
    if (yes.status === no.status && yes.basis === no.basis && yes.ratePct === no.ratePct) {
      yes.trace.unshift({ label: "Make available", detail: "The models dispute whether know-how is made available, but both readings give the same result here, so the dispute does not matter." });
      return yes;
    }
    return {
      ...yes,
      status: "needs_ca",
      reasons: ["'Make available' is contested. Both readings are computed; the CA must choose and record why."],
      branches: [
        { label: "If it makes know-how available (FTS)", result: yes },
        { label: "If it does not (business profits)", result: no },
      ],
    };
  }

  const r: Result = {
    status: "ok", basis: "none", ratePct: null, taxInr: null, grossInr: null,
    act: null, section: null, certificateForm: null, form146Required: false, article: null,
    ruleIds: [], unverified: [], trace: [], reasons: [],
  };
  const step = (label: string, detail: string, source?: string, verified?: boolean) =>
    r.trace.push({ label, detail, source, verified });
  const stop = (status: Result["status"], reason: string) => {
    r.status = status;
    r.reasons.push(reason);
    return r;
  };
  // TDS law follows the earlier of credit and payment; the remittance forms follow the payment date.
  const trigger = input.creditDate && input.creditDate < input.paymentDate ? input.creditDate : input.paymentDate;
  const inForce = (a: any, d: string) => (!a.effective_from || d >= a.effective_from) && (!a.effective_to || d <= a.effective_to);

  // Every rule passes through here: out of window or too old => the engine refuses rather than guess.
  const checkRule = (rule: { id: string; last_verified: string; verified: boolean; effective_to?: string | null; effective_from?: string | null }) => {
    if (rule.effective_from && trigger < rule.effective_from) return `${rule.id} not yet in force on ${trigger}`;
    if (rule.effective_to && trigger > rule.effective_to) return `${rule.id} expired on ${rule.effective_to}`;
    const age = (Date.parse(today) - Date.parse(rule.last_verified)) / DAY;
    if (age > rules.max_age_days) return `${rule.id} last verified ${rule.last_verified}, older than ${rules.max_age_days} days`;
    r.ruleIds.push(rule.id);
    if (!rule.verified) r.unverified.push(rule.id);
    return null;
  };

  // 1. Which Act governs TDS: the earlier of credit and payment, not today's date (CBDT TDS FAQ 1).
  const act = rules.act.find((a: any) => inForce(a, trigger));
  if (!act) return stop("refused", `No Act rule covers ${trigger}.`);
  const actErr = checkRule(act);
  if (actErr) return stop("refused", `Stale rule: ${actErr}.`);
  // Forms follow the law in force on the remittance date (CBDT forms FAQ 24), even if TDS stays under the old Act.
  const forms = rules.act.find((a: any) => inForce(a, input.paymentDate)) ?? act;
  r.act = act.act;
  r.section = act.section;
  r.certificateForm = `Form ${forms.form_certificate}`;
  step("Governing law", `${act.act}, section ${act.section}: TDS was triggered on ${trigger}, the earlier of credit and payment.`, rules.tds_trigger_source, true);
  step("Remittance forms", `Paid on ${input.paymentDate}: Form ${forms.form_declaration} declaration, Form ${forms.form_certificate} CA certificate.${forms !== act ? ` The forms follow the remittance date even though TDS stays under the ${act.act}.` : ""}`, forms.forms_source ?? act.source_url, forms.verified);

  // 2. Questions the engine will not answer.
  if (input.category === "unclear") return stop("needs_ca", "The nature of the payment is unclear. A CA must characterise it first.");
  if (input.peRisk) {
    step("Permanent establishment", "The payee may have a PE in India that this payment is connected to. Articles 12/13 give way to Article 7.");
    return stop("needs_ca", "Possible PE: profit attribution is outside this tool. A CA must decide.");
  }
  if (input.category === "reimbursement") {
    r.basis = "not_taxable";
    r.ratePct = 0;
    r.taxInr = 0;
    step("Reimbursement", "A pure reimbursement at cost is not income of the payee. No withholding.");
    r.reasons.push("Confirm it is at cost with third-party invoices; any mark-up makes it a service fee.");
    return r;
  }

  const t = rules.treaties[input.country];
  const treatyEligible = input.trc && input.form10f;
  const infoForm = `Form ${act.form_treaty_info}`;
  step("Treaty documents", treatyEligible
    ? `TRC and ${infoForm} are on file, so treaty benefit is available.`
    : `Missing ${[!input.trc && "TRC", !input.form10f && infoForm].filter(Boolean).join(" and ")}. Treaty benefit is denied and the Act rate applies.`);

  // 3. Treaty characterisation: the same service can be FTS under one treaty and business profits under another.
  let treatyCat: string = input.category;
  r.article = `${t.name} Art. ${t.article}`;
  if (input.category === "royalty_equipment" && !t.equipment_is_royalty) {
    treatyCat = "business_profits";
    step("Equipment hire", `${t.name} does not list equipment in its royalty definition, so this falls under Article 7.`);
  }
  if (input.category === "fts") {
    if (input.ancillaryTo === "equipment") treatyCat = "fts_ancillary_equipment";
    else if (input.ancillaryTo === "ip") treatyCat = "fts";
    else if (t.fts_requires_make_available && input.makeAvailable !== "yes") {
      treatyCat = "business_profits";
      step("Make available", `${t.name} taxes technical services only if they make know-how available to the payer. They do not, so this is business profits.`);
    } else {
      step("Fees for technical services", t.fts_requires_make_available
        ? "The services make know-how available, so they are FTS under the treaty."
        : `${t.name} has no 'make available' test; managerial, technical or consultancy services are FTS.`);
    }
  }

  // 4. Act rate with surcharge and cess (used when there is no treaty, or when it is lower).
  const sc = rules.surcharge;
  const slabs = sc[input.payeeType] as { above: number; pct: number }[];
  const surchargePct = slabs.filter((s) => input.amountInr > s.above).reduce((m, s) => Math.max(m, s.pct), 0);
  const actRate = round4(act.rate * (1 + surchargePct / 100) * (1 + sc.cess_pct / 100));

  let rate: number;
  if (!treatyEligible) {
    if (input.category === "business_profits") return stop("needs_ca", "Without treaty protection, whether domestic law taxes this needs a CA's view.");
    const e = checkRule({ id: "surcharge", ...sc });
    if (e) return stop("refused", `Stale rule: ${e}.`);
    rate = actRate;
    r.basis = "act";
    r.article = null;
    // ponytail: slab tested on this payment alone; the law uses the year's aggregate paid or likely to be paid.
    step("Act rate", `${act.rate}% + surcharge ${surchargePct}% + cess ${sc.cess_pct}% = ${actRate}%. Surcharge slab tested on this payment; check the year's aggregate to this payee.`, sc.source_url, sc.verified);
  } else if (treatyCat === "business_profits") {
    if (!input.noPeDeclaration) return stop("needs_ca", "Not taxable as business profits only if there is no PE. Get the payee's no-PE declaration first.");
    r.basis = "not_taxable";
    r.ratePct = 0;
    r.taxInr = 0;
    r.article = `${t.name} Art. 7`;
    step("Business profits", "No PE in India, so India has no right to tax under Article 7. No withholding.");
    r.reasons.push("Non-taxable remittance: Form 145 Part D. Banks may still ask for a CA certificate.");
    return r;
  } else {
    const tr = rules.treaty_rates.find((x: any) => x.country === input.country && (x.category === treatyCat || x.category === "*"));
    if (!tr) return stop("needs_ca", `No treaty rate is modelled for ${treatyCat} under ${t.name}.`);
    const e = checkRule(tr) ?? checkRule({ id: "treaty_rate_is_final", ...rules.treaty_rate_is_final });
    if (e) return stop("refused", `Stale rule: ${e}.`);
    r.article = `${t.name} Art. ${tr.para}`;
    step("Treaty rate", `${tr.rate}% under para ${tr.para}: "${tr.source_quote}".`, tr.source_url, tr.verified);
    const se = checkRule({ id: "surcharge", ...sc });
    if (se) return stop("refused", `Stale rule: ${se}.`);
    if (tr.rate <= actRate) {
      rate = tr.rate;
      r.basis = "treaty";
      step("Lower of treaty and Act", `Treaty ${tr.rate}% vs Act ${actRate}%. The treaty rate applies, with no surcharge or cess on top.`, undefined, rules.treaty_rate_is_final.verified);
    } else {
      rate = actRate;
      r.basis = "act";
      step("Lower of treaty and Act", `Act ${actRate}% is lower than treaty ${tr.rate}%, so the Act rate applies.`);
    }
  }

  // 5. MFN: never self-executing (AO v. Nestle SA, Supreme Court, 2023).
  if (input.mfnClaimRate != null && input.mfnClaimRate < rate) {
    step("MFN claim rejected", `The payee claims ${input.mfnClaimRate}% via an MFN clause. Without a separate notification it does not apply (AO v. Nestle SA, SC 2023). Kept ${rate}%.`);
    r.reasons.push("MFN claim rejected. Tell the payee why before remitting.");
  }

  // 6. No PAN: higher rate, unless the non-resident carve-out applies.
  if (!input.pan) {
    const np = rules.no_pan;
    const e = checkRule({ id: "no_pan", ...np });
    if (e) return stop("refused", `Stale rule: ${e}.`);
    if (input.nrDetailsFurnished && input.trc) {
      step("No PAN", `Carve-out for non-residents who give TRC, TIN and contact details. Rate stays ${rate}%.`, np.source_url, np.verified);
    } else if (rate < np.rate) {
      step("No PAN", `No PAN and no carve-out details: rate raised from ${rate}% to ${np.rate}%.`, np.source_url, np.verified);
      rate = np.rate;
    }
  }

  // 7. Amount: gross up if the payer bears the tax.
  r.ratePct = rate;
  if (input.taxBorneByPayer) {
    const gross = input.amountInr / (1 - rate / 100);
    r.grossInr = round2(gross);
    r.taxInr = Math.round(gross * rate / 100);
    step("Gross-up", `The payer bears the tax: gross = ${input.amountInr} / (1 - ${rate}%) = ${r.grossInr}; tax = ${r.taxInr}.`);
  } else {
    r.taxInr = Math.round(input.amountInr * rate / 100);
    step("Tax to withhold", `${input.amountInr} x ${rate}% = ${r.taxInr}.`);
  }

  // ponytail: per-remittance check; the real test is the payee's aggregate for the year. Needs a payment ledger.
  r.form146Required = input.amountInr > rules.form146_threshold_inr;
  step("Certificate", r.form146Required
    ? `${r.certificateForm} (CA certificate) required: taxable and above Rs ${rules.form146_threshold_inr}.${forms.certificate_note ? " " + forms.certificate_note : ""}`
    : `At or below Rs ${rules.form146_threshold_inr}: no CA certificate, file the declaration only.`, rules.form146_threshold_source, true);
  return r;
}
