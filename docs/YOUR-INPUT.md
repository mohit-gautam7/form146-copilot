# Your input: the parts only you can do
The brief asks for "the thinking the AI didn't do for you". Tresata will read the LLM logs, including the chat that produced this prototype. Everything here must come from you, in your own words. Fill it in, then use it for the appendix.

## 1. Talk to one practitioner (20 minutes)
Find one chartered accountant who certifies foreign remittances. Ask, and write the answers down:
- How many 15CB/146 certificates do you sign in a month? How long does one take, start to finish?
- Which part takes longest: reading the contract, the treaty, chasing TRC/10F, or the portal?
- Tell me about the last one you got wrong, or nearly got wrong. What caught it?
- What changed for you on 1 April 2026? Have you seen 15CB wording copied into a 146?
- Is the trigger date the date of payment or credit, whichever is earlier? (See decision 008.)
- Would you sign a certificate a tool drafted? What would you need to see first?
- Do you add surcharge and cess on a treaty rate? (Rule treaty_rate_is_final is unverified.)

Answers:
- ...

## 2. Verify three rules yourself
Open data/rules.json. Pick three treaty rates, open the source URL, find the quoted words, and confirm the rate. Then close one unverified rule (for example the surcharge slabs) from a primary source and set verified to true.
Which rules, and what you found:
- ...

## 3. Write three cases designed to break it
Add three cases to data/cases.json with authoredBy set to "you". Aim them at the weak points in threat-model.md: an injection line in an invoice, a SaaS contract that does grant copy rights, a payment-versus-credit date across 1 April 2026. Run npm run eval and record what happened.
- ...

## 4. Appendix, in your words
- Where AI helped (with two or three of your actual prompts):
- What you rejected or corrected, and how you knew:
- What came from you:
- One thing you would defend live with no tools:

A correction already found while building, which you can check and use: the plan assumed the India-Netherlands treaty had no "make available" test, which would make it a trap case. The CBDT text shows Article 12(5) already includes it, inserted by Notification SO 693(E) of 30 August 1999 under the MFN protocol. The Netherlands case was changed to equipment hire, because the Dutch royalty definition does not include equipment. Verify this yourself before you cite it.
