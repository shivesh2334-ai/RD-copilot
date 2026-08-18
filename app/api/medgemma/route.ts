import { NextRequest, NextResponse } from "next/server";

// Points at your existing MedGemma deployment (Hugging Face Space or similar).
// Set MEDGEMMA_ENDPOINT and, if the Space requires it, MEDGEMMA_API_KEY in env.
const MEDGEMMA_ENDPOINT = process.env.MEDGEMMA_ENDPOINT;
const MEDGEMMA_API_KEY = process.env.MEDGEMMA_API_KEY;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { notes, plan, patient } = body;

  if (!MEDGEMMA_ENDPOINT) {
    return NextResponse.json(
      {
        summary:
          "MEDGEMMA_ENDPOINT is not configured. Add it in Vercel project settings once your MedGemma Space URL is available.",
      },
      { status: 200 }
    );
  }

  const prompt = [
    patient ? `Patient: ${patient.age}y ${patient.sex}` : "",
    `Clinical notes: ${notes}`,
    plan?.treatment ? `Planned treatment: ${plan.treatment}` : "",
    plan?.investigation ? `Planned investigation: ${plan.investigation}` : "",
    plan?.comments ? `Comments: ${plan.comments}` : "",
    "",
    "Provide a brief structured second opinion: possible differentials, red flags to check, and anything missing from the plan. This supports but does not replace clinical judgement.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(MEDGEMMA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(MEDGEMMA_API_KEY ? { Authorization: `Bearer ${MEDGEMMA_API_KEY}` } : {}),
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { summary: `MedGemma endpoint returned an error (${res.status}).` },
        { status: 200 }
      );
    }

    const data = await res.json();
    // Adjust this extraction to match your Space's actual response shape.
    const summary =
      typeof data === "string"
        ? data
        : data.summary || data.generated_text || data[0]?.generated_text || JSON.stringify(data);

    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json(
      { summary: "Could not reach the MedGemma endpoint. Check MEDGEMMA_ENDPOINT and network access." },
      { status: 200 }
    );
  }
}
