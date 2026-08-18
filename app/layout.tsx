import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rounds — Resident Doctor Workspace",
  description: "Register patients, consult, and get AI-assisted notes on rounds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-paper-dim bg-white/70 backdrop-blur sticky top-0 z-20">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
              <Link href="/" className="flex items-baseline gap-2">
                <span className="font-serif text-xl font-semibold text-teal-700">Rounds</span>
                <span className="eyebrow hidden sm:inline">resident workspace</span>
              </Link>
              <nav className="flex items-center gap-1 text-sm font-medium">
                <Link href="/register" className="px-3 py-1.5 rounded-md hover:bg-teal-50 text-teal-700">
                  Register
                </Link>
                <Link href="/patients" className="px-3 py-1.5 rounded-md hover:bg-teal-50 text-teal-700">
                  Patients
                </Link>
                <Link href="/ask-ai" className="px-3 py-1.5 rounded-md hover:bg-teal-50 text-teal-700">
                  Ask AI
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>
          <footer className="text-center text-xs text-paper-ink/40 font-mono py-4">
            Rounds · built for resident workflows · not a substitute for clinical judgement
          </footer>
        </div>
      </body>
    </html>
  );
}
