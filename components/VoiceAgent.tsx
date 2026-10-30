"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ensureStorageSession } from "@/lib/supabase";
import { useVoiceDictation } from "@/lib/useVoiceDictation";
import { agentModules } from "@/lib/consultAgent";
import AiFeedback from "@/components/AiFeedback";
import ModuleSearch from "@/components/ModuleSearch";
import {
  CONSULT_UPDATED_EVENT,
  matchPatient,
  mergeIntoEmptyBoxes,
  missingRegistrationFields,
  type AnalysisResult,
  type ParsedDictation,
  type PatientLike,
} from "@/lib/voiceAgent";

type StepStatus = "done" | "skipped" | "warn";
interface Step { app: string; action: string; status: StepStatus }

interface Outcome {
  patient: PatientLike | null;
  consultId: string | null;
  analysis: AnalysisResult | null;
  medgemma: string | null;
  prompt: string;
}

const APP_VOICE = "Voice dictation (browser speech recognition)";
const APP_AGENT = "Voice agent (Claude)";
const APP_REGISTER = "Register";
const APP_PATIENTS = "Patients registry";
const APP_CONSULT = "Consult — notes & plan";
const APP_MEDGEMMA = "MedGemma second opinion";
const APP_WORKSPACE = "Consult workspace";

const todayISO = () => new Date().toISOString().slice(0, 10);

async function authedFetch(path: string, body: unknown) {
  const db = await ensureStorageSession();
  const { data } = await db.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Authentication unavailable.");
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Request failed.");
  return json;
}

