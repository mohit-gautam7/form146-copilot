# 005 Review log in the browser, hash-chained
**Context.** The CA's decision must be provable later: what the facts were, what the models said, what was signed, and that nobody edited it afterwards.
**Options.** Postgres (Supabase) with row-level security; a plain local list; a hash-chained local log with export.
**Decision.** Hash-chained log in localStorage with JSON export and import. Each entry stores the SHA-256 of the previous one, and verification recomputes the chain.
**Why.** A public demo should hold no shared data. The property an auditor needs is tamper evidence, not a server, and an exported file can be verified offline by anyone.
**Would change if** several CAs share a queue or the firm needs retention guarantees. Then: Postgres with append-only permissions, keeping the same hash chain.
