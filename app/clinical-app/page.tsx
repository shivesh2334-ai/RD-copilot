import Link from "next/link";
import { agentModules } from "@/lib/consultAgent";

export default function ClinicalAppPage({
  searchParams,
}: {
  searchParams: { module?: string | string[] };
}) {
  const app = agentModules.find(module => module.id === searchParams.module);
  if (!app) {
    return (
      <section className="card p-4 space-y-2">
        <h1 className="font-serif text-xl">Clinical application unavailable</h1>
        <Link href="/" className="text-sm text-teal-700 underline">Return to Mediround</Link>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-xl font-semibold">{app.label}</h1>
        <a href={app.href} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
          Open app in a new tab ↗
        </a>
      </div>
      <p className="text-xs text-paper-ink/60">
        If the app is blank or blocked, open it in a new tab and keep this Mediround tab open for the voice agent.
      </p>
      <iframe
        key={app.id}
        src={app.href}
        title={app.label}
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups"
        allow="microphone 'none'; camera 'none'; geolocation 'none'"
        className="w-full h-[75dvh] min-h-[28rem] rounded-lg border border-paper-dim bg-white"
      />
    </section>
  );
}
