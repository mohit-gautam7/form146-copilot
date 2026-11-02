"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Sparkles, Calculator, Stamp } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "../motion";
import { PHASES } from "./phases";

const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-3xl bg-paper" />,
});

const LANE = {
  ai: { icon: Sparkles, color: "var(--ai)", wash: "var(--ai-wash)", name: "AI lane" },
  rules: { icon: Calculator, color: "var(--rules)", wash: "var(--rules-wash)", name: "Rules lane" },
  ca: { icon: Stamp, color: "var(--ca)", wash: "var(--ca-wash)", name: "CA lane" },
} as const;

export default function Hero() {
  const reduce = useReducedMotion() ?? false;
  const [phase, setPhase] = useState(0);
  const p = PHASES[phase];
  const lane = LANE[p.lane];

  return (
    <section className="hero-bg bleed relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 pb-10 pt-10 lg:grid-cols-[1fr_1.05fr] lg:pt-16">
        <div className="relative z-10">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-sheet px-3 py-1 text-sm text-muted"
          >
            <img src="/flags/in.svg" alt="" className="h-3.5 w-5 rounded-[2px] object-cover" />
            Income-tax Act, 2025: Form 146 in force since 1 April 2026
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-5 text-[2.6rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-6xl"
          >
            Certify a payment abroad in minutes, not an afternoon.
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-5 max-w-xl text-lg leading-relaxed text-muted"
          >
            Three AI models read the contract and invoice and quote the treaty. Code applies the rate. A chartered accountant decides and signs,
            and every step stays on the record.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link href="/workbench" className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-semibold text-paper shadow-lg shadow-black/10 transition-transform hover:-translate-y-0.5">
              Open the workbench <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link href="#how" className="inline-flex items-center rounded-full border border-line bg-sheet px-6 py-3 font-semibold hover:border-ink">
              See how it decides
            </Link>
          </motion.div>
        </div>

        <div className="relative">
          <div className="aspect-[1/0.92] w-full">
            <HeroScene reduced={reduce} onPhase={setPhase} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-4" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="flex max-w-md items-center gap-3 rounded-2xl border border-line bg-sheet/90 px-4 py-2.5 shadow-xl shadow-black/10 backdrop-blur"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: lane.wash, color: lane.color }}>
                  <lane.icon size={16} aria-hidden />
                </span>
                <span className="text-sm">
                  <span className="block text-xs font-semibold" style={{ color: lane.color }}>{lane.name}, step {phase + 1} of {PHASES.length}</span>
                  {p.text}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
