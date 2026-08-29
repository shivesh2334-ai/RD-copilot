"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ensureStorageSession } from "@/lib/supabase";
import type { Patient } from "@/lib/types";

export default function Home() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const db = await ensureStorageSession();
        const { data, error } = await db.from("patients").select("*").order("created_at", { ascending: false }).limit(6);
        if (error) throw error;
        setPatients(data ?? []);
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : "Storage connection failed.");
      }
    })();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <span className="eyebrow">rounds</span>
        <h1 className="text-3xl font-semibold mt-1">Good rounds start with a clear list.</h1>
        <p className="text-paper-ink/60 mt-2 max-w-xl">
          Register patients in bulk, open a consult, dictate your notes, and let AI draft a first
          pass you can accept, edit, or reject — every judgement you make on that output feeds back
          into making it better.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/register" className="card p-5 hover:border-teal-300 transition-colors">
          <div className="text-2xl mb-2">📝</div>
          <div className="font-medium">Register patients</div>
          <div className="text-xs text-paper-ink/50 mt-1">Add a whole round at once</div>
        </Link>
        <Link href="/patients" className="card p-5 hover:border-teal-300 transition-colors">
          <div className="text-2xl mb-2">🗂️</div>
          <div className="font-medium">Open a consult</div>
          <div className="text-xs text-paper-ink/50 mt-1">Pick from registered patients</div>
        </Link>
        <Link href="/ask-ai" className="card p-5 hover:border-teal-300 transition-colors">
          <div className="text-2xl mb-2">💬</div>
          <div className="font-medium">Ask AI</div>
          <div className="text-xs text-paper-ink/50 mt-1">Any clinical query, answered</div>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recently registered</h2>
          <Link href="/patients" className="text-sm text-teal-700 hover:underline">View all</Link>
        </div>
        {storageError && <p className="text-sm text-terracotta-600">Storage unavailable: {storageError}</p>}
        {!storageError && patients.length === 0 && <p className="text-sm text-paper-ink/50">No patients registered yet.</p>}
        <div className="space-y-2">
          {patients.map((p) => (
            <Link key={p.id} href={`/consult/${p.id}`} className="card p-3 flex items-center justify-between hover:border-teal-300 transition-colors">
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-paper-ink/50 font-mono">{p.age}y · {p.sex}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
