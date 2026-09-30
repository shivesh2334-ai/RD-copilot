import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rounds — Resident Doctor Workspace",
  description: "Register patients, consult, and get AI-assisted notes on rounds.",
};

const clinicalLibrary = [
  {
    heading: "Internal medicine",
    items: [
      { label: "Antibiotics guide", href: "https://antibiotics-guid-clay.vercel.app/" },
      { label: "Sepsis", href: "https://vercel.com/shiveshs-projects-7ed9268d/sepsis/Htbaq3aHHkSfcbKZ1c3r1bU87sav" },
      { label: "Sexually Transmitted Infections", href: "https://vercel.com/shiveshs-projects-7ed9268d/sti-clinical-workbench/GvroUBo9ions47AoPttr7pwHPVmE" },
      { label: "Diabetes in admitted patients", href: "https://vercel.com/shiveshs-projects-7ed9268d/inpatient-diabetes-care/Ec16DADXKpuwrmKKnR8kbtuNy1U1" },
      { label: "Hypertension in Emergency", href: "https://vercel.com/shiveshs-projects-7ed9268d/hypertension-er/8cDjcGPKR1ZJ16i5cQNc6wHvSWC3" },
    ],
  },
  {
    heading: "Cardiology",
    items: [
      { label: "Acute coronary syndrome", href: "https://vercel.com/shiveshs-projects-7ed9268d/acs-copilot/6kqBNHdkLjLZh52vobgRcyPNJp9d" },
      { label: "Perioperative risk assessment", href: "https://vercel.com/shiveshs-projects-7ed9268d/periop-risk-assessment/BQJNiGZ4ft82v2ipydLS8UBFwRS3" },
      { label: "Ventricular tachycardia origin", href: "https://vercel.com/shiveshs-projects-7ed9268d/va-origin-lab/DewyafERHGLsPuhuqAoCW9WSP3iz" },
      { label: "Atrial fibrillation advisor", href: "https://vercel.com/shiveshs-projects-7ed9268d/af-advisor/3LZX9SACefxhsfMgPSFnhNJWvk56" },
      { label: "Pacemaker and device care", href: "https://pacemaker-care.vercel.app/" },
      { label: "Lifestyle guide in CVD", href: "https://vercel.com/shiveshs-projects-7ed9268d/cardio-lifestyle-guide/En46wEFqM7QkAavUcmzfvyAEKDxD" },
      { label: "Warfarin guide", href: "https://vercel.com/shiveshs-projects-7ed9268d/warfarin-guide/9KK9pxZKSGfkq5dMvPnfzBfoHzGU" },
    ],
  },
  {
    heading: "Intensive care",
    items: [
      { label: "Infusion Drug dose calculator", href: "https://vercel.com/shiveshs-projects-7ed9268d/icu-drugs-clu/6eMC4EMgPQ5UJrfXgKP5SQfqFisT" },
    ],
  },
  {
    heading: "iLearn",
    items: [
      { label: "ECG", href: "https://vercel.com/shiveshs-projects-7ed9268d/ecg-vercel-xwho/5H1UWNReZWGUjxfjzgSmNB6THdX9" },
      { label: "Strain echo", href: "https://vercel.com/shiveshs-projects-7ed9268d/strain-echo-master/DnJ2VNfuVyaKn2dauRcJ79QY2cVr" },
      { label: "Volume assessment", href: "https://vercel.com/shiveshs-projects-7ed9268d/volume-overload-guide-1/HQVRea6hFsTxpZqJvKZTS1tbvwen" },
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
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <Link href="/" className="flex items-baseline gap-2">
                <span className="font-serif text-xl font-semibold text-teal-700">Rounds</span>
                <span className="eyebrow hidden sm:inline">resident workspace</span>
              </Link>
              <nav className="flex items-center gap-1 text-sm font-medium">
                <Link href="/register" className="px-3 py-1.5 rounded-md hover:bg-teal-50 text-teal-700">Register</Link>
                <Link href="/patients" className="px-3 py-1.5 rounded-md hover:bg-teal-50 text-teal-700">Patients</Link>
                <Link href="/ask-ai" className="px-3 py-1.5 rounded-md hover:bg-teal-50 text-teal-700">Ask AI</Link>
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
                <div className="flex md:block gap-5 overflow-x-auto pb-2 md:pb-0">
                  {clinicalLibrary.map((section) => (
                    <section key={section.heading} className="min-w-56 md:min-w-0 mb-5">
                      <h2 className="font-serif font-semibold text-sm text-teal-800 mb-2">{section.heading}</h2>
                      <ul className="space-y-1">
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
                    </section>
                  ))}
                </div>
              </div>
            </aside>

            <main className="flex-1 min-w-0 px-4 py-6 md:px-6">{children}</main>
          </div>

          <footer className="text-center text-xs text-paper-ink/40 font-mono py-4 border-t border-paper-dim">
            Rounds · built for resident workflows · not a substitute for clinical judgement
          </footer>
        </div>
      </body>
    </html>
  );
}
