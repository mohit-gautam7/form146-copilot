# 001 Three lanes instead of one LLM call
**Context.** A Form 146 answer has two kinds of part. "What is this payment?" is judgement over messy text. "What rate follows?" is arithmetic over published law. A wrong rate signed by a CA is a liability for the CA.
**Options.** (a) One prompt that returns the rate. (b) Rules only, with a form the user fills in. (c) Model characterises, code computes, CA decides.
**Decision.** (c). The model never outputs a number that reaches the certificate.
**Why.** (a) produces plausible rates that cannot be audited, and asking for a citation does not fix a made-up rate. (b) cannot read a contract, which is the expensive part of the CA's hour. Splitting at the characterisation boundary puts each kind of error where it can be checked.
**Would change if** treaty rates stopped being a lookup, for example rules that depend on facts only a reader can extract. Even then, the extraction would move to the AI lane and the arithmetic would stay in code.
