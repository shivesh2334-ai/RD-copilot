import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mediround — Resident Doctor Workspace",
  description: "Register patients, consult, and get AI-assisted notes on rounds.",
};

const clinicalLibrary = [
  {
    heading: "Internal medicine",
    items: [
      { label: "Antibiotics guide", href: "https://antibiotics-guid-clay.vercel.app/" },
      { label: "Sepsis", href: "https://sepsis-eight.vercel.app/" },
      { label: "Sexually Transmitted Infections", href: "https://sti-clinical-workbench.vercel.app/" },
      { label: "Diabetes in admitted patients", href: "https://inpatient-diabetes-care.vercel.app/" },
      { label: "Hypertension in Emergency", href: "https://hypertension-er.vercel.app/" },
    ],
  },
  {
    heading: "Cardiology",
    items: [
      { label: "Acute coronary syndrome", href: "https://acs-copilot.vercel.app/" },
      { label: "Perioperative risk assessment", href: "https://periop-risk-assessment.vercel.app/" },
      { label: "Ventricular tachycardia origin", href: "https://va-origin-lab.vercel.app/" },
      { label: "Atrial fibrillation advisor", href: "https://af-advisor.vercel.app/" },
      { label: "Pacemaker and device care", href: "https://pacemaker-care.vercel.app/" },
      { label: "Lifestyle guide in CVD", href: "https://cardio-lifestyle-guide.vercel.app/" },
      { label: "Warfarin guide", href: "https://warfarin-guide.vercel.app/" },
    ],
  },
  {
    heading: "ICU",
    items: [
      { label: "Infusion Drug dose calculator", href: "https://icu-drugs-clu.vercel.app/" },
    ],
  },
  {
    heading: "iLearn",
    items: [
      { label: "ECG", href: "https://ecg-vercel-xwho.vercel.app/" },
      { label: "Strain echo", href: "https://strain-echo-master.vercel.app/" },
      { label: "Volume assessment", href: "https://volume-overload-guide-1.vercel.app/" },
    ],
  },
];

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
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
              <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
                <span className="flex shrink-0 flex-col justify-center leading-none">
                  <span className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-teal-700 whitespace-nowrap">Mediround</span>
                  <span className="mt-1 text-[8px] sm:text-[10px] uppercase tracking-[0.18em] text-paper-ink/50 whitespace-nowrap">by EMC</span>
                </span>
              </Link>
              <nav className="flex min-w-0 items-center justify-end gap-0 sm:gap-1 text-xs sm:text-sm font-medium">
                <Link href="/register" className="inline-flex px-2 lg:px-3 py-1.5 rounded-md hover:bg-teal-50 text-teal-700">Register</Link>
                <Link href="/patients" className="inline-flex px-2 lg:px-3 py-1.5 rounded-md hover:bg-teal-50 text-teal-700">Patients</Link>
                <Link href="/ask-ai" className="px-2 lg:px-3 py-1.5 rounded-md hover:bg-teal-50 text-teal-700 whitespace-nowrap">Ask AI</Link>
              </nav>
            </div>
          </header>

          <div className="flex-1 max-w-7xl w-full mx-auto md:flex">
            <aside className="md:w-72 md:shrink-0 md:border-r border-paper-dim bg-white/60">
              <div className="md:sticky md:top-[61px] md:max-h-[calc(100vh-61px)] md:overflow-y-auto px-4 py-5">
                <div className="mb-4">
                  <p className="eyebrow">Clinical library</p>
                  <p className="text-xs text-paper-ink/50 mt-1">Quick access to clinical tools and learning apps</p>
                </div>
                <div className="space-y-2">
                  {clinicalLibrary.map((section) => (
                    <details key={section.heading} className="group rounded-lg border border-paper-dim bg-white">
                      <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-3 font-serif font-semibold text-sm text-teal-800 hover:bg-teal-50">
                        <span>{section.heading}</span>
                        <span className="text-paper-ink/40 transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
                      </summary>
                      <ul className="space-y-1 border-t border-paper-dim px-2 py-2">
                        {section.items.map((item) => (
                          <li key={item.label}>
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-md px-2.5 py-2 text-sm leading-snug text-paper-ink/75 hover:text-teal-800 hover:bg-teal-50 transition-colors"
                            >
                              {item.label}
                              <span className="ml-1 text-[10px] text-paper-ink/30" aria-hidden="true">↗</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </div>
            </aside>

            <main className="flex-1 min-w-0 px-4 py-6 md:px-6">{children}</main>
          </div>

          <footer className="text-center text-xs text-paper-ink/40 font-mono py-4 border-t border-paper-dim">
            Mediround · by EMC · built for resident workflows · not a substitute for clinical judgement
          </footer>
        </div>
      </body>
    </html>
  );
}
