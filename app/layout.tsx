import type { Metadata } from "next";
import Link from "next/link";
import { Public_Sans, Newsreader } from "next/font/google";
import "./globals.css";

const ui = Public_Sans({ subsets: ["latin"], variable: "--font-ui" });
const source = Newsreader({ subsets: ["latin"], variable: "--font-source", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Form 146 Copilot",
  description: "Drafts the treaty characterisation and withholding rate for payments to non-residents under India's Income-tax Act, 2025. A chartered accountant decides and signs.",
};

const NAV = [
  ["/", "Workbench"],
  ["/review", "Review log"],
  ["/eval", "Evaluation"],
  ["/rules", "Rules"],
  ["/treaties", "Treaties"],
  ["/design", "Design notes"],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${ui.variable} ${source.variable} antialiased`}>
        <header className="no-print border-b border-line bg-sheet">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight">Form 146 Copilot</span>
              <span className="text-sm text-muted">payments to non-residents, India</span>
            </Link>
            <nav aria-label="Main" className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {NAV.map(([href, label]) => (
                <Link key={href} href={href} className="text-muted hover:text-ink">{label}</Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="no-print mx-auto max-w-7xl px-4 pb-8 text-xs text-muted">
          Prototype for a take-home assignment. All cases are synthetic. This drafts; it does not advise. The chartered accountant who signs Form 146 is accountable for it.
        </footer>
      </body>
    </html>
  );
}
