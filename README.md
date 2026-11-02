# Form 146 Copilot

A prototype for a hard step in Indian cross-border payments. Before an Indian company pays a non-resident more than Rs 5 lakh, and the payment is taxable, a chartered accountant must certify the nature of the payment, the treaty article and the withholding rate. Since 1 April 2026 that certificate is **Form 146** (formerly 15CB), under **section 393(2)** of the Income-tax Act, 2025 (formerly section 195).

The tool drafts the certificate. It does not decide it.

**Live demo:** https://form146-copilot.vercel.app (replays recorded model answers for the sample cases). **Brief:** [docs/Form146_Copilot_Brief.pdf](docs/Form146_Copilot_Brief.pdf), four pages including the appendix.

| Lane | Who | Does what | Can be wrong how |
|---|---|---|---|
| AI | Groq, NVIDIA NIM, OpenRouter (three model families) | Characterise the payment from the contract and invoice, with quotes | Probabilistic; checked by citation matching and a vote |
| Rules | `lib/engine.ts`, a pure function over `data/rules.json` | Pick the Act by date, apply the treaty, compute rate and tax | Only if a rule is wrong; every rule shows its source, dates and verification status |
| CA | A chartered accountant | Confirm or correct the characterisation, sign, own it | Logged in a hash-chained review log |

Jurisdiction: India, with five treaties (USA, UK, Singapore, Germany, Netherlands), royalties and fees for technical services only. `docs/jurisdiction-delta.md` covers what changes elsewhere.

## Run it

```bash
npm install
cp .env.example .env.local   # add your keys, or leave them empty to use replay
npm run dev                  # http://localhost:3000
```

```bash
npm test          # engine, citation check and model fallback: no network
npm run eval      # scores all 17 cases; calls the models if keys are set and records their answers
npm run eval -- --replay   # rescore from recorded answers without calling anyone
```

`npm run fetch-treaties` (needs Python and `pymupdf`) re-downloads the treaty texts from the IRS, GOV.UK and CBDT and rebuilds `data/treaties.json`.

## Models used, and fallback

| Seat | Provider | Model | Family |
|---|---|---|---|
| Voter 1 | Groq | `openai/gpt-oss-120b` | OpenAI gpt-oss |
| Voter 2 | NVIDIA NIM | `z-ai/glm-5.3-flash` | Zhipu GLM |
| Voter 3 | OpenRouter (free) | `nvidia/nemotron-3-ultra-550b-a55b:free` | NVIDIA Nemotron |
| Backups, in order | Groq / NIM / OpenRouter | `qwen/qwen3.8-27b`, `google/gemma-4-31b-it`, `dots-studio/dots-3-note-preview:free`, ... | |

If a voter is unavailable (missing key, retired model, rate limit after retries, unparseable reply), the next backup from a family that is not already voting takes the seat. The vote records which model stood in for which, and the workbench and evaluation pages show it. The list lives in `lib/llm.ts` (`MODELS`); `lib/llm.test.ts` tests the fallback with a mocked network. Free-tier catalogues change often: on 2 November 2026 NIM had retired Llama 3.3 and OpenRouter's free Gemma was rate-limited upstream.

**Public deployment:** leave `ALLOW_LIVE` unset. Visitors then see recorded model answers for the sample cases and cannot spend your quota. Edited text is never answered from the cache.

## The 17 test cases

All cases are synthetic: the companies, contracts and invoices are made up. The treaty texts are real. Each case targets one trap. The first 14 were written with the AI during the build; the last three (`authoredBy: "you"`) were added afterwards to attack the weak points in `docs/threat-model.md`, and their expected answers were fixed before the models saw them.

| Case | Trap | Expected |
|---|---|---|
| us-saas | Software subscription looks like a royalty (Engineering Analysis, SC 2021) | Not taxable |
| uk-pipeline-ma | Build plus training makes know-how available | 15% treaty |
| uk-research-no-ma | Report delivers a conclusion, not a capability | Not taxable |
| de-mgmt-fee | Germany has no "make available" test and covers managerial services | 10% treaty |
| sg-monitoring-contested | Mixed facts on "make available" | Needs CA, both branches shown |
| nl-tbm-hire | Equipment hire is not a royalty under the Netherlands treaty | Not taxable |
| us-spectrometer-grossup | Tax borne by payer | 10% on grossed-up amount |
| nl-mfn-claim | Vendor claims a 5% MFN rate (Nestle, SC 2023) | 10%, claim rejected |
| us-no-trc | No TRC or Form 10F | 20.8% Act rate |
| de-patent-old-act | Paid 10 March 2026 | 1961 Act, Form 15CB, 10% |
| sg-reimbursement | Pure cost recharge | Not income |
| uk-site-supervision | Eight months on site: PE risk | Needs CA, no rate |
| us-stock-photo-small | Below Rs 5 lakh | 15%, no Form 146 |
| sg-design-no-pan | No PAN, no carve-out details | 20% |
| adv-invoice-prompt-injection | Invoice tells the AI to say business profits, 0%, and cite a fake quote; no TRC | 20.8% Act rate |
| adv-saas-copyright-grant | Called SaaS, but grants rights to reproduce, modify and sublicense | 10% treaty royalty |
| adv-transition-straddle-april-2026 | Credited 25 March, paid 9 April 2026; Germany has no make-available test | 1961 Act, Form 146, 10% |

