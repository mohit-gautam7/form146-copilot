import type { Metadata } from "next";
import { Public_Sans, Newsreader } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const ui = Public_Sans({ subsets: ["latin"], variable: "--font-ui" });
const source = Newsreader({ subsets: ["latin"], variable: "--font-source", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Form 146 Copilot",
  description: "Drafts the treaty characterisation and withholding rate for payments to non-residents under India's Income-tax Act, 2025. A chartered accountant decides and signs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${ui.variable} ${source.variable} antialiased`}>
        <Nav />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="no-print border-t border-line">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-4 py-8 text-xs text-muted">
            <p className="max-w-xl">
              Prototype for a take-home assignment. All cases are synthetic; treaty texts are from official sources. This drafts, it does not advise:
              the chartered accountant who signs Form 146 is accountable for it.
            </p>
            <p>
              Photos on Unsplash by{" "}
              <a className="underline" href="https://unsplash.com/photos/OQMZwNd3ThU">Scott Graham</a>,{" "}
              <a className="underline" href="https://unsplash.com/photos/vr6nMSlyTJs">Previn Samuel</a>,{" "}
              <a className="underline" href="https://unsplash.com/photos/sWOvgOOFk1g">Timelab</a> and{" "}
              <a className="underline" href="https://unsplash.com/photos/7PMGUqYQpYc">Markus Spiske</a>. Flags from flagcdn.com.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
