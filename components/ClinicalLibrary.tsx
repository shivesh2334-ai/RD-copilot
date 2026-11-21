"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clinicalLibrary } from "@/lib/clinicalLibrary";
import { clinicalAppPath } from "@/lib/consultAgent";

const storageKey = "mediround:favourite-apps";
const appLabels = new Set(clinicalLibrary.flatMap(section => section.items.map(item => item.label)));

function readFavourites(value: string | null): string[] {
  try {
    const labels: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(labels)
      ? [...new Set(labels.filter((label): label is string => typeof label === "string" && appLabels.has(label)))]
      : [];
  } catch {
    return [];
  }
}

export default function ClinicalLibrary() {
  const [favourites, setFavourites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    try {
      setFavourites(readFavourites(window.localStorage.getItem(storageKey)));
    } catch {
      setStorageError(true);
    }
    setReady(true);

    function syncFavourites(event: StorageEvent) {
      if (event.storageArea === window.localStorage && (event.key === storageKey || event.key === null)) {
        setFavourites(readFavourites(event.newValue));
      }
    }
    window.addEventListener("storage", syncFavourites);
    return () => window.removeEventListener("storage", syncFavourites);
  }, []);

  function toggleFavourite(label: string) {
    try {
      const current = readFavourites(window.localStorage.getItem(storageKey));
      const next = current.includes(label) ? current.filter(item => item !== label) : [...current, label];
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setFavourites(next);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  const sections = [
    { heading: "My favourite ❤️", labels: favourites, empty: "Tap the heart beside any app to save it here." },
    ...clinicalLibrary.map(section => ({ heading: section.heading, labels: section.items.map(item => item.label), empty: "" })),
  ];

  return (
    <div className="space-y-2">
      {storageError && <p role="status" className="text-xs text-terracotta-600">This browser could not save your favourites.</p>}
      {sections.map(section => (
        <details key={section.heading} className="group rounded-lg border border-paper-dim bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-3 font-serif font-semibold text-sm text-teal-800 hover:bg-teal-50">
            <span>{section.heading}</span>
            <span className="text-paper-ink/40 transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
          </summary>
          {section.labels.length ? (
            <ul className="space-y-1 border-t border-paper-dim px-2 py-2">
              {section.labels.map(label => {
                const saved = favourites.includes(label);
                return (
                  <li key={label} className="flex items-center gap-1">
                    <Link
                      href={clinicalAppPath(label)}
                      prefetch={false}
                      className="min-w-0 flex-1 rounded-md px-2.5 py-2 text-sm leading-snug text-paper-ink/75 hover:text-teal-800 hover:bg-teal-50 transition-colors"
                    >
                      {label}
                    </Link>
                    <button
                      type="button"
                      aria-label={`Favourite ${label}`}
                      aria-pressed={saved}
                      title={saved ? "Remove from favourites" : "Save to favourites"}
                      disabled={!ready}
                      onClick={() => toggleFavourite(label)}
                      className={`h-11 w-11 shrink-0 rounded-md text-xl hover:bg-teal-50 ${saved ? "text-rose-600" : "text-teal-700"}`}
                    >
                      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="border-t border-paper-dim px-3 py-3 text-xs text-paper-ink/60">{section.empty}</p>
          )}
        </details>
      ))}
    </div>
  );
}
