"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Compass, FileText, Gauge, ListChecks, Scale } from "lucide-react";

const NAV = [
  { href: "/workbench", label: "Workbench", icon: FileText },
  { href: "/review", label: "Review log", icon: ListChecks },
  { href: "/eval", label: "Evaluation", icon: Gauge },
  { href: "/rules", label: "Rules", icon: Scale },
  { href: "/treaties", label: "Treaties", icon: BookOpen },
  { href: "/design", label: "Design notes", icon: Compass },
];

function Seal() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
      <circle cx="16" cy="16" r="14" fill="none" stroke="var(--ca)" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="var(--ca)" strokeWidth="1" />
      <text x="16" y="20" textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--ca)">146</text>
    </svg>
  );
}

export default function Nav() {
  const path = usePathname();
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-sheet/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2" aria-label="Form 146 Copilot home">
          <Seal />
          <span className="text-[17px] font-extrabold tracking-tight">Form 146 Copilot</span>
        </Link>
        <nav aria-label="Main" className="-mx-1 flex w-full gap-1 overflow-x-auto px-1 pb-0.5 text-sm sm:w-auto sm:flex-wrap sm:overflow-visible">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href !== "/" && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${active ? "bg-ink text-paper" : "text-muted hover:bg-paper hover:text-ink"}`}
              >
                <Icon size={15} strokeWidth={2} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
