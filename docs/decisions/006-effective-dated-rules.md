# 006 Every rule carries its source, its dates and when it was last checked
**Context.** Law changed under everyone's feet on 1 April 2026: section 195 became 393(2), and 15CA/15CB became 145/146. Knowledge baked into a model or a prompt silently goes stale.
**Decision.** Numbers live in data/rules.json, each with a source URL, the exact words checked, effective dates, last_verified and a verified flag. The engine refuses if a rule is out of its dates or more than 365 days unchecked. Unverified rules run but are flagged on every result.
**Why.** Refusing is better than a confident stale answer. Separating "verified" from "in use" makes the backlog visible: four rules are honestly marked unverified today.
**Would change if** a primary-source feed of notifications existed. Then last_verified could be updated by a watcher, with a human approving each diff.
