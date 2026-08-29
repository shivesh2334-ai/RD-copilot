"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ensureStorageSession } from "@/lib/supabase";
import MicButton from "@/components/MicButton";
import AiFeedback from "@/components/AiFeedback";
import type { Patient, Consult } from "@/lib/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function ConsultPage() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultId, setConsultId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [treatment, setTreatment] = useState("");
  const [investigation, setInvestigation] = useState("");
  const [comments, setComments] = useState("");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const db = await ensureStorageSession();
        const { data: p, error: patientError } = await db
          .from("patients")
          .select("*")
          .eq("id", patientId)
          .single();
        if (patientError) throw patientError;
        setPatient(p);

        const { data: c, error: consultError } = await db
          .from("consults")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (consultError) throw consultError;

        if (c) {
          setConsultId(c.id);
          setNotes(c.notes ?? "");
          setTreatment(c.plan_treatment ?? "");
          setInvestigation(c.plan_investigation ?? "");
          setComments(c.plan_comments ?? "");
          setAiSummary(c.ai_summary ?? null);
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Storage connection failed.");
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId]);

  const save = async () => {
    setSaveStatus("saving");
    const payload = {
      patient_id: patientId,
      notes,
      plan_treatment: treatment,
      plan_investigation: investigation,
      plan_comments: comments,
      ai_summary: aiSummary,
      updated_at: new Date().toISOString(),
    };

    const db = await ensureStorageSession();
    const { data, error } = consultId
      ? await db.from("consults").update(payload).eq("id", consultId).select("id").single()
      : await db.from("consults").insert(payload).select("id").single();

    if (error) {
      setSaveStatus("error");
      return;
    }
    if (data) setConsultId(data.id);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const analyzeWithAI = async () => {
    if (!notes.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/medgemma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          plan: { treatment, investigation, comments },
          patient: patient ? { age: patient.age, sex: patient.sex } : null,
        }),
      });
      const data = await res.json();
      setAiSummary(data.summary ?? "AI did not return a summary.");
    } catch {
      setAiSummary("AI analysis failed — check the MedGemma endpoint configuration.");
    } finally {
      setAnalyzing(false);
    }
  };

  const shareConsult = (channel: "whatsapp" | "email") => {
    const text = [
      `Consult — ${patient?.name} (${patient?.age}y, ${patient?.sex})`,
      "",
      "Notes:",
      notes,
      "",
      "Plan — Treatment:",
      treatment,
      "",
      "Plan — Investigation:",
      investigation,
      "",
      "Plan — Comments:",
      comments,
    ].join("\n");

    if (channel === "whatsapp") {
      window.open(`https://wa.me/${patient?.mobile ?? ""}?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      const subject = encodeURIComponent(`Consult note — ${patient?.name}`);
      window.location.href = `mailto:${patient?.email ?? ""}?subject=${subject}&body=${encodeURIComponent(
        text
      )}`;
    }
  };

  if (loading) return <p className="text-sm text-paper-ink/50">Loading consult…</p>;
  if (loadError) return <p className="text-sm text-terracotta-600">Storage unavailable: {loadError}</p>;
  if (!patient) return <p className="text-sm text-terracotta-600">Patient not found.</p>;

  return (
    <div className="space-y-6 pb-24">
      <div>
        <span className="eyebrow">consult</span>
        <h1 className="text-2xl font-semibold mt-1">{patient.name}</h1>
        <p className="text-sm text-paper-ink/50 font-mono">
          {patient.age}y · {patient.sex}
          {patient.mobile ? ` · ${patient.mobile}` : ""}
          {patient.email ? ` · ${patient.email}` : ""}
        </p>
      </div>

      <section className="card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="label">Notes</label>
          <MicButton onText={(t) => setNotes((prev) => (prev ? `${prev} ${t}` : t))} label="Dictate notes" />
        </div>
        <textarea
          className="input min-h-[120px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="History, examination findings, working diagnosis…"
        />
      </section>

      <section className="card p-4 space-y-4">
        <h2 className="font-serif text-lg">Plan</h2>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label">Treatment</label>
            <MicButton onText={(t) => setTreatment((prev) => (prev ? `${prev} ${t}` : t))} label="Dictate" />
          </div>
          <textarea
            className="input min-h-[70px]"
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label">Investigation</label>
            <MicButton
              onText={(t) => setInvestigation((prev) => (prev ? `${prev} ${t}` : t))}
              label="Dictate"
            />
          </div>
          <textarea
            className="input min-h-[70px]"
            value={investigation}
            onChange={(e) => setInvestigation(e.target.value)}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label">Comments</label>
            <MicButton onText={(t) => setComments((prev) => (prev ? `${prev} ${t}` : t))} label="Dictate" />
          </div>
          <textarea
            className="input min-h-[70px]"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg">AI analysis</h2>
          <button onClick={analyzeWithAI} disabled={analyzing || !notes.trim()} className="btn-terracotta text-sm">
            {analyzing ? "Analyzing…" : "Analyze with MedGemma"}
          </button>
        </div>
        {aiSummary && (
          <div className="space-y-3">
            <div className="bg-teal-50 border border-teal-100 rounded-md p-3 text-sm whitespace-pre-wrap">
              {aiSummary}
            </div>
            <AiFeedback
              source="consult_ai"
              prompt={notes}
              aiOutput={aiSummary}
              patientId={patient.id}
              consultId={consultId ?? undefined}
            />
          </div>
        )}
        {!aiSummary && (
          <p className="text-xs text-paper-ink/40">
            Add notes, then run AI analysis for a second opinion — always verify against your own
            clinical judgement.
          </p>
        )}
      </section>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 card px-4 py-3 flex items-center gap-3 shadow-lg">
        <button onClick={save} disabled={saveStatus === "saving"} className="btn-primary text-sm">
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Save"}
        </button>
        <button onClick={() => shareConsult("whatsapp")} className="btn-secondary text-sm">
          Share on WhatsApp
        </button>
        <button onClick={() => shareConsult("email")} className="btn-secondary text-sm">
          Share by email
        </button>
        {saveStatus === "error" && <span className="text-xs text-terracotta-600">Save failed</span>}
      </div>
    </div>
  );
}
