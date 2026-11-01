# 002 No vector search
**Context.** "Retrieval over source documents" usually means embeddings and a vector store.
**Decision.** No vector store. Retrieval is a lookup: the payee's country selects that treaty's royalty/FTS article and protocol, and the whole text goes into the prompt.
**Why.** The corpus is six clauses of 1,000 to 6,500 characters. Top-k retrieval can silently drop the paragraph that matters (for example the Article 12(5) exclusions), and the failure is invisible. A lookup cannot miss.
**Would change if** coverage grew to all 90-plus Indian treaties plus case law and circulars. Then: country lookup first, embeddings only over case law, and still never over the rate table.