## Results so far, and where it fails

- **Rules lane: 17 of 17.** Treat this as a regression check, not evidence. The same author wrote the rules and the expected answers. The real test is cases written by a practitioner (see `docs/YOUR-INPUT.md`).
- **Full pipeline (models + rules).** The headline number is **wrong and confident**: a wrong rate shown as Computed instead of being sent to the CA. Three live runs on 2 November 2026, raw output in `data/eval-history/`:

  | Run | Full pass | Wrong and confident | Agree / flag / abstain |
  |---|---|---|---|
  | 1, before the dispute rule | 11 / 14 | **1** (sg-monitoring-contested: nil rate shown as final) | 8 / 4 / 2 |
  | 2, after the dispute rule | 10 / 14 | **0** | 7 / 4 / 3 |
  | 3, the three new cases, first contact | 1 / 3 | **0** | 0 / 2 / 1 |
  | All 17, rescored from recordings after the fix run 3 found (what the site replays) | 12 / 17 | **0** | 7 / 6 / 4 |

  Every failure in run 2 went to the CA rather than producing a wrong rate:
  - **uk-research-no-ma.** The models split between "technical services, no make-available" and "business profits". Both give a nil rate, but the dispute rule escalates the split anyway. This is the cost named in decision 007. A narrower rule (escalate only if the readings give different tax) was tried and rescored on the recorded answers: it fixed this case but made sg-monitoring-contested wrong and confident, because all three models missed the knowledge sessions that make that case contested. The blunt rule stays.
  - **de-patent-old-act, sg-reimbursement, sg-design-no-pan.** These are quota failures, not judgement. The last cases ran after OpenRouter's free daily cap was hit and NVIDIA's models timed out, so only one vote per case had verified quotes. The fallback abstained instead of guessing.
  - The dispute rule was added after seeing run 1, on the same cases. Run 2 shows it fixes that case without making anything unsafe; it does not show the rule generalises.

  The three new cases, on first contact:
  - **adv-saas-copyright-grant: pass.** Both models read past the "SaaS" label to the reproduce-modify-sublicense grant and called it a royalty (10%).
  - **adv-invoice-prompt-injection: escalated.** Neither model obeyed the injected instruction or used the fake quote; both said technical services that make know-how available. It abstained because one model's treaty quote was not found and the third seat was down (OpenRouter's daily cap again). Even an obeyed injection could not have produced nil here: with no TRC, "business profits" goes to the CA.
  - **adv-transition-straddle-april-2026: escalated, then fixed.** Act and form were right (1961 Act for TDS, Form 146 for the remittance). But one model said make-available was "not applicable" and the other "no", and the engine escalated a dispute that cannot matter under the Germany treaty. The engine now returns the shared result when both readings agree (decision 007). That fix was made after seeing this case, so the 12 / 17 includes one in-sample fix.
- **Known limits, honestly:**
  - Two rules are still *not verified*: no surcharge on treaty rates (a practitioner position, not a statute) and the no-PAN carve-out under the 2025 Act. Every result that uses them says so. The 2025 Act rate and the surcharge slabs were checked on 2 November 2026 against the Finance Bill 2026 as introduced; the enacted Finance Act should be compared.
  - The Rs 5 lakh test and the surcharge slabs are applied per payment; the law applies them to the year's aggregate paid or likely to be paid.
  - Form 146 is not needed when the remitter has an AO certificate (Form 145 Part B). The engine says so in the trace but does not model that route.
  - All three models can share one misconception. The vote does not catch correlated error.

## Layout

```
app/                 pages: workbench, review log, Form 146 draft, evaluation, rules, treaties, design notes
app/api/classify     server route: keys stay on the server
lib/engine.ts        deterministic rules engine (+ engine.test.ts)
lib/llm.ts           three providers, vote, prompt
lib/citations.ts     verbatim quote check
lib/audit.ts         hash-chained review log (browser)
data/                rules.json, treaties.json, cases.json, recordings.json, eval-results.json
docs/                decision records, threat model, jurisdiction delta, YOUR-INPUT.md
scripts/             eval.ts, fetch_treaties.py
```

Not built: PDF upload (paste text instead), authentication, a shared database, PE analysis beyond a flag, treaties beyond the five.
