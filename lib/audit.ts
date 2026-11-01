// Append-only review log. Each entry carries the hash of the previous one, so editing or
// deleting any past decision breaks the chain and "Verify" says exactly where.
// ponytail: lives in this browser's localStorage; move to a database when several CAs share a queue.

export type Decision = "approved" | "overridden" | "sent_back";

export type Entry = {
  seq: number;
  at: string;
  caseId: string;
  title: string;
  decision: Decision;
  reviewer: string;
  udin: string;
  reason: string;
  input: unknown;      // the facts and the characterisation the engine ran on
  ai: unknown;         // model consensus at the time, or null if the CA characterised alone
  result: unknown;     // engine output that was signed
  prevHash: string;
  hash: string;
};

const KEY = "form146.audit.v1";
const GENESIS = "0".repeat(64);

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const body = (e: Omit<Entry, "hash">) => JSON.stringify(e);

export function load(): Entry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function save(entries: Entry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export async function append(e: Omit<Entry, "seq" | "at" | "prevHash" | "hash">): Promise<Entry> {
  const log = load();
  const prev = log.at(-1);
  const draft = { ...e, seq: log.length + 1, at: new Date().toISOString(), prevHash: prev?.hash ?? GENESIS };
  const entry = { ...draft, hash: await sha256(body(draft)) };
  save([...log, entry]);
  return entry;
}

export async function verify(entries: Entry[]): Promise<{ ok: boolean; brokenAt?: number; why?: string }> {
  let prev = GENESIS;
  for (const e of entries) {
    const { hash, ...rest } = e;
    if (e.prevHash !== prev) return { ok: false, brokenAt: e.seq, why: "previous-hash link does not match" };
    if ((await sha256(body(rest))) !== hash) return { ok: false, brokenAt: e.seq, why: "entry was edited after signing" };
    prev = hash;
  }
  return { ok: true };
}
