# Your input: the parts only you can do
The brief asks for "the thinking the AI didn't do for you". Tresata will read the LLM logs, including the chat that produced this prototype. Everything here must come from you, in your own words. Fill it in, then use it for the appendix.

## 1. Talk to one practitioner (20 minutes)
Find one chartered accountant who certifies foreign remittances. Ask, and write the answers down:
- How many 15CB/146 certificates do you sign in a month? How long does one take, start to finish?
- Which part takes longest: reading the contract, the treaty, chasing TRC/10F, or the portal?
- Tell me about the last one you got wrong, or nearly got wrong. What caught it?
- What changed for you on 1 April 2026? Have you seen 15CB wording copied into a 146?
- Credit in March, payment in April 2026: how do you handle it in practice? (The official FAQ answers the law, see decision 008; ask what firms actually do, and which treaty form they ask for.)
- Would you sign a certificate a tool drafted? What would you need to see first?
- Do you add surcharge and cess on a treaty rate? (Rule treaty_rate_is_final is unverified.)

Answers (interview done; full record in the submission's answers document):
- 25-40 Form 15CB/146 certificates a month. Repeat vendor 30-45 minutes; new bespoke contract 2-4 hours active; 2-5 days elapsed when documents are missing.
- Active time: reading the contract and SOW. Elapsed time: chasing TRC, Form 41, beneficial-owner and no-PE declarations.
- Near miss: a UK "Annual Platform Subscription" whose SOW included custom API architecture and training on proprietary code; the SOW, not the invoice label, raised the make-available question.
- Would not sign a drafted certificate blindly: needs clause-level evidence, the exact article and notification, TRC/Form 41, beneficial ownership and PE position, and a reproducible calculation.
- Treaty rate applied as the ceiling, without surcharge and cess; surcharge and cess only on the Act rate.

## 2. Verify three rules yourself
Open data/rules.json. Pick three treaty rates, open the source URL, find the quoted words, and confirm the rate. Then close one unverified rule (for example the surcharge slabs) from a primary source and set verified to true.
Which rules, and what you found:
- Status: the submission pack's rule check was merged on 2 November 2026. The surcharge slabs and the 2025 Act rate are now verified against the Finance Bill 2026 (quotes in rules.json). The three treaty rates matched what was already there. To make this yours, open the sources and find the quoted words yourself.

## 3. Write three cases designed to break it
Add three cases to data/cases.json with authoredBy set to "you". Aim them at the weak points in threat-model.md: an injection line in an invoice, a SaaS contract that does grant copy rights, a payment-versus-credit date across 1 April 2026. Run npm run eval and record what happened.
- Done from your submission pack: adv-invoice-prompt-injection, adv-saas-copyright-grant, adv-transition-straddle-april-2026. Results are in the README and data/eval-history/. Be ready to explain each one: the logs show they arrived as a pack.

## 4. Appendix, in your words
Written: the one-page appendix in docs/Form146_Copilot_Brief.pdf.
- Where AI helped (with two or three of your actual prompts):
- What you rejected or corrected, and how you knew:
- What came from you:
- One thing you would defend live with no tools:

## Things that went wrong while building (raw material, not your appendix)
These happened in the build chat and are in your logs. Check each one yourself before you cite it, and say in your own words what you would have done differently.

1. **An AI assumption corrected by a primary source.** The plan assumed the India-Netherlands treaty had no "make available" test, which would make it a trap case. The CBDT text shows Article 12(5) already includes it, inserted by Notification SO 693(E) of 30 August 1999 under the MFN protocol. The Netherlands case became equipment hire instead, because the Dutch royalty definition does not include equipment.
2. **A test that was wrong, not the code.** The first engine test expected 21.216% for a Rs 20 lakh payment with no TRC. The engine said 20.8%, which is right: surcharge starts above Rs 1 crore. The test was fixed, and a second case above Rs 1 crore was added.
3. **The first live run abstained on all 14 cases**, and none of it was the models' judgement. NVIDIA NIM had retired Llama 3.3 (HTTP 410), OpenRouter's free Gemma was rate-limited upstream (429), and Groq's free tier allows about two of these calls a minute. Free-tier models change without notice; that is why the fallback chain exists (decision 003).
4. **A safety rule that was too strict.** "One unfound quote voids the vote" threw away correct answers for slips: a non-breaking hyphen, an ellipsis joining two real passages, "that" instead of "which". The rule was revised to require at least one verified document quote and one verified treaty quote, with any unfound quote shown in red (decision 004). Is that the right trade? You decide.
5. **Reasoning models returned nothing.** GLM, Nemotron and dots spent the whole 1,200-token budget thinking and wrote no JSON. Fixed with per-model token budgets.
6. **The eval found a real "wrong and confident" case**, and it was a design gap, not a model error. On sg-monitoring-contested the models split 2-1 between "business profits" and "technical services, contested". The majority produced a nil rate shown as Computed. A new rule now treats that split as a make-available dispute (decision 007). The first run is kept in data/eval-history/ so the before and after are both visible.
7. **A process bug in the build tooling.** Stopping an eval on Windows killed the shell but not the Node process under it. It kept running old code and overwrote the recorded answers, so the run had to be repeated. Lesson: check what is actually running before trusting a results file.
8. **Free-tier quota ran out mid-run.** In run 2 OpenRouter's free cap of 50 requests a day was used up and NVIDIA's models timed out, so the last three cases abstained. Safe, but the score dropped for reasons that have nothing to do with judgement.
9. **An outage looked like a vote.** The workbench showed a raw HTTP 429 JSON blob and listed the failed model as standing in for itself. Now it says "No model answered" with a short reason, and keeps the raw error behind a toggle.

Question worth answering yourself: the vote reduces random error, but what would catch all three models sharing the same wrong idea?
