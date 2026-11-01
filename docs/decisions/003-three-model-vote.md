# 003 Three different model families vote
**Context.** A single model's confidence score is not calibrated, and asking it to check itself mostly confirms its first answer.
**Options.** One model plus self-critique; one model sampled three times; three model families.
**Decision.** Groq (gpt-oss-120b), NVIDIA NIM (Llama 3.3 70B) and OpenRouter (Gemma), run in parallel. Unanimous means "agree", two of three means "majority only" (the CA is shown the dissent), anything less means abstain.
**Why.** Disagreement between independently trained models is a cheap, honest uncertainty signal. It costs three free-tier calls, and the latency is the slowest model's, not the sum.
**Known limit.** Correlated error: all three may share the same misconception (see threat model). The vote reduces random error, not shared bias.
**Would change if** a labelled set of a few hundred real CA decisions existed. Then a single model calibrated on that set may beat the vote.
