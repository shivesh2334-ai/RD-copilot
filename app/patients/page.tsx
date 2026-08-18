"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Patient } from "@/lib/types";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });
      setPatients(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) => p.name.toLowerCase().includes(q) || p.mobile?.includes(q) || p.email?.toLowerCase().includes(q)
    );
  }, [patients, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedPatients = patients.filter((p) => selected.has(p.id));

  const summaryText = (list: Patient[]) =>
    list
      .map(
        (p) =>
          `${p.name} — ${p.age}y ${p.sex}${p.mobile ? ` — ${p.mobile}` : ""}${
            p.email ? ` — ${p.email}` : ""
          }`
      )
      .join("\n");

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Patient list (${selectedPatients.length}):\n${summaryText(selectedPatients)}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`Patient list — ${selectedPatients.length} patients`);
    const body = encodeURIComponent(summaryText(selectedPatients));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="eyebrow">roster</span>
          <h1 className="text-2xl font-semibold mt-1">Your patients</h1>
        </div>
        <Link href="/register" className="btn-secondary text-sm">
          + Register more
        </Link>
      </div>

      <input
        className="input max-w-sm"
        placeholder="Search by name, mobile, or email"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p className="text-sm text-paper-ink/50">Loading patients…</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-sm text-paper-ink/50">No patients yet. Register your first one.</p>
      )}

      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="card p-3 flex items-center gap-3">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggle(p.id)}
              className="h-4 w-4 accent-teal-600"
            />
            <div className="flex-1">
              <Link href={`/consult/${p.id}`} className="font-medium hover:text-teal-700">
                {p.name}
              </Link>
              <div className="text-xs text-paper-ink/50 font-mono">
                {p.age}y · {p.sex}
                {p.mobile ? ` · ${p.mobile}` : ""}
                {p.email ? ` · ${p.email}` : ""}
              </div>
            </div>
            <Link href={`/consult/${p.id}`} className="btn-secondary text-xs">
              Open consult
            </Link>
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 card px-4 py-3 flex items-center gap-3 shadow-lg">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <button onClick={shareWhatsApp} className="btn-primary text-sm">
            Share via WhatsApp
          </button>
          <button onClick={shareEmail} className="btn-secondary text-sm">
            Share via email
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-paper-ink/50 hover:underline">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
