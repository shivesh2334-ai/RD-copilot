import { NextRequest, NextResponse } from "next/server";
import { authorizeApi } from "@/lib/apiSecurity";
import { agentModules } from "@/lib/consultAgent";
import {
  analysisInstructions,
  extractJson,
  parseInstructions,
  validateAnalysis,
  validateParsed,
} from "@/lib/voiceAgent";

const MODEL = process.env.ASK_AI_MODEL || "claude-sonnet-4-6";

async function callClaude(system: string, content: string, maxTokens: number) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("NOT_CONFIGURED");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(45000),
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content }] }),
  });
  if (!response.ok) throw new Error("Provider failed");
  const data = await response.json();
  if (data.stop_reason === "max_tokens") throw new Error("Incomplete output");
  return (data.content as { type: string; text?: string }[])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");
}

export async function POST(req: NextRequest) {
  const denied = await authorizeApi(req, 16);
  if (denied) return denied;
  if (Number(req.headers.get("content-length")) > 60000) {
    return NextResponse.json({ error: "Input too large." }, { status: 413 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    if (body?.action === "parse") {
      const transcript = body.transcript;
      if (typeof transcript !== "string" || !transcript.trim() || transcript.length > 12000) {
        return NextResponse.json({ error: "Dictation is empty or too long." }, { status: 400 });
      }
      const text = await callClaude(parseInstructions, JSON.stringify({ transcript }), 1200);
      return NextResponse.json({ parsed: validateParsed(extractJson(text)) }, { headers: { "Cache-Control": "no-store" } });
    }

    if (body?.action === "analyze") {
      const { patient, notes, plan, request } = body;
      const validPatient =
        patient == null ||
        (Number.isFinite(patient.age) && patient.age >= 0 && patient.age <= 130 && ["male", "female", "other"].includes(patient.sex));
      const s = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
      if (!validPatient || !s(notes ?? "", 12000) || !s(request ?? "", 2000) || !plan || !s(plan.treatment ?? "", 6000) || !s(plan.investigation ?? "", 6000) || !s(plan.comments ?? "", 6000)) {
        return NextResponse.json({ error: "Invalid analysis input." }, { status: 400 });
      }
      if (!(notes ?? "").trim() && !(request ?? "").trim()) {
        return NextResponse.json({ error: "Nothing to analyse." }, { status: 400 });
      }
      const catalog = JSON.stringify(agentModules.map((m) => ({ id: m.id, category: m.category })));
      const text = await callClaude(
        analysisInstructions(catalog),
        JSON.stringify({
          patient: patient ? { age: patient.age, sex: patient.sex } : null,
          notes: notes ?? "",
          plan: { treatment: plan.treatment ?? "", investigation: plan.investigation ?? "", comments: plan.comments ?? "" },
          request: request || "Analyse the recorded information and suggest next steps.",
        }),
        2200
      );
      return NextResponse.json({ analysis: validateAnalysis(extractJson(text)) }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_CONFIGURED") {
      return NextResponse.json({ error: "Configure ANTHROPIC_API_KEY to enable the voice agent." }, { status: 503 });
    }
    return NextResponse.json({ error: "The voice agent could not complete this step. Nothing was changed by this step; please retry." }, { status: 502 });
  }
}