export default function VoiceAgent() {
  const router = useRouter();
  const pathname = usePathname();
  const contextPatientId = pathname?.match(/^\/consult\/([^/]+)/)?.[1] ?? null;

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"agent" | "search">("agent");
  const [transcript, setTranscript] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [ask, setAsk] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PatientLike[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const onChunk = useCallback((t: string) => setTranscript((v) => (v ? `${v} ${t}` : t)), []);
  const { listening, supported, start, stop } = useVoiceDictation(onChunk);

  const reset = () => {
    if (listening) stop();
    setTranscript(""); setSteps([]); setAsk(null); setCandidates([]); setOutcome(null); setError(""); setSaved(false);
  };

  async function run(opts: { forcePatientId?: string; forceRegister?: boolean } = {}) {
    if (busy || !consent || !transcript.trim()) return;
    if (listening) stop();
    setBusy(true); setError(""); setAsk(null); setCandidates([]); setOutcome(null); setSaved(false);
    const log: Step[] = [];
    const add = (app: string, action: string, status: StepStatus = "done") => {
      log.push({ app, action, status });
      setSteps([...log]);
    };
    try {
      const db = await ensureStorageSession();
      add(APP_VOICE, "Dictation captured", "done");

      // 1. Parse the dictation into patient + clinical boxes.
      const { parsed } = (await authedFetch("/api/voice-agent", { action: "parse", transcript })) as { parsed: ParsedDictation };
      add(APP_AGENT, "Parsed dictation into registration and clinical fields");

      // 2. Resolve the patient: already registered → skip registration; otherwise register.
      let patient: PatientLike | null = null;
      const pick = async (id: string) => {
        const { data, error: e } = await db.from("patients").select("id,name,age,sex,mobile").eq("id", id).single();
        if (e) throw e;
        return data as PatientLike;
      };

      if (opts.forcePatientId) {
        patient = await pick(opts.forcePatientId);
        add(APP_PATIENTS, `Using ${patient.name} (already registered) — registration skipped`, "skipped");
      } else if (!parsed.patient.name && contextPatientId) {
        patient = await pick(contextPatientId);
        add(APP_PATIENTS, `Using the open consult for ${patient.name} — registration skipped`, "skipped");
      } else if (parsed.patient.name) {
        const { data: all, error: e } = await db.from("patients").select("id,name,age,sex,mobile");
        if (e) throw e;
        const match = opts.forceRegister ? { kind: "none" as const } : matchPatient((all ?? []) as PatientLike[], parsed.patient);
        if (match.kind === "exact") {
          patient = match.patient;
          add(APP_PATIENTS, `${patient.name} is already registered — registration skipped`, "skipped");
        } else if (match.kind === "candidates") {
          add(APP_PATIENTS, "Possible existing patient(s) found — waiting for your choice", "warn");
          setCandidates(match.patients);
          setAsk(`I found ${match.patients.length === 1 ? "a similar patient" : "similar patients"} already registered. Is this the same person?`);
          return;
        } else {
          const missing = missingRegistrationFields(parsed.patient);
          if (missing.length) {
            add(APP_REGISTER, `Cannot register yet — missing ${missing.join(", ")}`, "warn");
            setAsk(`To register this patient I still need: ${missing.join(", ")}. Dictate it and press Process again — your earlier dictation is kept.`);
            return;
          }
          const p = parsed.patient;
          const { data, error: e } = await db
            .from("patients")
            .insert({
              name: p.name, age: p.age, sex: p.sex, mobile: p.mobile, email: p.email, ward: p.ward,
              admission_date: p.admissionDate ?? todayISO(), status: "admitted", notes: p.notes,
            })
            .select("id,name,age,sex,mobile")
            .single();
          if (e) throw e;
          patient = data as PatientLike;
          add(APP_REGISTER, `Registered ${patient.name} (${patient.age}y, ${patient.sex})`);
        }
      } else if (parsed.intent === "patient_workflow") {
        add(APP_AGENT, "No patient identified in the dictation", "warn");
        setAsk("Which patient is this about? Say the name, age and sex, or open the patient's consult page first.");
        return;
      }

      // 3. Record clinical information into empty boxes only; recorded boxes are kept.
      let consultId: string | null = null;
      let notes = "", treatment = "", investigation = "", comments = "";
      if (patient) {
        const { data: existing, error: e } = await db
          .from("consults").select("*").eq("patient_id", patient.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (e) throw e;
        const { patch, filled, skipped } = mergeIntoEmptyBoxes(existing, parsed.clinical);
        const hasPatch = Object.keys(patch).length > 0;
        if (hasPatch) {
          if (existing) {
            const { error: ue } = await db.from("consults").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", existing.id);
            if (ue) throw ue;
            consultId = existing.id;
          } else {
            const { data: ins, error: ie } = await db
              .from("consults").insert({ patient_id: patient.id, notes: "", plan_treatment: "", plan_investigation: "", plan_comments: "", ...patch })
              .select("id").single();
            if (ie) throw ie;
            consultId = ins.id;
          }
          add(APP_CONSULT, `Recorded ${filled.join(", ")}`);
        } else {
          consultId = existing?.id ?? null;
        }
        if (skipped.length) add(APP_CONSULT, `${skipped.join(", ")} already recorded — kept as is, proceeding to analysis`, "skipped");
        if (!hasPatch && !skipped.length) {
          add(APP_CONSULT, existing ? "No new clinical information dictated — proceeding to analysis" : "No clinical information dictated yet", existing ? "skipped" : "warn");
        }
        const merged = { ...(existing ?? {}), ...patch } as Record<string, string>;
        notes = merged.notes ?? ""; treatment = merged.plan_treatment ?? ""; investigation = merged.plan_investigation ?? ""; comments = merged.plan_comments ?? "";
      } else {
        add(APP_PATIENTS, "General question — no patient involved", "skipped");
        notes = parsed.clinical.notes ?? "";
      }

      if (!notes.trim() && !parsed.request.trim()) {
        setAsk("No clinical information is recorded for this patient yet. Dictate the history, findings or your question and press Process again.");
        if (patient) {
          setOutcome({ patient, consultId, analysis: null, medgemma: null, prompt: "" });
          if (contextPatientId !== patient.id) router.push(`/consult/${patient.id}`);
          window.dispatchEvent(new CustomEvent(CONSULT_UPDATED_EVENT, { detail: { patientId: patient.id } }));
        }
        return;
      }

      // 4. Analysis (Claude voice agent + MedGemma when configured), de-identified: age and sex only.
      const demo = patient ? { age: patient.age, sex: patient.sex } : null;
      const [aRes, mRes] = await Promise.allSettled([
        authedFetch("/api/voice-agent", {
          action: "analyze", patient: demo, notes, plan: { treatment, investigation, comments }, request: parsed.request,
        }),
        patient && notes.trim()
          ? authedFetch("/api/medgemma", { notes, plan: { treatment, investigation, comments }, patient: demo })
          : Promise.reject(new Error("skip")),
      ]);
      if (aRes.status === "rejected") throw aRes.reason;
      const analysis = (aRes.value as { analysis: AnalysisResult }).analysis;
      add(APP_AGENT, "Analysed the recorded information and prepared an opinion");

      let medgemma: string | null = null;
      if (mRes.status === "fulfilled") {
        const s = String((mRes.value as { summary?: string }).summary ?? "");
        if (s && !/not configured|could not reach|returned an error/i.test(s)) {
          medgemma = s;
          add(APP_MEDGEMMA, "Second-opinion summary obtained");
        } else add(APP_MEDGEMMA, "Endpoint not available — skipped", "skipped");
      } else if (patient && notes.trim()) {
        add(APP_MEDGEMMA, "Endpoint not available — skipped", "skipped");
      }

      // 5. Navigate to the consult workspace and refresh it.
      if (patient) {
        if (contextPatientId !== patient.id) router.push(`/consult/${patient.id}`);
        window.dispatchEvent(new CustomEvent(CONSULT_UPDATED_EVENT, { detail: { patientId: patient.id } }));
        add(APP_WORKSPACE, `Opened consult for ${patient.name}`);
      }
      for (const label of analysis.moduleLabels) {
        add(`Clinical library: ${label}`, "Recommended as the next module (opens separately)", "skipped");
      }

      setOutcome({ patient, consultId, analysis, medgemma, prompt: parsed.request || notes });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The agent could not complete the request.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAnalysis() {
    if (!outcome?.analysis || !outcome.consultId) return;
    try {
      const db = await ensureStorageSession();
      const a = outcome.analysis;
      const block = `Voice agent — provisional, clinician review required\n${a.resultSummary}\n\n${a.finalAnalysis}\n\nOpinion: ${a.opinion}`;
      const { data } = await db.from("consults").select("ai_summary").eq("id", outcome.consultId).single();
      const combined = data?.ai_summary ? `${data.ai_summary}\n\n---\n${block}` : block;
      const { error: e } = await db.from("consults").update({ ai_summary: combined, updated_at: new Date().toISOString() }).eq("id", outcome.consultId);
      if (e) throw e;
      setSaved(true);
      if (outcome.patient) window.dispatchEvent(new CustomEvent(CONSULT_UPDATED_EVENT, { detail: { patientId: outcome.patient.id } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the analysis.");
    }
  }

  const appsUsed = useMemo(() => Array.from(new Set(steps.filter((s) => s.status === "done").map((s) => s.app))), [steps]);
  const modules = useMemo(
    () => (outcome?.analysis?.moduleLabels ?? []).map((l) => agentModules.find((m) => m.id === l)).filter(Boolean) as typeof agentModules,
    [outcome]
  );
  const icon = (s: StepStatus) => (s === "done" ? "✓" : s === "skipped" ? "↷" : "!");

  return (
    <div className="fixed bottom-20 right-3 sm:bottom-6 sm:right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <section
          aria-label="Voice agent"
          className="card shadow-xl w-[min(94vw,26rem)] max-h-[78vh] overflow-y-auto p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg">Voice agent</h2>
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={reset} disabled={busy} className="text-teal-700 hover:underline">New request</button>
              <button type="button" onClick={() => setOpen(false)} className="text-paper-ink/50 hover:underline">Close</button>
            </div>
          </div>
          <nav aria-label="Voice agent views" className="flex gap-2 border-b border-paper-dim pb-2">
            <button type="button" aria-pressed={activeTab === "agent"} className={activeTab === "agent" ? "btn-primary text-xs" : "btn-secondary text-xs"} onClick={() => setActiveTab("agent")}>Voice agent</button>
            <button type="button" aria-pressed={activeTab === "search"} className={activeTab === "search" ? "btn-primary text-xs" : "btn-secondary text-xs"} onClick={() => { if (listening) stop(); setActiveTab("search"); }}>Search</button>
          </nav>
          <div hidden={activeTab !== "search"}><ModuleSearch /></div>
          <div hidden={activeTab !== "agent"} className="space-y-3">
          <p className="text-xs text-paper-ink/60">
            Speak a patient and what you need — e.g. “Ramesh Kumar, 54, male, chest pain for two days, please analyse.” It registers
            the patient if new, records findings into empty boxes, analyses, and shows the apps it used.
          </p>

          <label className="flex gap-2 text-xs">
            <input type="checkbox" checked={consent} disabled={busy} onChange={(e) => setConsent(e.target.checked)} />
            I am authorized to send this dictation to the configured AI service. Analysis sends age, sex and clinical text only.
          </label>

          <div className="flex items-center gap-2">
            {supported ? (
              <button
                type="button"
                onClick={listening ? stop : start}
                disabled={busy}
                className={`inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border transition-colors ${
                  listening ? "bg-terracotta-500 text-white border-terracotta-500 animate-pulse" : "border-teal-300 text-teal-700 hover:bg-teal-50"
                }`}
              >
                <span>{listening ? "●" : "🎙"}</span>
                {listening ? "Listening… tap to stop" : "Record"}
              </button>
            ) : (
              <span className="text-xs text-paper-ink/40 font-mono">Voice input isn&apos;t supported here — type below</span>
            )}
          </div>

          <textarea
            className="input min-h-[90px]"
            value={transcript}
            disabled={busy}
            maxLength={12000}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Transcript appears here — correct anything before processing."
          />
          <button type="button" className="btn-primary text-sm w-full" disabled={busy || !consent || !transcript.trim()} onClick={() => run()}>
            {busy ? "Working…" : "Process request"}
          </button>

          {error && <p role="alert" className="text-sm text-terracotta-600">{error}</p>}

          {ask && (
            <div role="status" className="rounded-md border border-terracotta-300 bg-terracotta-100/40 p-3 text-sm space-y-2">
              <p>{ask}</p>
              {candidates.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                  <span>{c.name} · {c.age}y · {c.sex}{c.mobile ? ` · ${c.mobile}` : ""}</span>
                  <button type="button" className="btn-secondary text-xs px-2 py-1" disabled={busy} onClick={() => run({ forcePatientId: c.id })}>Use this patient</button>
                </div>
              ))}
              {!!candidates.length && (
                <button type="button" className="btn-secondary text-xs px-2 py-1" disabled={busy} onClick={() => run({ forceRegister: true })}>
                  Register as a new patient
                </button>
              )}
            </div>
          )}

          {!!steps.length && (
            <div className="space-y-1">
              <p className="label">Workflow</p>
              <ul className="text-xs space-y-1">
                {steps.map((s, i) => (
                  <li key={i} className={s.status === "warn" ? "text-terracotta-600" : s.status === "skipped" ? "text-paper-ink/55" : "text-paper-ink"}>
                    <span className="font-mono mr-1">{icon(s.status)}</span>
                    <strong>{s.app}:</strong> {s.action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {outcome?.analysis && (
            <div className={`rounded-md border p-3 space-y-2 text-sm ${outcome.analysis.urgency === "urgent" ? "bg-red-50 border-red-300" : "bg-teal-50 border-teal-100"}`}>
              {outcome.analysis.urgency === "urgent" && <p className="font-semibold">Urgent — assess and escalate now</p>}
              {outcome.patient && <p className="text-xs font-mono text-paper-ink/60">{outcome.patient.name} · {outcome.patient.age}y · {outcome.patient.sex}</p>}
              <div><p className="label">Result</p><p className="whitespace-pre-wrap">{outcome.analysis.resultSummary}</p></div>
              <div><p className="label">Final analysis</p><p className="whitespace-pre-wrap">{outcome.analysis.finalAnalysis}</p></div>
              <div><p className="label">Opinion (provisional)</p><p className="whitespace-pre-wrap">{outcome.analysis.opinion}</p></div>
              {!!outcome.analysis.nextSteps.length && (
                <div><p className="label">Next steps</p><ul className="list-disc pl-5">{outcome.analysis.nextSteps.map((n, i) => <li key={i}>{n}</li>)}</ul></div>
              )}
              {!!outcome.analysis.missingInputs.length && <p className="text-xs">Still needed: {outcome.analysis.missingInputs.join("; ")}</p>}
              {outcome.medgemma && (
                <div><p className="label">MedGemma second opinion</p><p className="whitespace-pre-wrap">{outcome.medgemma}</p></div>
              )}
              {!!modules.length && (
                <div className="flex flex-wrap gap-2">
                  {modules.map((m, i) => (
                    <a key={m.id} href={m.href} target="_blank" rel="noopener noreferrer" className={`${i === 0 ? "btn-primary" : "btn-secondary"} text-xs px-3 py-1.5`}>
                      Open {m.label} ↗
                    </a>
                  ))}
                </div>
              )}
              {outcome.consultId && (
                <button type="button" className="btn-secondary text-xs" disabled={saved} onClick={saveAnalysis}>
                  {saved ? "Saved to AI analysis ✓" : "Save analysis to consult"}
                </button>
              )}
              <AiFeedback
                source={outcome.patient ? "consult_ai" : "ask_ai"}
                prompt={outcome.prompt || "voice agent request"}
                aiOutput={`${outcome.analysis.resultSummary}\n${outcome.analysis.finalAnalysis}\n${outcome.analysis.opinion}`}
                patientId={outcome.patient?.id}
                consultId={outcome.consultId ?? undefined}
              />
              <p className="text-[11px] text-paper-ink/50">Decision support only. Verify against your own clinical judgement; external modules open separately and their results are not read by the agent.</p>
            </div>
          )}

          {!!appsUsed.length && (
            <div className="space-y-1">
              <p className="label">Applications used</p>
              <div className="flex flex-wrap gap-1.5">
                {appsUsed.map((a) => <span key={a} className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-teal-50 border border-teal-100 text-teal-700">{a}</span>)}
              </div>
            </div>
          )}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`rounded-full shadow-lg px-4 py-3 text-sm font-medium flex items-center gap-2 ${listening ? "bg-terracotta-500 text-white animate-pulse" : "bg-teal-600 text-white hover:bg-teal-700"}`}
      >
        <span aria-hidden="true">🎙</span>
        {open ? "Hide agent" : "Voice agent"}
      </button>
    </div>
  );
}
