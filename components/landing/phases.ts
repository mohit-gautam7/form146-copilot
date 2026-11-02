// Shared by the 3D scene and its captions; kept apart so the captions do not pull in three.js.
export const PHASES = [
  { at: 0, lane: "ai", text: "Three models read the contract, invoice and treaty" },
  { at: 0.3, lane: "ai", text: "They agree: fees for technical services. Every quote checked." },
  { at: 0.45, lane: "rules", text: "Rules engine: 15% under India-UK Art. 13(2)(a)(ii)" },
  { at: 0.6, lane: "ca", text: "The CA reviews, signs, and the log seals it" },
] as const;
export const HERO_PERIOD = 10; // seconds per loop
