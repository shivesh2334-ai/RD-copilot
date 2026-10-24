"use client";
import { useState } from "react";
import { ensureStorageSession } from "@/lib/supabase";
import { agentModules, type AgentMessage, type AgentReply } from "@/lib/consultAgent";
import MicButton from "./MicButton";

type Props = { age: number; sex: string; notes: string; onAccept: (text: string) => void };
export default function ConsultAgent({ age, sex, notes, onAccept }: Props) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [reply, setReply] = useState<AgentReply | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [context, setContext] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const stale = context !== null && context !== notes;
  async function send() {
    if (busy || !consent || stale) return;
    const content = input.trim() || (!messages.length && notes.trim() ? "Assess these consultation notes and ask the next relevant questions." : "");
    if (!content) return;
    setBusy(true); setError("");
    try {
      const db = await ensureStorageSession();
      const { data } = await db.auth.getSession();
      if (!data.session) throw new Error("Please sign in again.");
      const next: AgentMessage[] = [...messages, { role: "user", content }];
      const response = await fetch("/api/consult-agent", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ patient: { age, sex }, notes, messages: next }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Agent unavailable.");
      setMessages([...next, { role: "assistant", content: JSON.stringify(result.reply) }]);
      setReply(result.reply); setContext(notes); setInput(""); setAccepted(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Agent unavailable."); }
    finally { setBusy(false); }
  }
  const draft = reply ? `Consultation agent — ${reply.stage === "urgent" ? "URGENT clinical assessment required" : "provisional, clinician review required"}\n${reply.summary}\n${reply.opinion}\nMissing inputs: ${reply.missingInputs.join("; ") || "None identified by agent"}\nRecommended tools: ${reply.moduleIds.join("; ")}` : "";
  return <section className="card p-4 space-y-4">
    <div className="flex justify-between gap-3"><h2 className="font-serif text-lg">Consultation agent</h2><button type="button" className="btn-secondary text-sm" disabled={busy} onClick={() => { setMessages([]); setReply(null); setContext(null); setError(""); setAccepted(false); }}>Reset dialogue</button></div>
    <p className="text-sm text-paper-ink/60">Enter or dictate the patient’s concerns. The agent asks follow-up questions and recommends Mediround tools. External tools open separately; enter their inputs and paste results here.</p>
    <label className="flex gap-2 text-xs"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} />I am authorized to send these clinical notes and dialogue to the configured AI service. Remove identifying details from free text.</label>
    {messages.filter(m => m.role === "user").map((m, i) => <p key={i} className="text-sm border-l-2 border-teal-200 pl-3"><strong>Doctor/patient input:</strong> {m.content}</p>)}
    {reply && <div aria-live="polite" className={`rounded-md border p-3 space-y-3 ${reply.stage === "urgent" ? "bg-red-50 border-red-300" : "bg-teal-50 border-teal-100"}`}>
      <p className="font-semibold">{reply.stage === "urgent" ? "Urgent — assess and escalate now" : reply.stage === "review" ? "Draft opinion for clinician review" : "Further inputs needed"}</p>
      <p className="text-sm whitespace-pre-wrap">{reply.summary}</p>
      {!!reply.questions.length && <ol className="list-decimal pl-5 text-sm">{reply.questions.map((q, i) => <li key={i}>{q}</li>)}</ol>}
      <p className="text-sm whitespace-pre-wrap">{reply.opinion}</p>
      {!!reply.missingInputs.length && <p className="text-xs">Still needed: {reply.missingInputs.join("; ")}</p>}
      <div className="flex flex-wrap gap-2">{agentModules.filter(m => reply.moduleIds.includes(m.id)).map(m => <a key={m.id} className="btn-secondary text-sm" href={m.href} target="_blank" rel="noopener noreferrer">Open {m.label} ↗</a>)}</div>
      <button type="button" className="btn-secondary text-sm" disabled={stale || accepted || busy} onClick={() => { onAccept(draft); setAccepted(true); }}>{accepted ? "Added to notes — save consultation to persist" : "Add reviewed draft to notes"}</button>
    </div>}
    {stale && <p role="alert" className="text-sm text-terracotta-600">Consultation notes changed. Reset dialogue before requesting another assessment.</p>}
    <label className="label" htmlFor="agent-input">Patient concerns, answers or module results</label>
    <MicButton onText={t => setInput(v => v ? `${v} ${t}` : t)} label="Dictate agent input" />
    <textarea id="agent-input" className="input min-h-[90px]" value={input} maxLength={12000} disabled={busy} onChange={e => setInput(e.target.value)} placeholder="Example: Rajesh, 56-year-old man, no known comorbidity, requesting a complete health check-up." />
    <button type="button" className="btn-primary text-sm" onClick={send} disabled={busy || !consent || stale || (!input.trim() && (messages.length > 0 || !notes.trim()))}>{busy ? "Assessing…" : messages.length ? "Submit answers" : "Start consultation agent"}</button>
    {error && <p role="alert" className="text-sm text-terracotta-600">{error}</p>}
    <p className="text-xs text-paper-ink/50">Dialogue is temporary and resets on leaving this page. Only a reviewed draft added to notes is included when you save the consultation. Verify recommendations, scores and medicines before use.</p>
  </section>;
}
