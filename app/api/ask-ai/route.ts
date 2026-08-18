import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ASK_AI_MODEL || "claude-sonnet-4-6";

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  if (!question || typeof question !== "string") {
    return NextResponse.json({ answer: "No question received." }, { status: 400 });
  }

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({
      answer:
        "ANTHROPIC_API_KEY is not configured. Add it in Vercel project settings to enable Ask AI.",
    });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system:
          "You are a clinical reference assistant for a resident doctor. Answer concisely, cite guideline-level reasoning where relevant, and flag when something needs senior/consultant review. You do not replace clinical judgement.",
        messages: [{ role: "user", content: question }],
      }),
    });

    const data = await res.json();
    const answer = data?.content?.map((c: any) => c.text).filter(Boolean).join("\n") || "No answer returned.";
    return NextResponse.json({ answer });
  } catch (err) {
    return NextResponse.json({ answer: "AI query failed. Check ANTHROPIC_API_KEY and network access." });
  }
}
