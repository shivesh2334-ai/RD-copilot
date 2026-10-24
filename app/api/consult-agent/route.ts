import { NextRequest, NextResponse } from "next/server";
import { authorizeApi } from "@/lib/apiSecurity";
import { agentInstructions, validateReply, type AgentMessage } from "@/lib/consultAgent";
export async function POST(req: NextRequest) {
  const denied = await authorizeApi(req, 12);
  if (denied) return denied;
  if (Number(req.headers.get("content-length")) > 60000) return NextResponse.json({ error: "Input too large." }, { status: 413 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const { patient, notes, messages } = body ?? {};
  if (!patient || !Number.isFinite(patient.age) || patient.age < 0 || patient.age > 130 || !["male", "female", "other"].includes(patient.sex) || typeof notes !== "string" || notes.length > 12000 || !Array.isArray(messages) || !messages.length || messages.length > 30 || messages.some((m: AgentMessage, i: number) => !m || m.role !== (i % 2 === 0 ? "user" : "assistant") || typeof m.content !== "string" || !m.content.trim() || m.content.length > 12000) || messages.length % 2 !== 1 || JSON.stringify(body).length > 60000) {
    return NextResponse.json({ error: "Invalid consultation input or dialogue too long. Start a fresh agent session." }, { status: 400 });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "Configure ANTHROPIC_API_KEY to enable the consultation agent." }, { status: 503 });
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: AbortSignal.timeout(45000),
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.ASK_AI_MODEL || "claude-sonnet-4-6", max_tokens: 2000, system: agentInstructions,
        messages: messages.map((m: AgentMessage, i: number) => ({ role: m.role, content: i === 0 ? JSON.stringify({ patient: { age: patient.age, sex: patient.sex }, notes, request: m.content }) : m.content })) }),
    });
    if (!response.ok) throw new Error("Provider failed");
    const data = await response.json();
    if (data.stop_reason === "max_tokens") throw new Error("Incomplete output");
    const text = data.content.filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
    return NextResponse.json({ reply: validateReply(JSON.parse(text)) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "The agent could not complete this turn. Please retry; no opinion was saved." }, { status: 502 }); }
}
