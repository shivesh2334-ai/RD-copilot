"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ensureStorageSession } from "@/lib/supabase";
import type { Consult, Patient, PatientStatus } from "@/lib/types";

function formatDate(d?: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consults, setConsults] = useState<Consult[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PatientStatus>("all");
  const [selectedVisits, setSelectedVisits] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const db = await ensureStorageSession();
      const [patientResult, consultResult] = await Promise.all([
        db.from("patients").select("*").order("created_at", { ascending: false }),
        db.from("consults").select("*").order("created_at", { ascending: false }),
      ]);
      if (patientResult.error) throw patientResult.error;
      if (consultResult.error) throw consultResult.error;
      setPatients(patientResult.data ?? []);
      setConsults(consultResult.data ?? []);
      setStorageError(null);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Storage connection failed.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.mobile?.includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.ward?.toLowerCase().includes(q)
      );
    });
  }, [patients, query, statusFilter]);

  const toggleVisit = (id: string) => {
    setSelectedVisits((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const patientById = useMemo(() => new Map(patients.map((patient) => [patient.id, patient])), [patients]);
  const visitsByPatient = useMemo(() => {
    const grouped = new Map<string, Consult[]>();
    consults.forEach((consult) => grouped.set(consult.patient_id, [...(grouped.get(consult.patient_id) || []), consult]));
    return grouped;
  }, [consults]);
  const selectedConsults = consults.filter((consult) => selectedVisits.has(consult.id));

  const summaryText = (list: Consult[]) =>
    list.map((consult) => {
      const patient = patientById.get(consult.patient_id);
      return [
        `${patient?.name || "Patient"} — ${patient?.age ?? "—"}y ${patient?.sex || ""}`,
        `Seen: ${formatDate(consult.created_at)}${patient?.ward ? ` · Ward: ${patient.ward}` : ""}`,
        patient?.mobile ? `Mobile: ${patient.mobile}` : "",
        patient?.email ? `Email: ${patient.email}` : "",
        `Notes: ${consult.notes || "—"}`,
        `Treatment: ${consult.plan_treatment || "—"}`,
        `Investigations: ${consult.plan_investigation || "—"}`,
        `Comments: ${consult.plan_comments || "—"}`,
        consult.ai_summary ? `AI summary: ${consult.ai_summary}` : "",
      ].filter(Boolean).join("\n");
    }).join("\n\n--------------------\n\n");

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Visit snippets (${selectedConsults.length}):\n\n${summaryText(selectedConsults)}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`Patient visit snippets — ${selectedConsults.length} selected`);
    const body = encodeURIComponent(summaryText(selectedConsults));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const toggleStatus = async (p: Patient) => {
    setBusyId(p.id);
    const nextStatus: PatientStatus = p.status === "discharged" ? "admitted" : "discharged";
    const db = await ensureStorageSession();
    const { error } = await db.from("patients").update({ status: nextStatus }).eq("id", p.id);
    if (!error) {
      setPatients((prev) => prev.map((row) => (row.id === p.id ? { ...row, status: nextStatus } : row)));
    }
    setBusyId(null);
  };

  const removePatient = async (p: Patient) => {
    const confirmed = window.confirm(
      `Remove ${p.name} from the list? This also removes their consult notes and can't be undone.`
    );
    if (!confirmed) return;
    setBusyId(p.id);
    const db = await ensureStorageSession();
    const { error } = await db.from("patients").delete().eq("id", p.id);
    if (!error) {
      setPatients((prev) => prev.filter((row) => row.id !== p.id));
      setSelectedVisits((prev) => {
        const next = new Set(prev);
        consults.filter((consult) => consult.patient_id === p.id).forEach((consult) => next.delete(consult.id));
        return next;
      });
    } else {
      window.alert(`Couldn't remove ${p.name}: ${error.message}`);
    }
    setBusyId(null);
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

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input max-w-sm"
          placeholder="Search by name, mobile, email, or ward"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex items-center gap-1 text-xs font-mono">
          {(["all", "admitted", "discharged"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full border capitalize ${
                statusFilter === s
                  ? "bg-teal-600 text-white border-teal-600"
                  : "border-paper-dim text-paper-ink/60 hover:bg-teal-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-paper-ink/50">Loading patients…</p>}
      {storageError && <p className="text-sm text-terracotta-600">Storage unavailable: {storageError}</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-sm text-paper-ink/50">No patients match here yet.</p>
      )}

      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/consult/${p.id}`} className="font-medium hover:text-teal-700">
                  {p.name}
                </Link>
                <span
                  className={`text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    p.status === "discharged"
                      ? "bg-paper-dim text-paper-ink/50"
                      : "bg-teal-100 text-teal-700"
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <div className="text-xs text-paper-ink/50 font-mono mt-0.5">
                {p.age}y · {p.sex}
                {p.mobile ? ` · ${p.mobile}` : ""}
                {p.email ? ` · ${p.email}` : ""}
              </div>
              <div className="text-xs text-paper-ink/50 font-mono mt-0.5">
                Ward: {p.ward || "—"} · Admitted: {formatDate(p.admission_date)}
              </div>
              {p.notes && <div className="text-xs text-paper-ink/70 mt-1">{p.notes}</div>}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Link href={`/consult/${p.id}`} className="btn-secondary text-xs">
                Open consult
              </Link>
              <button
                onClick={() => toggleStatus(p)}
                disabled={busyId === p.id}
                className="text-xs text-teal-700 hover:underline disabled:opacity-40"
              >
                {p.status === "discharged" ? "Mark admitted" : "Mark discharged"}
              </button>
              <button
                onClick={() => removePatient(p)}
                disabled={busyId === p.id}
                className="text-xs text-terracotta-600 hover:underline disabled:opacity-40"
              >
                Remove
              </button>
            </div>
            </div>
            <div className="mt-3 pt-3 border-t border-paper-dim">
              <div className="label mb-2">Seen date-wise</div>
              {(visitsByPatient.get(p.id) || []).length === 0 ? (
                <p className="text-xs text-paper-ink/45">No consultation snippets saved yet.</p>
              ) : (
                <div className="space-y-2">
                  {(visitsByPatient.get(p.id) || []).map((visit) => (
                    <label key={visit.id} className="flex items-start gap-2 rounded-md bg-teal-50/60 border border-teal-100 p-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedVisits.has(visit.id)}
                        onChange={() => toggleVisit(visit.id)}
                        className="h-4 w-4 accent-teal-600 mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-mono font-medium text-teal-800">{formatDate(visit.created_at)}</span>
                        <span className="block text-sm text-paper-ink/75 mt-0.5 line-clamp-2">
                          {visit.notes || visit.plan_treatment || visit.plan_investigation || "Consultation saved"}
                        </span>
                        {(visit.plan_treatment || visit.plan_investigation) && (
                          <span className="block text-xs text-paper-ink/50 mt-1 line-clamp-1">
                            {[visit.plan_treatment && `Rx: ${visit.plan_treatment}`, visit.plan_investigation && `Tests: ${visit.plan_investigation}`].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedVisits.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 card px-4 py-3 flex flex-wrap items-center justify-center gap-3 shadow-lg w-max max-w-[calc(100vw-2rem)]">
          <span className="text-sm font-medium whitespace-nowrap">{selectedVisits.size} visit{selectedVisits.size === 1 ? "" : "s"} selected</span>
          <button onClick={shareWhatsApp} className="btn-primary text-sm">
            Share via WhatsApp
          </button>
          <button onClick={shareEmail} className="btn-secondary text-sm">
            Share via email
          </button>
          <button onClick={() => setSelectedVisits(new Set())} className="text-xs text-paper-ink/50 hover:underline">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
