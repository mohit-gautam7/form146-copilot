import { classify, PROVIDERS } from "@/lib/llm.ts";
import { treatyText, type Article } from "@/lib/pipeline.ts";
import treaties from "@/data/treaties.json";
import rules from "@/data/rules.json";
import recordings from "@/data/recordings.json";
import cases from "@/data/cases.json";

export const maxDuration = 90;

const MAX_CHARS = 12_000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { country, contract, invoice, caseId } = body ?? {};
  const treaty = (rules.treaties as Record<string, { name: string }>)[country];
  if (!treaty || typeof contract !== "string" || typeof invoice !== "string")
    return Response.json({ error: "Send country (US, UK, SG, DE or NL), contract and invoice as text." }, { status: 400 });
  if (contract.length + invoice.length > MAX_CHARS)
    return Response.json({ error: `Documents are too long for the demo: keep contract and invoice under ${MAX_CHARS} characters together.` }, { status: 413 });

  // Replay only when the text is exactly the recorded sample, so an edited document is never answered from cache.
  const sample = (cases as { id: string; contract: string; invoice: string }[]).find((c) => c.id === caseId);
  const rec = (recordings as Record<string, any>)[caseId];
  const isRecordedSample = !!rec && sample?.contract === contract && sample?.invoice === invoice;

  // Live calls spend the deployer's quota, so a public deployment must opt in with ALLOW_LIVE=1.
  const canGoLive = process.env.ALLOW_LIVE === "1" && PROVIDERS.some((p) => process.env[p.keyEnv]);
  if (canGoLive) {
    const res = await classify({ country, contract, invoice, treatyText: treatyText(treaties.articles as Article[], country), treatyName: treaty.name });
    if (res.votes.some((v) => v.ok) || !isRecordedSample) return Response.json({ mode: "live", ...res });
  }
  if (isRecordedSample) return Response.json({ mode: "replay", ...rec });
  return Response.json({
    error: canGoLive
      ? "All three models failed. Check the provider keys and rate limits."
      : "Live models are off in this deployment. Pick one of the sample cases to see recorded model answers, or run locally with your own keys.",
  }, { status: 503 });
}
